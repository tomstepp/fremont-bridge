// Federal holidays, which lift the ship canal bridges' weekday closures
// (33 CFR 117.1051). Observed dates: a holiday on Saturday is observed
// Friday, on Sunday the following Monday (5 U.S.C. 6103).

const iso = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10);

/** The nth (1-based) weekday (0 = Sunday) of a month; n = -1 is the last one. */
function nthWeekday(y: number, m: number, weekday: number, n: number): string {
  if (n > 0) {
    const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
    return iso(y, m, 1 + ((weekday - first + 7) % 7) + (n - 1) * 7);
  }
  const lastDay = new Date(Date.UTC(y, m, 0));
  const back = (lastDay.getUTCDay() - weekday + 7) % 7;
  return iso(y, m, lastDay.getUTCDate() - back);
}

function observed(y: number, m: number, d: number): string {
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return iso(y, m, d + (dow === 6 ? -1 : dow === 0 ? 1 : 0));
}

/** Observed federal holidays for a year, by date. */
export function federalHolidays(y: number): Map<string, string> {
  return new Map([
    [observed(y, 1, 1), "New Year's Day"],
    [nthWeekday(y, 1, 1, 3), "Martin Luther King Jr. Day"],
    [nthWeekday(y, 2, 1, 3), "Presidents' Day"],
    [nthWeekday(y, 5, 1, -1), "Memorial Day"],
    [observed(y, 6, 19), "Juneteenth"],
    [observed(y, 7, 4), "Independence Day"],
    [nthWeekday(y, 9, 1, 1), "Labor Day"],
    [nthWeekday(y, 10, 1, 2), "Columbus Day"],
    [observed(y, 11, 11), "Veterans Day"],
    [nthWeekday(y, 11, 4, 4), "Thanksgiving"],
    [observed(y, 12, 25), "Christmas Day"],
  ]);
}

/** The federal holiday observed on a YYYY-MM-DD date, if any. */
export function holidayOn(day: string): string | undefined {
  const y = Number(day.slice(0, 4));
  // New Year's Day on a Saturday is observed on December 31 of the year before.
  return federalHolidays(y).get(day) ?? federalHolidays(y + 1).get(day);
}
