import type { CheckResult, VerificationState, ToolRequest, ToolDescriptor } from '../../types';

export class ToolVerificationRule {
  execute(needs: ToolRequest[], tools: ToolDescriptor[]): CheckResult {
    if (needs.length === 0) {
      return {
        check: 'tool_availability',
        state: 'verified',
        expected: '0 capabilities needed',
        actual: '0 capabilities needed',
        confidence: 1.0,
      };
    }

    const availableCapabilities = new Set(tools.filter(t => t.enabled).flatMap(t => t.capabilities));
    const missing = needs.filter(n => !availableCapabilities.has(n.capability));
    const hasAll = missing.length === 0;

    let state: VerificationState;
    if (hasAll) state = 'verified';
    else if (missing.length < needs.length) state = 'partially_verified';
    else state = 'contradicted';

    return {
      check: 'tool_availability',
      state,
      expected: `${needs.length} capabilities needed`,
      actual: hasAll ? 'all available' : `${missing.length} unavailable: ${missing.map(m => m.capability).join(', ')}`,
      confidence: hasAll ? 1.0 : (needs.length - missing.length) / needs.length,
    };
  }
}
