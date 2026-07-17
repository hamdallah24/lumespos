import type { RuntimeContext } from '../types';

export function freezeContract(contract: RuntimeContext): RuntimeContext {
  return deepFreeze(structuredClone(contract));
}

export function deriveContract(
  source: RuntimeContext,
  mutations: Partial<RuntimeContext>,
  _reason: string,
): RuntimeContext {
  const newVersion = bumpMinor(source.metadata.version);

  const derived: RuntimeContext = {
    ...source,
    ...mutations,
    metadata: {
      ...source.metadata,
      ...(mutations.metadata || {}),
      version: newVersion,
      contractId: crypto.randomUUID(),
      createdAt: Date.now(),
    },
    runtime: {
      ...source.runtime,
      ...(mutations.runtime || {}),
      trace: {
        ...source.runtime.trace,
        ...((mutations.runtime && 'trace' in mutations.runtime)
          ? (mutations.runtime as { trace?: RuntimeContext['runtime']['trace'] }).trace
          : source.runtime.trace),
      },
    },
  };

  return derived;
}

export function isCompatible(
  executiveVersion: string,
  contractVersion: string,
): boolean {
  const execMajor = parseMajor(executiveVersion);
  const contractMajor = parseMajor(contractVersion);
  return execMajor === contractMajor;
}

export function parseMajor(version: string): number {
  const parts = version.split('.');
  return parseInt(parts[0], 10) || 0;
}

export function parseMinor(version: string): number {
  const parts = version.split('.');
  return parseInt(parts[1], 10) || 0;
}

function bumpMinor(version: string): string {
  const major = parseMajor(version);
  const minor = parseMinor(version);
  return `${major}.${minor + 1}`;
}

function deepFreeze<T extends object>(obj: T): T {
  const propNames = Object.getOwnPropertyNames(obj);
  for (const name of propNames) {
    const value = (obj as Record<string, unknown>)[name];
    if (value && typeof value === 'object') {
      deepFreeze(value as Record<string, unknown>);
    }
  }
  return Object.freeze(obj);
}
