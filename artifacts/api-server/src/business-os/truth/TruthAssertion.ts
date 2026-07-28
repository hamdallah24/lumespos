export interface TruthAssertion {
  id: string;
  source: string;
  field: string;
  value: unknown;
  confidence: number;
}

export function makeAssertion(source: string, field: string, value: unknown, confidence = 1.0): TruthAssertion {
  return {
    id: `assert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    source,
    field,
    value,
    confidence,
  };
}

export function extractAssertions(obj: Record<string, unknown>, prefix = ''): TruthAssertion[] {
  const assertions: TruthAssertion[] = [];
  for (const [key, val] of Object.entries(obj)) {
    const fieldPath = prefix ? `${prefix}.${key}` : key;
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      assertions.push(...extractAssertions(val as Record<string, unknown>, fieldPath));
    } else {
      assertions.push(makeAssertion(prefix || 'root', fieldPath, val));
    }
  }
  return assertions;
}
