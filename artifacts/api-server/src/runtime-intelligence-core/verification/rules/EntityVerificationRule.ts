import type { CheckResult, VerificationState, Entity, GroundingResult } from '../../types';

export class EntityVerificationRule {
  execute(entities: Entity[], grounding: GroundingResult): CheckResult {
    if (entities.length === 0) {
      return {
        check: 'entity_verification',
        state: 'verified',
        expected: '0 entities',
        actual: '0 entities',
        confidence: 1.0,
      };
    }

    const allGroundingText = [
      ...grounding.operationalData.map(d => JSON.stringify(d.data)),
      ...grounding.fileContents.map(f => f.content),
      ...grounding.knowledgeBlocks.map(k => k.content),
      ...grounding.memoryEntries.map(m => m.content),
    ].join(' ').toLowerCase();

    const foundCount = entities.filter(e =>
      allGroundingText.includes(e.name.toLowerCase()) ||
      (e.value && allGroundingText.includes(e.value.toLowerCase())),
    ).length;

    const ratio = foundCount / entities.length;
    let state: VerificationState;
    if (ratio >= 0.9) state = 'verified';
    else if (ratio >= 0.5) state = 'partially_verified';
    else if (ratio === 0) state = 'contradicted';
    else state = 'unverified';

    return {
      check: 'entity_verification',
      state,
      expected: `${entities.length} entities`,
      actual: `${foundCount} entities found`,
      confidence: ratio,
    };
  }
}
