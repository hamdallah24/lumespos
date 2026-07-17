import type { CheckResult, VerificationState, MemoryRequest } from '../../types';

export class MemoryVerificationRule {
  private isStoreAvailable: (type: string) => boolean;

  constructor(isStoreAvailable: (type: string) => boolean) {
    this.isStoreAvailable = isStoreAvailable;
  }

  execute(needs: MemoryRequest[]): CheckResult {
    if (needs.length === 0) {
      return {
        check: 'memory_availability',
        state: 'verified',
        expected: '0 memory types requested',
        actual: '0 memory types requested',
        confidence: 1.0,
      };
    }

    const unavailable = needs.filter(n => !this.isStoreAvailable(n.type));
    const hasAll = unavailable.length === 0;

    let state: VerificationState;
    if (hasAll) state = 'verified';
    else if (unavailable.length < needs.length) state = 'partially_verified';
    else state = 'contradicted';

    return {
      check: 'memory_availability',
      state,
      expected: `${needs.length} memory types requested`,
      actual: hasAll ? 'all available' : `unavailable: ${unavailable.map(u => u.type).join(', ')}`,
      confidence: hasAll ? 1.0 : (needs.length - unavailable.length) / needs.length,
    };
  }
}
