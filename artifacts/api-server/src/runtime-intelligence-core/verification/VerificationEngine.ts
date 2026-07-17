import type {
  UnderstandingResult,
  RetrievalPlan,
  GroundingResult,
  VerificationResult,
  VerificationState,
  VerificationWarning,
  RecoverySuggestion,
  Contradiction,
  CheckResult,
  ToolDescriptor,
} from '../types';
import { DomainVerificationRule } from './rules/DomainVerificationRule';
import { EntityVerificationRule } from './rules/EntityVerificationRule';
import { FileVerificationRule } from './rules/FileVerificationRule';
import { ToolVerificationRule } from './rules/ToolVerificationRule';
import { MemoryVerificationRule } from './rules/MemoryVerificationRule';
import { OperationalVerificationRule } from './rules/OperationalVerificationRule';
import { MemoryProvider } from '../grounding/providers/MemoryProvider';
import { isRepositoryCapability, isMemoryCapability, isOperationalCapability } from '../grounding/CapabilityRouter';

export class VerificationEngine {
  private domainRule: DomainVerificationRule;
  private entityRule: EntityVerificationRule;
  private fileRule: FileVerificationRule;
  private toolRule: ToolVerificationRule;
  private memoryRule: MemoryVerificationRule;
  private operationalRule: OperationalVerificationRule;

  constructor() {
    this.domainRule = new DomainVerificationRule();
    this.entityRule = new EntityVerificationRule();
    this.fileRule = new FileVerificationRule();
    this.toolRule = new ToolVerificationRule();
    this.memoryRule = new MemoryVerificationRule((type: string) => {
      const provider = new MemoryProvider();
      return provider.isStoreAvailable(type);
    });
    this.operationalRule = new OperationalVerificationRule();
  }

  verify(
    understanding: UnderstandingResult,
    retrievalPlan: RetrievalPlan,
    grounding: GroundingResult,
    tools: ToolDescriptor[],
  ): VerificationResult {
    const repoTasks = retrievalPlan.tasks.filter(t => isRepositoryCapability(t.requiredCapability));
    const memTasks = retrievalPlan.tasks.filter(t => isMemoryCapability(t.requiredCapability));
    const opTasks = retrievalPlan.tasks.filter(t => isOperationalCapability(t.requiredCapability));

    const checks = [
      this.domainRule.execute(understanding, grounding),
      this.entityRule.execute(understanding.entities, grounding),
      this.fileRule.execute(repoTasks.map(t => t.request) as never[], grounding.fileContents),
      this.toolRule.execute(retrievalPlan.toolNeeds, tools),
      this.memoryRule.execute(memTasks.map(t => t.request) as never[]),
      this.operationalRule.execute(opTasks.map(t => t.request) as never[], grounding.operationalData),
    ];

    const contradictions: Contradiction[] = checks
      .filter(c => c.state === 'contradicted')
      .map(c => ({
        reasoningOutput: c.expected,
        evidence: c.actual,
        severity: c.confidence < 0.3 ? 'high' : c.confidence < 0.6 ? 'medium' : 'low',
      }));

    const verifiedCount = checks.filter(c => c.state === 'verified').length;
    const totalChecks = checks.length;
    const verificationConfidence = totalChecks > 0 ? verifiedCount / totalChecks : 0;

    let state: VerificationState;
    if (contradictions.length > 0) {
      state = 'contradicted';
    } else if (verificationConfidence >= 0.9) {
      state = 'verified';
    } else if (verificationConfidence >= 0.5) {
      state = 'partially_verified';
    } else {
      state = 'unverified';
    }

    const confidenceAdjustment = this.calculateAdjustment(state);

    return {
      state,
      checks,
      verificationConfidence,
      contradictions,
      warnings: this.generateWarnings(checks),
      recovery: this.generateRecovery(checks),
      confidenceAdjustment,
    };
  }

  private calculateAdjustment(state: VerificationState): number {
    switch (state) {
      case 'verified': return 1.0;
      case 'partially_verified': return 0.8;
      case 'unverified': return 0.5;
      case 'contradicted': return 0.2;
    }
  }

  private generateWarnings(checks: CheckResult[]): VerificationWarning[] {
    return checks
      .filter(c => c.state === 'partially_verified' || c.state === 'unverified')
      .map(c => ({
        check: c.check,
        message: c.state === 'partially_verified'
          ? `${c.check}: partial match — expected ${c.expected}, got ${c.actual}`
          : `${c.check}: unable to verify — expected ${c.expected}, got ${c.actual}`,
        severity: c.state === 'partially_verified'
          ? (c.confidence < 0.5 ? 'high' : 'medium')
          : 'high',
        confidenceImpact: c.state === 'partially_verified' ? 0.2 : 0.5,
      }));
  }

  private generateRecovery(checks: CheckResult[]): RecoverySuggestion[] {
    const suggestions: RecoverySuggestion[] = [];
    const failed = checks.filter(c => c.state !== 'verified');

    for (const check of failed) {
      const suggestion = this.suggestRecovery(check);
      if (suggestion) suggestions.push(suggestion);
    }

    return suggestions;
  }

  private suggestRecovery(check: CheckResult): RecoverySuggestion | null {
    switch (check.check) {
      case 'domain_availability':
        return {
          check: check.check,
          action: 'Verify domain configuration or expand domain coverage',
          expectedOutcome: 'Domain data becomes available',
          priority: check.state === 'contradicted' ? 'high' : 'medium',
        };
      case 'entity_verification':
        return {
          check: check.check,
          action: 'Refine entity extraction or provide more specific identifiers in the request',
          expectedOutcome: 'Entities can be located in grounded data',
          priority: 'medium',
        };
      case 'file_availability':
        return {
          check: check.check,
          action: 'Verify the requested file paths exist in the repository',
          expectedOutcome: 'Required files are retrieved successfully',
          priority: check.state === 'contradicted' ? 'high' : 'medium',
        };
      case 'tool_availability':
        return {
          check: check.check,
          action: 'Enable the required capabilities in the tool catalog configuration',
          expectedOutcome: 'Required tools become available for execution',
          priority: 'high',
        };
      case 'memory_availability':
        return {
          check: check.check,
          action: 'Configure memory providers or check memory store connectivity',
          expectedOutcome: 'Memory stores become accessible',
          priority: check.state === 'contradicted' ? 'high' : 'low',
        };
      case 'operational_data':
        return {
          check: check.check,
          action: 'Verify data source connectivity or refresh operational data cache',
          expectedOutcome: 'Operational data is retrieved successfully',
          priority: check.state === 'contradicted' ? 'high' : 'medium',
        };
      default:
        return null;
    }
  }
}
