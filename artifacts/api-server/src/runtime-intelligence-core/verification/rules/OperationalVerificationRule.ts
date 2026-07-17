import type { CheckResult, VerificationState, OperationalRequest, OperationalData } from '../../types';

export class OperationalVerificationRule {
  execute(needs: OperationalRequest[], retrieved: OperationalData[]): CheckResult {
    if (needs.length === 0) {
      return {
        check: 'operational_data',
        state: 'verified',
        expected: '0 data requests',
        actual: '0 data received',
        confidence: 1.0,
      };
    }

    const ratio = retrieved.length / needs.length;
    let state: VerificationState;
    if (ratio >= 0.9) state = 'verified';
    else if (ratio >= 0.5) state = 'partially_verified';
    else if (ratio === 0) state = 'contradicted';
    else state = 'unverified';

    return {
      check: 'operational_data',
      state,
      expected: `${needs.length} data requests`,
      actual: `${retrieved.length} data received`,
      confidence: Math.min(ratio, 1.0),
    };
  }
}
