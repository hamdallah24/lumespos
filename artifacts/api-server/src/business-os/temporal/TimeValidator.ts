import { BusinessTimeContext } from './BusinessTimeContext';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateTimeContext(ctx: BusinessTimeContext): ValidationResult {
  const errors: string[] = [];

  if (!ctx.mode) {
    errors.push('mode is required');
  }

  if (!ctx.from || isNaN(ctx.from.getTime())) {
    errors.push('from date is invalid');
  }

  if (!ctx.to || isNaN(ctx.to.getTime())) {
    errors.push('to date is invalid');
  }

  if (ctx.from && ctx.to && ctx.from.getTime() > ctx.to.getTime()) {
    errors.push('from date must be before to date');
  }

  if (!ctx.timezone) {
    errors.push('timezone is required');
  }

  if (!ctx.label) {
    errors.push('label is required');
  }

  if (ctx.comparison?.enabled && !ctx.comparison.mode) {
    errors.push('comparison mode is required when enabled');
  }

  return { valid: errors.length === 0, errors };
}
