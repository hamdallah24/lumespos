import type {
  RetrievalTask,
  RetrievalPlan,
  GroundingResult,
  GroundingProviderName,
  CapabilityName,
  OperationalData,
  MemoryEntry,
  KnowledgeBlock,
  MetadataNode,
  FileContent,
  GroundingError,
  Evidence,
  HealthStatus,
} from '../types';
import { OperationalTruthProvider } from './providers/OperationalTruthProvider';
import { MemoryProvider } from './providers/MemoryProvider';
import { KnowledgeProvider } from './providers/KnowledgeProvider';
import { MetadataProvider } from './providers/MetadataProvider';
import { RepositoryProvider } from './providers/RepositoryProvider';
import { resolveProvider, resolveEvidenceType } from './CapabilityRouter';
import { CircuitBreaker } from './CircuitBreaker';

interface CacheEntry {
  data: AccumulatedResult;
  cachedAt: number;
  ttlMs: number;
}

interface ProviderLatency {
  totalCalls: number;
  totalLatency: number;
  lastLatency: number;
}

export class GroundingLayer {
  private providers: Record<GroundingProviderName, { read: (reqs: unknown[]) => Promise<unknown[]>; health: () => Promise<HealthStatus> }>;
  private evidenceLog: Evidence[] = [];
  private healthCache: Map<string, { ok: boolean; checkedAt: number }> = new Map();
  private readonly HEALTH_TTL = 10000;
  private circuitBreaker: CircuitBreaker;
  private resultCache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL = 30000;
  private providerLatency: Map<string, ProviderLatency> = new Map();
  private adaptiveTimeoutMultiplier = 1.0;

  constructor(rootDir: string) {
    this.circuitBreaker = new CircuitBreaker(3, 15000);

    this.providers = {
      operational: new OperationalTruthProvider(),
      memory: new MemoryProvider(),
      knowledge: new KnowledgeProvider(),
      metadata: new MetadataProvider(),
      repository: new RepositoryProvider(rootDir),
    };
  }

  async execute(plan: RetrievalPlan): Promise<GroundingResult> {
    const startTime = Date.now();
    this.evidenceLog = [];
    const result = await this.executeTasks(plan.tasks);
    this.evidenceLog = result.evidence;

    return {
      operationalData: result.operationalData,
      memoryEntries: result.memoryEntries,
      knowledgeBlocks: result.knowledgeBlocks,
      metadataNodes: result.metadataNodes,
      fileContents: result.fileContents,
      errors: result.errors,
      executionTimeMs: Date.now() - startTime,
    };
  }

  getEvidence(): Evidence[] {
    return [...this.evidenceLog];
  }

  private async executeTasks(tasks: RetrievalTask[]): Promise<AccumulatedResult> {
    if (tasks.length === 0) return emptyResult();
    const levels = this.resolveDependencyLevels(tasks);
    const aggregated = emptyResult();

    for (const level of levels) {
      const levelResults = await Promise.allSettled(
        level.map(task => this.executeSingleTask(task)),
      );
      for (const r of levelResults) {
        if (r.status === 'fulfilled') {
          this.mergeResult(aggregated, r.value);
        }
      }
    }
    return aggregated;
  }

