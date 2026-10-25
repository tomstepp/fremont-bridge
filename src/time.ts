// Everything on the site is in Seattle time, whatever the viewer's time zone.
const TZ = "America/Los_Angeles";
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const parts = (d: Date) =>
  Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      hour: "numeric",
      minute: "numeric",
      month: "numeric",
      hourCycle: "h23",
      weekday: "short",
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );

/** Seattle's calendar date, YYYY-MM-DD. */
export const seattleDate = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
export const seattleHour = (d = new Date()) => Number(parts(d).hour);
/** Minutes after midnight, Seattle time. */
export const seattleMinute = (d = new Date()) => Number(parts(d).hour) * 60 + Number(parts(d).minute);
/** 1 = January … 12 = December. */
export const seattleMonth = (d = new Date()) => Number(parts(d).month);
/** 0 = Sunday … 6 = Saturday, matching Socrata's date_extract_dow. */
export const seattleDow = (d = new Date()) => DAYS.indexOf(parts(d).weekday);

/** YYYY-MM-DD shifted by n days. */
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const longDay = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const dayName = (dow: number) => longDay[dow];

/** Hour 0–23 -> "6a" / "12p". */
export const hourLabel = (h: number) => `${h % 12 || 12}${h < 12 ? "a" : "p"}`;
/** Hour 0–23 -> "6 AM" / "12 PM". */
export const hourName = (h: number) => `${h % 12 || 12} ${h < 12 ? "AM" : "PM"}`;

/** Socrata "floating" Seattle time "2026-10-24T17:38:00.000" -> "Sat, Oct 24, 5:38 PM". */
export const formatFloating = (t: string) =>
  new Date(`${t.slice(0, 19)}Z`).toLocaleString("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

/** "Sun, Oct 25 · 10:53 AM" in Seattle time. */
export const formatStamp = (d: Date) =>
  `${d.toLocaleDateString("en-US", { timeZone: TZ, weekday: "short", month: "short", day: "numeric" })} · ${formatTime(d)}`;

export const formatTime = (d: Date) =>
  d.toLocaleTimeString("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
