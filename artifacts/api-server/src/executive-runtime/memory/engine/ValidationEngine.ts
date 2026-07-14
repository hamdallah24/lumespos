import type { MemoryRecord, MemoryTraceEvent } from "../models/MemoryRecord";
import type { ExecutiveScope } from "../models/MemoryRecord";
import type { MemoryCategory } from "../models/MemoryRecord";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class ValidationEngine {
  validate(record: Partial<MemoryRecord> & { content: string }): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    this.validateSchema(record, errors);
    this.validateContent(record, errors, warnings);
    this.validateMetadata(record, warnings);

    const valid = errors.length === 0;

    return { valid, errors, warnings };
  }

  private validateSchema(record: Partial<MemoryRecord> & { content: string }, errors: string[]): void {
    if (!record.content || record.content.trim().length === 0) {
      errors.push("Content is required");
    }

    if (record.confidence !== undefined) {
      if (record.confidence < 0 || record.confidence > 1) {
        errors.push("Confidence must be between 0 and 1");
      }
    }

    if (record.scope && !this.isValidScope(record.scope)) {
      errors.push(`Invalid scope: ${record.scope}`);
    }

    if (record.category && !this.isValidCategory(record.category)) {
      errors.push(`Invalid category: ${record.category}`);
    }
  }

  private validateContent(record: Partial<MemoryRecord> & { content: string }, errors: string[], warnings: string[]): void {
    if (!record.content || record.content.trim().length === 0) {
      errors.push("Memory content cannot be empty");
    }

    if (record.content && record.content.length > 10000) {
      warnings.push("Memory content exceeds 10000 characters, consider summarizing");
    }

    if (record.content && record.content.length < 10) {
      warnings.push("Memory content is very short, may lack sufficient detail");
    }
  }

  private validateMetadata(record: Partial<MemoryRecord>, warnings: string[]): void {
    if (!record.owner) {
      warnings.push("No owner specified, will use default");
    }

    if (!record.category) {
      warnings.push("No category specified, will use 'fact'");
    }

    if (!record.scope) {
      warnings.push("No scope specified, will use 'GLOBAL'");
    }

    if (record.tags && record.tags.length > 20) {
      warnings.push("More than 20 tags may reduce searchability");
    }
  }

  private isValidScope(scope: string): scope is ExecutiveScope {
    return ["GLOBAL", "CEO", "CTO", "COO", "CFO", "CMO", "CAIO", "CKO", "CHRO"].includes(scope);
  }

  private isValidCategory(category: string): category is MemoryCategory {
    return ["decision", "insight", "fact", "preference", "pattern", "relationship", "event", "learning"].includes(category);
  }
}