  private async executeSingleTask(task: RetrievalTask): Promise<AccumulatedResult> {
    const effectiveTimeout = task.capabilityConstraint?.maxLatency
      ? Math.min(task.timeout, task.capabilityConstraint.maxLatency)
      : task.timeout;

    const preferredProvider = task.capabilityConstraint?.preferredProvider;
    const providersToTry: GroundingProviderName[] = [];

    if (preferredProvider) {
      providersToTry.push(preferredProvider as GroundingProviderName);
    }

    const capabilitiesToTry: CapabilityName[] = [task.requiredCapability, ...(task.fallbackCapabilities ?? [])];
    for (const cap of capabilitiesToTry) {
      const pn = resolveProvider(cap);
      if (pn && !providersToTry.includes(pn as GroundingProviderName)) {
        providersToTry.push(pn as GroundingProviderName);
      }
    }

    for (const providerName of providersToTry) {
      const provider = this.providers[providerName];
      if (!provider) continue;

      if (!this.circuitBreaker.canExecute(providerName)) {
        this.evidenceLog.push({
          id: `ev-${task.id}-circuit-${providerName}`,
          type: resolveEvidenceType(task.requiredCapability),
          source: providerName,
          query: task.id,
          result: { error: 'circuit_open' },
          timestamp: Date.now(),
          durationMs: 0,
          confidence: 0,
          error: `Circuit open: ${providerName}`,
        });
        continue;
      }

      const healthy = await this.isProviderHealthy(providerName, provider);
      if (!healthy) {
        this.evidenceLog.push({
          id: `ev-${task.id}-health-${providerName}`,
          type: resolveEvidenceType(task.requiredCapability),
          source: providerName,
          query: task.id,
          result: { error: 'unhealthy' },
          timestamp: Date.now(),
          durationMs: 0,
          confidence: 0,
          error: `Skipped: ${providerName} unhealthy`,
        });
        continue;
      }

      const cacheKey = `${providerName}:${task.requiredCapability}:${this.hashRequest(task.request)}`;
      const cached = this.resultCache.get(cacheKey);
      if (cached && Date.now() - cached.cachedAt < cached.ttlMs) {
        this.evidenceLog.push({
          id: `ev-${task.id}-cache-${providerName}`,
          type: resolveEvidenceType(task.requiredCapability),
          source: providerName,
          query: task.id,
          result: { cached: true, capability: task.requiredCapability },
          timestamp: Date.now(),
          durationMs: 0,
          confidence: 0.9,
        });
        return cached.data;
      }

      const startTime = Date.now();
      const errors: GroundingError[] = [];
      let attempts = 0;
      const maxRetries = task.limits?.retries ?? 0;

      while (attempts <= maxRetries) {
        attempts++;
        try {
          if (attempts > 1) await this.backoff(attempts - 1);

          const data = await this.executeWithTimeout(
            () => provider.read([task.request]),
            effectiveTimeout * this.adaptiveTimeoutMultiplier,
          );

          this.circuitBreaker.recordSuccess(providerName);

          const cap = this.resolveCapabilityForProvider(providerName, task);
          const result = this.mapCapabilityResult(cap, data, task);

          const durationMs = Date.now() - startTime;
          this.recordProviderLatency(providerName, durationMs);
          this.resultCache.set(cacheKey, { data: result, cachedAt: Date.now(), ttlMs: this.CACHE_TTL });

          this.evidenceLog.push({
            id: `ev-${task.id}-${startTime}`,
            type: resolveEvidenceType(cap),
            source: providerName,
            query: typeof task.request === 'object' && task.request !== null
              ? (task.request as Record<string, unknown>).description as string || task.id
              : task.id,
            result: { count: data.length, capability: cap },
            rowCount: data.length,
            timestamp: Date.now(),
            durationMs: Date.now() - startTime,
            confidence: data.length > 0 ? 0.9 : 0,
          });

          return result;
        } catch (err) {
          this.circuitBreaker.recordFailure(providerName);

          const errorMessage = err instanceof Error ? err.message : String(err);
          const wasTimeout = errorMessage.includes('timed out');
          errors.push({
            provider: providerName,
            message: wasTimeout ? `Timeout (${effectiveTimeout}ms): ${task.id}` : errorMessage,
            timestamp: Date.now(),
          });

          if (wasTimeout) {
            this.evidenceLog.push({
              id: `ev-${task.id}-${startTime}`,
              type: resolveEvidenceType(task.requiredCapability),
              source: providerName,
              query: task.id,
              result: { error: 'timeout' },
              timestamp: Date.now(),
              durationMs: Date.now() - startTime,
              confidence: 0,
              error: `Timeout after ${effectiveTimeout}ms`,
            });
          }

          if (attempts > maxRetries) {
            if (providersToTry.indexOf(providerName) < providersToTry.length - 1) break;
            return this.handleFailure(task, errors, errorMessage, startTime, providerName);
          }
        }
      }
    }

    return this.taskError(task, `All providers failed for ${task.requiredCapability}`, 'ignore');
  }

  private resolveCapabilityForProvider(providerName: GroundingProviderName, task: RetrievalTask): CapabilityName {
    if (task.capabilityConstraint?.preferredProvider && resolveProvider(task.requiredCapability) === providerName) {
      return task.requiredCapability;
    }
    const allCaps: CapabilityName[] = [task.requiredCapability, ...(task.fallbackCapabilities ?? [])];
    for (const cap of allCaps) {
      if (resolveProvider(cap) === providerName) return cap;
    }
    return task.requiredCapability;
  }

  private async isProviderHealthy(
    name: string,
    provider: { health: () => Promise<HealthStatus> },
  ): Promise<boolean> {
    const cached = this.healthCache.get(name);
    if (cached && Date.now() - cached.checkedAt < this.HEALTH_TTL) return cached.ok;

    try {
      const status = await provider.health();
      this.healthCache.set(name, { ok: status.ok, checkedAt: Date.now() });
      return status.ok;
    } catch {
      this.healthCache.set(name, { ok: false, checkedAt: Date.now() });
      return false;
    }
  }

  private async backoff(attempt: number): Promise<void> {
    const delay = Math.min(100 * Math.pow(2, attempt - 1), 2000);
    await new Promise(r => setTimeout(r, delay));
  }

