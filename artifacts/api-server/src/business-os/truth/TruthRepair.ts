import type { RuntimeContext } from '../../runtime-intelligence-core/types';
import type { ValidationResult } from './TruthValidator';
import type { ExecutiveResponse } from '../../runtime-intelligence-core/types';

const MAX_RETRIES = 3;

export interface RepairResult {
  success: boolean;
  text: string;
  retriesUsed: number;
  finalValidation: ValidationResult | null;
}

export function buildRepairPrompt(
  originalQuery: string,
  originalResponse: string,
  validation: ValidationResult,
  context: RuntimeContext,
): string {
  const errors = validation.errors.map(e =>
    `- [${e.severity}] ${e.type}: "${e.statement}" → Expected "${e.expected ?? 'N/A'}", Said "${e.actual}"`,
  ).join('\n');

  const warnings = validation.warnings.map(w =>
    `- [${w.severity}] ${w.type}: "${w.statement}" → ${w.actual}`,
  ).join('\n');

  const periodInfo = `Periode: ${context.time?.label || 'unknown'} (${context.time?.from?.toISOString?.() ?? ''} — ${context.time?.to?.toISOString?.() ?? ''})`;

  return `Anda memberikan respons yang melanggar Truth Policy. Perbaiki respons Anda berdasarkan aturan berikut:

${periodInfo}

## Pelanggaran:
${errors || 'Tidak ada error'}
${warnings ? `\n## Peringatan:\n${warnings}` : ''}

## Aturan:
- RULE 1: Jangan pernah mengarang angka. Setiap angka harus berasal dari RuntimeContext.
- RULE 2: Jangan pernah mengarang tanggal. Setiap tanggal harus sesuai context.time.
- RULE 3: Jangan pernah mengarang cabang. Hanya gunakan cabang dari context.
- RULE 7: Jangan mengubah BusinessTimeContext. Gunakan label periode apa adanya.
- RULE 9: Jika data tidak tersedia, katakan "Data tidak tersedia."
- RULE 10: Setiap pernyataan penting harus dapat ditelusuri ke RuntimeContext.

## Pertanyaan Asli:
${originalQuery}

## Respons Asli (yang melanggar):
${originalResponse}

## Respons yang Diperbaiki:
(Tulis ulang respons Anda dengan jujur berdasarkan data yang tersedia. Jika data tidak ada, akui.)`;
}

export async function repairWithRetry(
  originalQuery: string,
  originalResponse: string,
  context: RuntimeContext,
  executive: string,
  validator: { validate: (text: string, ctx: RuntimeContext, exec: string) => ValidationResult },
  llmReason: (prompt: string) => Promise<{ content: string }>,
): Promise<RepairResult> {
  let currentResponse = originalResponse;
  let retriesUsed = 0;
  let finalValidation: ValidationResult | null = null;

  for (let i = 0; i < MAX_RETRIES; i++) {
    const validation = validator.validate(currentResponse, context, executive);
    finalValidation = validation;

    if (validation.valid) {
      return {
        success: true,
        text: currentResponse,
        retriesUsed,
        finalValidation: validation,
      };
    }

    retriesUsed++;

    const repairPrompt = buildRepairPrompt(originalQuery, currentResponse, validation, context);
    try {
      const result = await llmReason(repairPrompt);
      currentResponse = result.content;
    } catch {
      break;
    }
  }

  const finalCheck = finalValidation ? validator.validate(currentResponse, context, executive) : null;

  return {
    success: finalCheck?.valid ?? false,
    text: currentResponse,
    retriesUsed,
    finalValidation: finalCheck,
  };
}
