export interface TruthReference {
  statement: string;
  sourceField: string;
  sourceValue: unknown;
  match: boolean;
  confidence: number;
}

export function makeReference(statement: string, sourceField: string, sourceValue: unknown, match: boolean, confidence = 1.0): TruthReference {
  return { statement, sourceField, sourceValue, match, confidence };
}
