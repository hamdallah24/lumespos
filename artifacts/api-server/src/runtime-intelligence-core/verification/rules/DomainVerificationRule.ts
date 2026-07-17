import type { CheckResult, VerificationState, UnderstandingResult, GroundingResult } from '../../types';

export class DomainVerificationRule {
  execute(understanding: UnderstandingResult, grounding: GroundingResult): CheckResult {
    const domain = understanding.domain.primary;
    const noDomainErrors = grounding.errors.every(e => e.provider !== domain);

    let state: VerificationState;
    if (noDomainErrors) {
      state = 'verified';
    } else if (grounding.errors.length === 0) {
      state = 'unverified';
    } else {
      state = 'contradicted';
    }

    return {
      check: 'domain_availability',
      state,
      expected: domain,
      actual: noDomainErrors ? domain : 'unavailable',
      confidence: noDomainErrors ? understanding.confidence : understanding.confidence * 0.5,
    };
  }
}
