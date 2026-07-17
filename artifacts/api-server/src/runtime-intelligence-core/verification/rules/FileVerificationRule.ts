import type { CheckResult, VerificationState, RepositoryRequest, FileContent } from '../../types';

export class FileVerificationRule {
  execute(needs: RepositoryRequest[], retrieved: FileContent[]): CheckResult {
    if (needs.length === 0) {
      return {
        check: 'file_availability',
        state: 'verified',
        expected: '0 files requested',
        actual: '0 files requested',
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
      check: 'file_availability',
      state,
      expected: `${needs.length} files requested`,
      actual: `${retrieved.length} files retrieved`,
      confidence: Math.min(ratio, 1.0),
    };
  }
}
