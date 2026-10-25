// The live data: SDOT's drawbridge log and TomTom traffic. Both allow
// browser requests, so the site needs no server or build-time data step.
import type { Bridge } from "./bridges";
import type { Traffic } from "./guess";
import { seasonDays, toOpenings, type LogRow, type Opening } from "./season";
import { addDays } from "./time";

// SDOT Drawbridge Status on data.seattle.gov. Published about daily, so it
// gives typical odds and the last logged opening, not live status.
const LOG = "https://data.seattle.gov/resource/gm8h-9449.json";

// A year of history, in whole weeks so every weekday appears the same number of times.
const WEEKS = 52;
// Sensor glitches occasionally log a bridge "open" for hours.
const MAX_MINUTES = 30;

export interface History {
  /** shares[dow][hour]: share of minutes the bridge was up. dow 0 = Sunday. */
  shares: number[][];
  /** Today's weekday over recent weeks and around this date last year; see season.ts. */
  seasonDays: { recent: string[]; lastYear: string[] };
  seasonOpenings: Opening[];
  lastOpening?: { at: string; minutes: number }; // floating Seattle time
}

async function soql<T>(params: Record<string, string>): Promise<T[]> {
  const res = await fetch(`${LOG}?${new URLSearchParams(params)}`);
  if (!res.ok) throw new Error(`SDOT log: HTTP ${res.status}`);
  return res.json();
}

// SDOT's grouped query takes a few seconds and the log changes about daily,
// so each browser keeps one copy per bridge per day.
const cacheKey = (b: Bridge) => `bridge-history-v3-${b.id}`;

export async function fetchHistory(bridge: Bridge, today: string): Promise<History> {
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey(bridge)) ?? "null");
    if (cached?.day === today) return cached.history;
  } catch {
    // Storage blocked or corrupt; just fetch.
  }
  const history = await queryHistory(bridge, today);
  try {
    localStorage.setItem(cacheKey(bridge), JSON.stringify({ day: today, history }));
  } catch {
    // Not worth failing over.
  }
  return history;
}

async function queryHistory(bridge: Bridge, today: string): Promise<History> {
  const since = addDays(today, -WEEKS * 7);
  const days = seasonDays(today);
  const dayList = [...days.recent, ...days.lastYear].map((d) => `'${d}T00:00:00'`).join(", ");
  const inYear = `entityname = '${bridge.logName}' AND opendatetime >= '${since}T00:00:00' AND opendatetime < '${today}T00:00:00'`;
  const [byHour, logged, [last], seasonRows] = await Promise.all([
    soql<{ dow: string; hh: string; mins: string }>({
      $select: "date_extract_dow(opendatetime) as dow, date_extract_hh(opendatetime) as hh, sum(minutesopen) as mins",
      $where: `${inYear} AND minutesopen <= ${MAX_MINUTES}`,
      $group: "dow, hh",
      $limit: "500",
    }),
    // Which days SDOT logged at all. A sensor outage can blank weeks or months,
    // and those days shouldn't count as days the bridge never opened.
    soql<{ day: string }>({
      $select: "date_trunc_ymd(opendatetime) as day",
      $where: inYear,
      $group: "day",
      $limit: "1000",
    }),
    soql<{ opendatetime: string; minutesopen: string }>({
      $where: `entityname = '${bridge.logName}'`,
      $order: "opendatetime DESC",
      $limit: "1",
    }),
    soql<LogRow>({
      $select: "opendatetime, closedatetime, minutesopen",
      $where: `entityname = '${bridge.logName}' AND date_trunc_ymd(opendatetime) in (${dayList})`,
      $limit: "5000",
    }),
  ]);

  const loggedDays = new Array<number>(7).fill(0);
  for (const { day } of logged) loggedDays[new Date(`${day.slice(0, 10)}T12:00:00Z`).getUTCDay()]++;
  const shares = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
  for (const r of byHour) {
    const dow = Number(r.dow);
    if (loggedDays[dow]) shares[dow][Number(r.hh)] = Number(r.mins) / (loggedDays[dow] * 60);
  }
  return {
    shares,
    seasonDays: days,
    seasonOpenings: toOpenings(seasonRows),
    lastOpening: last && { at: last.opendatetime, minutes: Number(last.minutesopen) },
  };
}

// In dev, through the Vite proxy (see vite.config.ts), since TomTom rejects localhost.
const TOMTOM = import.meta.env.DEV ? "/tomtom" : "https://api.tomtom.com";

export async function fetchTraffic(bridge: Bridge, key: string): Promise<Traffic> {
  const url =
    `${TOMTOM}/traffic/services/4/flowSegmentData/absolute/18/json` +
    `?point=${bridge.point.lat},${bridge.point.lng}&unit=mph&key=${encodeURIComponent(key)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TomTom: HTTP ${res.status}`);
  const d = (await res.json()).flowSegmentData;
  return {
    currentSpeed: d.currentSpeed,
    freeFlowSpeed: d.freeFlowSpeed,
    closed: Boolean(d.roadClosure),
    confidence: d.confidence,
  };
}
