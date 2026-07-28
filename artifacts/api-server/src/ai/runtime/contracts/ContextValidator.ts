import type { RuntimeContext, ModuleStatusValue } from '../../../runtime-intelligence-core/types';
import { getContract } from './ContextContracts';

export interface ValidationError {
  field: string;
  module: string;
  status: ModuleStatusValue;
}

export interface ValidationResult {
  valid: boolean;
  executive: string;
  missing: string[];
  degraded: string[];
  errors: ValidationError[];
  message: string;
}

export function validateContext(executive: string, rc: RuntimeContext | null | undefined): ValidationResult {
  const errors: ValidationError[] = [];
  const missing: string[] = [];
  const degraded: string[] = [];

  if (!rc) {
    return {
      valid: false,
      executive,
      missing: ["runtimeContext"],
      degraded: [],
      errors: [{ field: "runtimeContext", module: "assembly", status: "failed" }],
      message: `${executive}: RuntimeContext is null or undefined — pipeline assembly did not produce a context`,
    };
  }

  const contract = getContract(executive);
  if (!contract) {
    return {
      valid: true,
      executive,
      missing: [],
      degraded: [],
      errors: [],
      message: `${executive}: No formal contract defined — validation skipped`,
    };
  }

  const moduleStatus = rc.metadata?.moduleStatus ?? {};
  const degradedModules = rc.metadata?.degradedModules ?? [];

  for (const field of contract.fields) {
    const status: ModuleStatusValue = moduleStatus[field.module] ?? "skipped";

    if (status === "ready" || status === "degraded") {
      if (status === "degraded") {
        degraded.push(field.name);
      }
      continue;
    }

    errors.push({ field: field.name, module: field.module, status });

    if (field.required) {
      missing.push(`${field.name} (required, module: ${field.module} = ${status})`);
    } else {
      degraded.push(`${field.name} (optional, module: ${field.module} = ${status})`);
    }
  }

  const valid = missing.length === 0;
  const parts: string[] = [];

  if (missing.length > 0) {
    parts.push(`Missing required fields: ${missing.join(", ")}`);
  }

  if (degradedModules.length > 0) {
    parts.push(`Degraded modules: ${degradedModules.join(", ")}`);
  }

  if (rc.metadata?.degradedReasons && Object.keys(rc.metadata.degradedReasons).length > 0) {
    for (const [mod, reason] of Object.entries(rc.metadata.degradedReasons)) {
      const short = reason.split('\n')[0];
      parts.push(`  ${mod}: ${short}`);
    }
  }

  return {
    valid,
    executive,
    missing: missing.map(m => m.split(" ")[0]),
    degraded,
    errors,
    message: `${executive}Context validation ${valid ? "passed" : "failed"}` + (parts.length > 0 ? `\n${parts.join("\n")}` : ""),
  };
}
