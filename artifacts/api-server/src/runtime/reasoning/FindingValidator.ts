// ECP-014R Stage 6: Finding Validator
// Two-phase validation: Structural (evidenceIds, statement, recommendation)
// then Completeness (confidence available). Produces ValidatedFinding.

import type { Finding, ValidatedFinding } from "../EvidenceTypes";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class FindingValidator {

  /** Structural Phase: must have evidence + statement + recommendation */
  validateStructural(finding: Finding): ValidationResult {
    const errors: string[] = [];

    if (!finding.evidenceIds || finding.evidenceIds.length === 0) {
      errors.push("evidenceIds is empty — finding must reference at least one evidence");
    }
    if (!finding.statement || finding.statement.trim().length < 10) {
      errors.push("statement is too short or empty");
    }
    if (!finding.recommendation || finding.recommendation.trim().length < 5) {
      errors.push("recommendation is too short or empty");
    }
    if (!finding.title || finding.title.trim().length < 3) {
      errors.push("title is too short or empty");
    }

    return { valid: errors.length === 0, errors };
  }

  /** Completeness Phase: confidence must be available */
  validateCompleteness(confidence: number): ValidationResult {
    if (confidence <= 0 || confidence > 100) {
      return { valid: false, errors: [`confidence out of range: ${confidence}`] };
    }
    return { valid: true, errors: [] };
  }

  /** Full validation → ValidatedFinding */
  validate(finding: Finding, confidence: number): ValidatedFinding {
    const structural = this.validateStructural(finding);
    const completeness = this.validateCompleteness(confidence);

    const status = (structural.valid && completeness.valid) ? "validated" : "unvalidated";

    return {
      finding,
      confidence: status === "validated" ? confidence : 0,
      status,
      validatedAt: new Date().toISOString(),
    };
  }
}

export const findingValidator = new FindingValidator();
