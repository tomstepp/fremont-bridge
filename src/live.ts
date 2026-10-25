// What the bridge page and the overview share: the per-bridge estimate, so both
// give the same answer, plus refresh timing and the bridge tabs.
import { BRIDGES, OVERVIEW_PATH, scheduleFactor, type Bridge, type When } from "./bridges";
import { guess, type CameraReport, type Guess, type Traffic } from "./guess";
import { holidayOn } from "./holidays";
import { season, type Season } from "./season";
import type { Recent, YearShares } from "./sources";
import { dayName, seattleDate, seattleDow, seattleHour, seattleMinute } from "./time";

export const TOMTOM_KEY = import.meta.env.VITE_TOMTOM_KEY as string | undefined;
export const REFRESH_MS = 60_000;
// TomTom's flow data only changes every few minutes, and the free tier caps
// daily lookups, so traffic refreshes less often than the rest of the page.
export const TRAFFIC_MS = 5 * 60_000;
// Timers drift a little; without slack the fifth minute's tick can land a few
// milliseconds short of five minutes and push traffic to the sixth.
export const SLACK_MS = 5_000;

/** The clock as the rules and history see it, in Seattle. */
export interface Moment {
  now: Date;
  when: When;
  hour: number;
  minute: number;
}

export function moment(now = new Date()): Moment {
  const day = seattleDate(now);
  return { now, when: { day, dow: seattleDow(now), holiday: holidayOn(day) }, hour: seattleHour(now), minute: seattleMinute(now) };
}

/** One bridge's live inputs: SDOT's log arrives in two parts (see sources.ts). */
export interface BridgeData {
  year?: YearShares;
  recent?: Recent;
  traffic?: Traffic;
}

export interface Estimate {
  guess: Guess;
  /** Share of each hour up on this weekday, this time of year (or year-round until that loads). */
  shares: number[];
  season?: Season;
}

/** The guess for a bridge right now, or nothing until any of SDOT's log has arrived. */
export function estimate(b: Bridge, d: BridgeData, m: Moment, camera?: CameraReport): Estimate | undefined {
  const yearDow = d.year?.[m.when.dow];
  // Until today's part arrives, the year-round average stands in for the season.
  const s = d.recent && season(d.recent.seasonOpenings, d.recent.seasonDays, yearDow);
  const shares = s?.shares ?? yearDow;
  if (!shares) return undefined;
  const g = guess({
    baseRate: shares[m.hour],
    yearRate: s && yearDow?.[m.hour],
    seasonal: Boolean(s),
    dayLabel: `${dayName(m.when.dow)}s`,
    schedule: scheduleFactor(b, m.when, m.minute),
    traffic: d.traffic,
    camera,
  });
  return { guess: g, shares, season: s };
}

// Tab icon: who gets across right now, cars or boats. Same markup as the
// starting icon in index.html.
export const iconFor = (up: boolean) =>
  `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.88em' x='50' text-anchor='middle' font-size='100'>${up ? "⛵" : "🚗"}</text></svg>`;

/** The bridge tabs plus the overview, marking the current page. */
export function renderTabs(nav: HTMLElement, currentPath: string) {
  nav.replaceChildren(
    ...[...BRIDGES.map((b) => ({ path: b.path, name: b.name })), { path: OVERVIEW_PATH, name: "All" }].map((t) => {
      const a = document.createElement("a");
      a.href = t.path;
      a.textContent = t.name;
      if (t.path === currentPath) a.setAttribute("aria-current", "page");
      return a;
    }),
  );
}
