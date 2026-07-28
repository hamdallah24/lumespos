import { BusinessTimeContext } from './BusinessTimeContext';
import { parseTimeOrThrow } from './TimeParser';
import { computeComparisonPeriod } from './TimeComparison';
import { validateTimeContext } from './TimeValidator';
import { formatTimeContext } from './TimeFormatter';

export class TimeContextBuilder {
  build(text: string): BusinessTimeContext {
    const ctx = parseTimeOrThrow(text);
    const validation = validateTimeContext(ctx);
    if (!validation.valid) {
      console.warn(`[TimeContextBuilder] Invalid time context: ${validation.errors.join(', ')}`);
    }
    return ctx;
  }

  buildWithComparison(text: string): { current: BusinessTimeContext; previous: BusinessTimeContext | null } {
    const current = this.build(text);
    const previous = computeComparisonPeriod(current);
    return { current, previous };
  }

  describe(ctx: BusinessTimeContext): string {
    return formatTimeContext(ctx);
  }

  getPeriod(ctx: BusinessTimeContext): { from: Date; to: Date } {
    return { from: ctx.from, to: ctx.to };
  }
}
