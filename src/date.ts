// DEVELOPMENT ONLY: 'december' tests doors; 'before-december' tests editing;
// null uses the real date. Production always uses the real date.
export const DEVELOPMENT_MODE: 'december' | 'before-december' | null = 'before-december';
export const DEVELOPMENT_DAY = 10; // December day to simulate (1–31).
export const isSimulated = import.meta.env.DEV && DEVELOPMENT_MODE !== null;

export function getCalendarDate(): Date {
  const now = new Date();
  if (!isSimulated) return now;
  return DEVELOPMENT_MODE === 'before-december'
    ? new Date(now.getFullYear(), 10, 30)
    : new Date(now.getFullYear(), 11, DEVELOPMENT_DAY);
}

export function getAvailableDay(date: Date): number {
  return date.getMonth() === 11 ? Math.min(date.getDate(), 24) : 0;
}

export function daysUntilChristmas(date: Date): number {
  const today = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const christmas = Date.UTC(date.getFullYear(), 11, 25);
  return Math.max(0, Math.round((christmas - today) / 86_400_000));
}
