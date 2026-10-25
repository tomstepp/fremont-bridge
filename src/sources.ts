// The live data: SDOT's drawbridge log and TomTom traffic. Both allow
// browser requests, so the site needs no server or build-time data step.
import type { Traffic } from "./guess";
import { seasonDays, toOpenings, type LogRow, type Opening } from "./season";
import { addDays } from "./time";

// SDOT Drawbridge Status on data.seattle.gov. Published about daily, so it
// gives typical odds and the last logged opening, not live status.
const LOG = "https://data.seattle.gov/resource/gm8h-9449.json";
const BRIDGE = "Fremont";
export const FREMONT = { lat: 47.6476, lng: -122.3497 };

// SDOT traffic camera at Fremont Ave N & N 34th St, looking south at the bridge.
export const CAMERA_URL = "https://www.seattle.gov/trafficcams/images/Fremont_N_34_NS.jpg";

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
// so each browser keeps one copy per day.
const CACHE_KEY = "fremont-history-v2";

export async function fetchHistory(today: string): Promise<History> {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "null");
    if (cached?.day === today) return cached.history;
  } catch {
    // Storage blocked or corrupt; just fetch.
  }
  const history = await queryHistory(today);
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ day: today, history }));
  } catch {
    // Not worth failing over.
  }
  return history;
}

async function queryHistory(today: string): Promise<History> {
  const since = addDays(today, -WEEKS * 7);
  const days = seasonDays(today);
  const dayList = [...days.recent, ...days.lastYear].map((d) => `'${d}T00:00:00'`).join(", ");
  const [byHour, [last], seasonRows] = await Promise.all([
    soql<{ dow: string; hh: string; mins: string }>({
      $select: "date_extract_dow(opendatetime) as dow, date_extract_hh(opendatetime) as hh, sum(minutesopen) as mins",
      $where: `entityname = '${BRIDGE}' AND opendatetime >= '${since}T00:00:00' AND opendatetime < '${today}T00:00:00' AND minutesopen <= ${MAX_MINUTES}`,
      $group: "dow, hh",
      $limit: "500",
    }),
    soql<{ opendatetime: string; minutesopen: string }>({
      $where: `entityname = '${BRIDGE}'`,
      $order: "opendatetime DESC",
      $limit: "1",
    }),
    soql<LogRow>({
      $select: "opendatetime, closedatetime, minutesopen",
      $where: `entityname = '${BRIDGE}' AND date_trunc_ymd(opendatetime) in (${dayList})`,
      $limit: "5000",
    }),
  ]);

  const shares = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
  for (const r of byHour) shares[Number(r.dow)][Number(r.hh)] = Number(r.mins) / (WEEKS * 60);
  return {
    shares,
    seasonDays: days,
    seasonOpenings: toOpenings(seasonRows),
    lastOpening: last && { at: last.opendatetime, minutes: Number(last.minutesopen) },
  };
}

export async function fetchTraffic(key: string): Promise<Traffic> {
  const url =
    "https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/18/json" +
    `?point=${FREMONT.lat},${FREMONT.lng}&unit=mph&key=${encodeURIComponent(key)}`;
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
