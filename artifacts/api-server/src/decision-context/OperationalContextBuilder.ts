import type { OperationalContext } from "./types";

let overrides: Partial<OperationalContext> = {};

export function setOperationalContext(ctx: Partial<OperationalContext>): void {
  overrides = ctx;
}

export function buildOperationalContext(): OperationalContext {
  const now = new Date();
  const day = now.getDay();

  return {
    weather: overrides.weather ?? "clear",
    holidays: overrides.holidays ?? (day === 0 || day === 6),
    cityEvents: overrides.cityEvents ?? [],
    seasonality: overrides.seasonality ?? getDefaultSeason(now),
  };
}

function getDefaultSeason(date: Date): string {
  const month = date.getMonth();
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "fall";
  return "winter";
}
