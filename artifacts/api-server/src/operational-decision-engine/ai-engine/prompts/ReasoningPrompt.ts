export function buildReasoningPrompt(situation: {
  title: string;
  description: string;
  domain: string;
  severity: string;
}): string {
  return `Jelaskan reasoning untuk situasi bisnis berikut:

SITUASI: ${situation.title}
DESKRIPSI: ${situation.description}
DOMAIN: ${situation.domain}
SEVERITY: ${situation.severity}

Berikan analisis:
1. Penyebab akar (root cause) dari situasi ini
2. Faktor-faktor yang berkontribusi
3. Risiko jika tidak ditangani
4. Rekomendasi prioritas tindakan

RESPONSE FORMAT (JSON):
{
  "rootCause": "string",
  "contributingFactors": ["string"],
  "risks": ["string"],
  "recommendedActions": ["string"],
  "priority": number
}`;
}
