export function buildSituationPrompt(context: {
  domain: string;
  facts: Array<{ name: string; value: number; description: string; severity: string }>;
  contextSummary: string;
}): string {
  return `Anda adalah analis situasi bisnis untuk Lume's Everywhere. Analisis situasi berikut dan berikan rekomendasi.

DOMAIN: ${context.domain}

FAKTA BISNIS:
${context.facts.map(f => `- [${f.severity.toUpperCase()}] ${f.name}: ${f.description} (nilai: ${f.value})`).join("\n")}

KONTEKS TAMBAHAN:
${context.contextSummary}

TUGAS:
1. Identifikasi situasi bisnis utama dari fakta-fakta di atas
2. Beri severity level (low/medium/high/critical)
3. Usulkan 1-2 tindakan yang bisa diambil
4. Jelaskan dampak finansial dan operasional

RESPONSE FORMAT (JSON):
{
  "title": "string",
  "description": "string",
  "severity": "low|medium|high|critical",
  "financialImpact": { "estimatedLoss": number, "probability": number, "currency": "IDR" },
  "operationalImpact": { "affectedArea": "string", "severity": "low|medium|high", "description": "string" },
  "candidateDecisions": [
    { "title": "string", "actionType": "string", "confidence": number }
  ]
}`;
}
