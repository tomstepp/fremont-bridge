// Seasonal odds: boat traffic swings with the season, so the guess leans on
// the same weekday over the last four weeks and around this date last year.
// Nine days is a thin sample per hour (a busy hour sees ~10 openings, a quiet
// one 2 or 3), so it's blended with the year-round average for the weekday.
// Pure, so it can be tested.
import { addDays } from "./time";

/** One opening, merged from SDOT's log. start: minutes after midnight, Seattle time. */
export interface Opening {
  day: string; // YYYY-MM-DD
  start: number;
  minutes: number;
}

export interface LogRow {
  opendatetime: string; // "2026-10-18T14:05:00.000", Seattle time
  closedatetime?: string;
  minutesopen?: string;
}

// One opening is sometimes logged as several open/close pairs while the span
// settles; pairs this close together count as one opening.
const MERGE_MINUTES = 3;
// Sensor glitches occasionally log a bridge "open" for hours.
const MAX_MINUTES = 30;
// How many days' worth of weight the year-round average gets. With all nine
// seasonal days logged, the season counts for 60%.
const PRIOR_DAYS = 6;

/** Same weekday: the last four weeks, and two weeks either side of this date last year. */
export function seasonDays(today: string): { recent: string[]; lastYear: string[] } {
  return {
    recent: [7, 14, 21, 28].map((n) => addDays(today, -n)),
    lastYear: [-14, -7, 0, 7, 14].map((n) => addDays(today, n - 364)),
  };
}

// Floating timestamp -> minutes since epoch; only differences matter here.
const minutes = (t: string) => Date.parse(`${t.slice(0, 16)}Z`) / 60_000;

/** Log rows (any order) -> openings, merging split events. */
export function toOpenings(rows: LogRow[]): Opening[] {
  const sorted = [...rows].sort((a, b) => a.opendatetime.localeCompare(b.opendatetime));
  const out: Opening[] = [];
  let open = -Infinity;
  let close = -Infinity;
  let first = "";
  const flush = () => {
    if (!first) return;
    const start = Number(first.slice(11, 13)) * 60 + Number(first.slice(14, 16));
    out.push({ day: first.slice(0, 10), start, minutes: Math.min(Math.max(close - open, 1), MAX_MINUTES) });
  };
  for (const r of sorted) {
    const o = minutes(r.opendatetime);
    const c = r.closedatetime ? minutes(r.closedatetime) : o + Number(r.minutesopen ?? 1);
    if (o - close <= MERGE_MINUTES) {
      close = Math.max(close, c);
      continue;
    }
    flush();
    [open, close, first] = [o, c, r.opendatetime];
  }
  flush();
  return out;
}

/** Share of each hour's minutes the bridge was up, over `days` logged days. */
export function hourlyShares(openings: Opening[], days: number): number[] {
  const up = new Array<number>(24).fill(0);
  if (!days) return up;
  for (const o of openings)
    for (let m = o.start; m < Math.min(o.start + o.minutes, 1440); m++) up[Math.floor(m / 60)]++;
  return up.map((n) => n / (days * 60));
}

/** Seasonal shares pulled toward the year-round ones, more so when fewer days were logged. */
export function blend(season: number[], year: number[], days: number): number[] {
  const w = days / (days + PRIOR_DAYS);
  return season.map((s, h) => w * s + (1 - w) * year[h]);
}

export interface SeasonStats {
  /** Days in each window that SDOT logged at all; a sensor outage leaves a day blank. */
  recentDays: number;
  lastYearDays: number;
  recentPerDay: number;
  lastYearPerDay: number;
  medianMinutes: number;
}

export interface Season {
  shares: number[]; // blended, per hour
  stats: SeasonStats;
}

/** `year` may be missing while the year-round averages are still loading; the season then stands alone. */
export function season(openings: Opening[], days: { recent: string[]; lastYear: string[] }, year?: number[]): Season {
  const logged = new Set(openings.map((o) => o.day));
  const inWindow = (list: string[]) => openings.filter((o) => list.includes(o.day));
  const recent = inWindow(days.recent);
  const lastYear = inWindow(days.lastYear);
  const recentDays = days.recent.filter((d) => logged.has(d)).length;
  const lastYearDays = days.lastYear.filter((d) => logged.has(d)).length;
  const total = recentDays + lastYearDays;

  const raw = hourlyShares([...recent, ...lastYear], total);
  const durations = [...recent, ...lastYear].map((o) => o.minutes).sort((a, b) => a - b);
  const perDay = (n: number, d: number) => (d ? Math.round((n / d) * 10) / 10 : 0);
  return {
    shares: year ? blend(raw, year, total) : raw,
    stats: {
      recentDays,
      lastYearDays,
      recentPerDay: perDay(recent.length, recentDays),
      lastYearPerDay: perDay(lastYear.length, lastYearDays),
      medianMinutes: durations.length ? durations[durations.length >> 1] : 0,
    },
  };
}
