import type { ExecutiveDecision } from "../../erp-execution/types";
import type { ValidationResult } from "../../erp-execution/types";
import type { ExecutionContext } from "./ExecutionContext";
import type { ActionRegistry } from "./ActionRegistry";

interface ValidationRule {
  name: string;
  validate: (decision: ExecutiveDecision) => ValidationResult;
}

function requiredFields(fields: string[]): ValidationRule {
  return {
    name: "required_fields",
    validate: (decision) => {
      const missing = fields.filter(f => {
        const val = decision.parameters[f];
        return val === undefined || val === null || val === "";
      });
      if (missing.length > 0) {
        return { valid: false, error: `Missing required fields: ${missing.join(", ")}` };
      }
      return { valid: true };
    },
  };
}

function positiveNumber(field: string): ValidationRule {
  return {
    name: `positive_number:${field}`,
    validate: (decision) => {
      const val = Number(decision.parameters[field]);
      if (isNaN(val) || val <= 0) {
        return { valid: false, error: `Field "${field}" must be a positive number` };
      }
      return { valid: true };
    },
  };
}

function nonEmptyString(field: string): ValidationRule {
  return {
    name: `non_empty_string:${field}`,
    validate: (decision) => {
      const val = decision.parameters[field];
      if (!val || typeof val !== "string" || val.trim().length === 0) {
        return { valid: false, error: `Field "${field}" must be a non-empty string` };
      }
      return { valid: true };
    },
  };
}

function validBranch(): ValidationRule {
  return {
    name: "valid_branch",
    validate: (decision) => {
      if (!decision.branchId || decision.branchId < 1) {
        return { valid: false, error: "Branch ID is required and must be >= 1" };
      }
      return { valid: true };
    },
  };
}

const ACTION_RULES: Record<string, ValidationRule[]> = {
  add_stock: [
    requiredFields(["itemName", "qty", "unit"]),
    positiveNumber("qty"),
    nonEmptyString("itemName"),
    nonEmptyString("unit"),
    validBranch(),
  ],
  reduce_stock: [
    requiredFields(["itemName", "qty", "unit"]),
    positiveNumber("qty"),
    nonEmptyString("itemName"),
    nonEmptyString("unit"),
    validBranch(),
  ],
  correct_stock: [
    requiredFields(["itemName", "qty", "unit"]),
    nonEmptyString("itemName"),
    nonEmptyString("unit"),
    validBranch(),
  ],
  loss_correction: [
    requiredFields(["itemName", "qty", "unit", "reason"]),
    positiveNumber("qty"),
    nonEmptyString("itemName"),
    nonEmptyString("unit"),
    nonEmptyString("reason"),
    validBranch(),
  ],
  add_expense: [
    requiredFields(["description", "amount"]),
    positiveNumber("amount"),
    nonEmptyString("description"),
    validBranch(),
  ],
  update_price: [
    requiredFields(["productId", "price"]),
    positiveNumber("price"),
    validBranch(),
  ],
  add_product: [
    requiredFields(["name", "price"]),
    positiveNumber("price"),
    nonEmptyString("name"),
  ],
  add_recipe: [
    requiredFields(["productId"]),
    validBranch(),
  ],
  produce: [
    requiredFields(["productId", "qty"]),
    positiveNumber("qty"),
    validBranch(),
  ],
  deactivate_product: [
    requiredFields(["productId"]),
    validBranch(),
  ],
  close_shift: [
    validBranch(),
  ],
  create_purchase_order: [
    requiredFields(["supplierId", "items"]),
    validBranch(),
  ],
  transfer_stock: [
    requiredFields(["itemName", "qty", "fromBranchId", "toBranchId"]),
    positiveNumber("qty"),
    nonEmptyString("itemName"),
    validBranch(),
  ],
  change_role: [
    requiredFields(["userId", "newRole"]),
  ],
};

function getRulesForAction(action: string): ValidationRule[] {
  return ACTION_RULES[action] || [validBranch()];
}

export async function validateDecision(
  decision: ExecutiveDecision,
  ctx: ExecutionContext,
  _registry: ActionRegistry,
): Promise<void> {
  const rules = getRulesForAction(decision.action);
  const results: ValidationResult[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const rule of rules) {
    const result = rule.validate(decision);
    results.push(result);
    if (!result.valid) {
      errors.push(result.error || `Validation failed: ${rule.name}`);
    }
    if (result.warnings) {
      warnings.push(...result.warnings);
    }
  }

  ctx.validation = {
    passed: errors.length === 0,
    results,
    errors,
    warnings,
  };
}