  private async executeWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try { return await fn(); } finally { clearTimeout(timer); }
  }

  getCircuitStatuses(): Record<string, import('./CircuitBreaker').CircuitStatus> {
    return this.circuitBreaker.getAllStatuses();
  }

  setAdaptiveTimeout(systemHealth?: string): void {
    if (systemHealth === 'critical') this.adaptiveTimeoutMultiplier = 0.5;
    else if (systemHealth === 'degraded') this.adaptiveTimeoutMultiplier = 0.75;
    else this.adaptiveTimeoutMultiplier = 1.0;
  }

  getProviderLatency(): Record<string, { avg: number; last: number }> {
    const result: Record<string, { avg: number; last: number }> = {};
    for (const [name, lat] of this.providerLatency) {
      result[name] = {
        avg: lat.totalCalls > 0 ? lat.totalLatency / lat.totalCalls : 0,
        last: lat.lastLatency,
      };
    }
    return result;
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.resultCache.size,
      keys: [...this.resultCache.keys()],
    };
  }

  clearCache(): void {
    this.resultCache.clear();
  }

  private hashRequest(request: unknown): string {
    const str = typeof request === 'object' && request !== null
      ? JSON.stringify(request)
      : String(request);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }

  private recordProviderLatency(name: string, durationMs: number): void {
    const existing = this.providerLatency.get(name) ?? { totalCalls: 0, totalLatency: 0, lastLatency: 0 };
    existing.totalCalls++;
    existing.totalLatency += durationMs;
    existing.lastLatency = durationMs;
    this.providerLatency.set(name, existing);
  }

  private handleFailure(
    task: RetrievalTask,
    errors: GroundingError[],
    _lastError: string,
    startTime: number,
    providerName: string,
  ): AccumulatedResult {
    const result = emptyResult();
    result.errors.push(...errors);
    if (task.failurePolicy === 'abort' || task.failurePolicy === 'degrade') return result;

    this.evidenceLog.push({
      id: `ev-${task.id}-${startTime}-failed`,
      type: resolveEvidenceType(task.requiredCapability),
      source: providerName,
      query: task.id,
      result: { error: 'failed after retries' },
      timestamp: Date.now(),
      durationMs: Date.now() - startTime,
      confidence: 0,
      error: errors.map(e => e.message).join('; '),
    });
    return result;
  }

  private mapCapabilityResult(
    capability: CapabilityName,
    data: unknown[],
    _task: RetrievalTask,
  ): AccumulatedResult {
    const result = emptyResult();
    const provider = resolveProvider(capability);

    switch (provider) {
      case 'operational':
        result.operationalData.push(...(data as OperationalData[]));
        break;
      case 'memory':
        result.memoryEntries.push(...(data as MemoryEntry[]));
        break;
      case 'knowledge':
        result.knowledgeBlocks.push(...(data as KnowledgeBlock[]));
        break;
      case 'metadata':
        result.metadataNodes.push(...(data as MetadataNode[]));
        break;
      case 'repository':
        result.fileContents.push(...(data as FileContent[]));
        break;
    }
    return result;
  }

  private mergeResult(target: AccumulatedResult, source: AccumulatedResult): void {
    target.operationalData.push(...source.operationalData);
    target.memoryEntries.push(...source.memoryEntries);
    target.knowledgeBlocks.push(...source.knowledgeBlocks);
    target.metadataNodes.push(...source.metadataNodes);
    target.fileContents.push(...source.fileContents);
    target.errors.push(...source.errors);
  }

  private resolveDependencyLevels(tasks: RetrievalTask[]): RetrievalTask[][] {
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const levels: RetrievalTask[][] = [];
    const executed = new Set<string>();
    let remaining = [...tasks];

    while (remaining.length > 0) {
      const level: RetrievalTask[] = [];
      for (const task of remaining) {
        const deps = task.dependency || [];
        if (deps.every(d => executed.has(d))) {
          level.push(task);
        }
      }
      if (level.length === 0) level.push(remaining[0]);
      levels.push(level);
      for (const task of level) executed.add(task.id);
      remaining = remaining.filter(t => !executed.has(t.id));
    }
    return levels;
  }

  private taskError(task: RetrievalTask, message: string, _policy: string): AccumulatedResult {
    const result = emptyResult();
    result.errors.push({ provider: task.requiredCapability, message, timestamp: Date.now() });
    return result;
  }
}

function emptyResult(): AccumulatedResult {
  return {
    operationalData: [], memoryEntries: [], knowledgeBlocks: [],
    metadataNodes: [], fileContents: [], errors: [], evidence: [],
  };
}

interface AccumulatedResult {
  operationalData: OperationalData[];
  memoryEntries: MemoryEntry[];
  knowledgeBlocks: KnowledgeBlock[];
  metadataNodes: MetadataNode[];
  fileContents: FileContent[];
  errors: GroundingError[];
  evidence: Evidence[];
}
