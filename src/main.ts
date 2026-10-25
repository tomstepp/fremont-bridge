import {
  OVERVIEW_PATH,
  bridgeForPath,
  isOvernight,
  isRushHour,
  isRushMinute,
  weekdayRules,
  type Camera,
  type Photo,
  type When,
} from "./bridges";
import { pct, type CameraReport, type Level } from "./guess";
import {
  REFRESH_MS,
  SLACK_MS,
  TOMTOM_KEY,
  TRAFFIC_MS,
  estimate,
  iconFor,
  moment,
  renderTabs,
  type BridgeData,
} from "./live";
import { startOverview } from "./overview";
import type { Season } from "./season";
import { cachedRecent, cachedYear, fetchRecent, fetchTraffic, fetchYear } from "./sources";
import {
  addDays,
  dayName,
  formatFloating,
  formatStamp,
  formatTime,
  hourLabel,
  hourName,
  seattleDate,
} from "./time";

// A camera report goes stale about as fast as an opening ends.
const REPORT_MS = 5 * 60_000;
// How long to wait for the first camera picture before saying it's not responding.
const CAMERA_TIMEOUT_MS = 15_000;
// No logged opening for this long means SDOT's log has stopped for the bridge.
const STALE_LOG_DAYS = 7;
const LOADING_LOG = "Loading SDOT's opening log…";

// Pages live at /ballard, /all, … with no trailing slash. Older /ballard/-style
// links reach this same page through 404.html; tidy the address to match.
if (location.pathname.length > 1 && location.pathname.endsWith("/"))
  history.replaceState(null, "", location.pathname.replace(/\/+$/, "") + location.search + location.hash);

// The page's bridge comes from its path: /ballard, /university, … or / for Fremont.
const bridge = bridgeForPath(location.pathname);

// Picked once per visit, so the photo only changes when the answer does.
const photoFor = Object.fromEntries(
  Object.entries(bridge.photos).map(([level, list]) => [level, list[Math.floor(Math.random() * list.length)]]),
) as Record<Level, Photo>;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

// SDOT's log arrives in two parts (see sources.ts); the page shows what it has.
const data: BridgeData = {};
let report: { what: CameraReport; at: number } | undefined;

function render() {
  const m = moment();
  const { now, when, hour, minute } = m;
  const { dow } = when;
  const camera = report && Date.now() - report.at < REPORT_MS ? report.what : undefined;
  const e = estimate(bridge, data, m, camera);
  if (!e) return;
  const { guess: g, shares, season: s } = e;

  // The answer is a live region; only touch it on a real change so screen
  // readers don't re-announce it every minute.
  if ($("answer").textContent !== g.answer) {
    $("answer").textContent = g.answer;
    document.title = `${g.answer} · Is the ${bridge.name} Bridge up?`;
    $<HTMLLinkElement>("icon").href = iconFor(g.up);
  }
  $("answer").dataset.level = g.level;
  $("odds").textContent = `${pct(g.probability)} chance it's up · ${formatTime(now)}`;

  const photo = photoFor[g.level];
  const img = $<HTMLImageElement>("photo");
  const src = `/img/${photo.file}`;
  if (!img.src.endsWith(`/${src}`)) img.src = src;
  img.alt = photo.alt;
  $("photo-credit").textContent = photo.credit;

  const factors = [...g.factors];
  if (isRushMinute(bridge, when, minute)) factors.splice(1, 0, { label: "Weekday rush hour: large ships only" });
  // A holiday on a weekday lifts the closures (Columbus Day doesn't for SDOT's bridges).
  if (when.holiday && dow >= 1 && dow <= 5 && !weekdayRules(bridge, when))
    factors.splice(1, 0, { label: `${when.holiday}: no rush-hour closures` });
  $("factors").replaceChildren(
    ...factors.map((f) => {
      const li = document.createElement("li");
      li.textContent = f.label;
      if (f.ratio !== undefined && f.ratio !== 1) li.dataset.effect = f.ratio > 1 ? "up" : "down";
      return li;
    }),
  );

  // Every bridge opens most days, so a week with nothing logged means SDOT's
  // sensor is down (University's went quiet in 2026), not a quiet bridge.
  const last = data.recent?.lastOpening;
  const stale = !last || last.at.slice(0, 10) < addDays(seattleDate(now), -STALE_LOG_DAYS);
  $("last").textContent = !data.recent
    ? LOADING_LOG
    : !last
    ? "SDOT hasn't logged any openings for this bridge."
    : stale
      ? `SDOT hasn't logged an opening here since ${formatFloating(last.at)}; its sensor may be down.`
      : `Last logged opening: ${formatFloating(last.at)}, ${last.minutes} min.`;

  for (const b of document.querySelectorAll<HTMLButtonElement>("[data-report]"))
    b.setAttribute("aria-pressed", String(b.dataset.report === camera));

  renderChart(shares, s?.stats, when, hour);
}

function renderChart(shares: number[], stats: Season["stats"] | undefined, when: When, hour: number) {
  const { dow } = when;
  const max = Math.max(...shares, 0.01);
  const peak = shares.indexOf(Math.max(...shares));
  const days = `${dayName(dow)}s`;
  $("chart-title").textContent = `${days} this time of year`;

  // A sensor outage leaves a day blank; say so rather than count it as quiet.
  const missing = stats ? 9 - stats.recentDays - stats.lastYearDays : 0;
  const value = (v: string) => (stats ? v : "…");
  $("chart-stats").replaceChildren(
    ...[
      [`Last 4 ${days}`, value(`${stats?.recentPerDay}/day`), "Openings a day, last four weeks"],
      ["Last year", value(`${stats?.lastYearPerDay}/day`), "Openings a day, same weeks last year"],
      ["Duration", value(`${stats?.medianMinutes} min`), "Median opening length"],
      ["Busiest", hourName(peak), "Hour the bridge is up most"],
    ].map(([term, value, title]) => {
      const pair = document.createElement("div");
      pair.title = title;
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      dt.textContent = term;
      dd.textContent = value;
      pair.append(dt, dd);
      return pair;
    }),
  );

  const shaded = [
    bridge.overnight && "overnight, appointment only",
    weekdayRules(bridge, when) && bridge.rush(when.day).length > 0 && "rush hours, large ships only",
  ].filter(Boolean);
  const basis = !stats
    ? "Year-round average for now; recent weeks still loading."
    : !data.year
      ? `${9 - missing} days${missing ? ` (${missing} not logged)` : ""}; year-round average still loading.`
      : `${9 - missing} days${missing ? ` (${missing} not logged)` : ""} blended with the year-round average.`;
  $("chart-note").textContent = basis + (shaded.length ? ` Shaded: ${shaded.join("; ")}.` : "");
  $("chart").setAttribute(
    "aria-label",
    `Share of each hour the bridge is up on ${days} this time of year; busiest is ${hourLabel(peak)}, about ${pct(max)}.`,
  );
  $("chart").replaceChildren(
    ...shares.map((s, h) => {
      const col = document.createElement("div");
      col.className = "col";
      if (h === hour) col.dataset.now = "";
      if (isRushHour(bridge, when, h) || isOvernight(bridge, h)) col.dataset.limited = "";
      col.title = `${hourLabel(h)}: up ${pct(s)} of the time`;
      const bar = document.createElement("span");
      bar.className = "bar";
      bar.style.height = `${(s / max) * 100}%`;
      const label = document.createElement("span");
      label.className = "label";
      label.textContent = h % 3 === 0 ? hourLabel(h) : "";
      col.append(bar, label);
      return col;
    }),
  );
}

let trafficAt = -Infinity;

async function refreshTraffic() {
  if (!TOMTOM_KEY || Date.now() - trafficAt < TRAFFIC_MS - SLACK_MS) return;
  // Stamped before the request, so a failure also waits five minutes to retry.
  trafficAt = Date.now();
  try {
    data.traffic = await fetchTraffic(bridge, TOMTOM_KEY);
  } catch (err) {
    console.warn(err);
    data.traffic = undefined;
  }
  // Credit TomTom only while its data is actually part of the guess.
  $("traffic-credit").hidden = !data.traffic;
}

// Each picture loads off-page and only replaces the shown one once it has
// arrived, so a slow or failed fetch never blanks a picture that's already up.
let camShown = false;
let cameraAt = -Infinity;

// The viewer's pick of camera, remembered between visits when storage allows.
const CAMERA_KEY = `camera-${bridge.id}`;
let camera = bridge.cameras[0];
try {
  camera = bridge.cameras.find((c) => c.id === localStorage.getItem(CAMERA_KEY)) ?? camera;
} catch {
  // Storage blocked; use the default.
}

function refreshCamera() {
  cameraAt = Date.now();
  const cam = camera;
  const next = new Image();
  const timer = setTimeout(() => {
    if (cam === camera && !camShown) setCamState("error", "The live view isn't responding. Trying again in a minute.");
  }, CAMERA_TIMEOUT_MS);
  next.onload = () => {
    clearTimeout(timer);
    // The viewer may have switched cameras while this one was loading.
    if (cam !== camera) return;
    $<HTMLImageElement>("cam").src = next.src;
    $("cam-time").textContent = formatStamp(new Date());
    camShown = true;
    setCamState("ready", "");
  };
  next.onerror = () => {
    clearTimeout(timer);
    if (cam === camera && !camShown) setCamState("error", "The live view isn't responding. Trying again in a minute.");
  };
  next.src = `${cam.url}?t=${Date.now()}`;
}

function showCamera(next: Camera) {
  camera = next;
  $<HTMLImageElement>("cam").alt = next.alt;
  $("cam-caption").textContent = next.caption;
  for (const b of document.querySelectorAll<HTMLButtonElement>("#cam-buttons button"))
    b.setAttribute("aria-pressed", String(b.dataset.camera === next.id));
}

function setupCameras() {
  $("cam-buttons").replaceChildren(
    ...bridge.cameras.map((c) => {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.camera = c.id;
      b.textContent = c.label;
      b.addEventListener("click", () => {
        if (c === camera) return;
        try {
          localStorage.setItem(CAMERA_KEY, c.id);
        } catch {
          // Not worth failing over.
        }
        showCamera(c);
        camShown = false;
        setCamState("loading", "Loading live view…");
        refreshCamera();
      });
      return b;
    }),
  );
  // One camera needs no switch.
  $("cam-buttons").hidden = bridge.cameras.length < 2;
  showCamera(camera);
}

function setupPage() {
  $("question").textContent = `Is the ${bridge.name} Bridge up right now?`;
  document.title = `Is the ${bridge.name} Bridge up?`;
  renderTabs($("bridges"), bridge.path);
}

function setCamState(state: "loading" | "ready" | "error", message: string) {
  $("cam-frame").dataset.state = state;
  $("cam-status").textContent = message;
}

// Background tabs refresh nothing; coming back catches up on whatever is out
// of date (the camera after a minute, traffic after five).
async function tick() {
  if (document.hidden) return;
  if (Date.now() - cameraAt >= REFRESH_MS - SLACK_MS) refreshCamera();
  await refreshTraffic();
  render();
}

async function start() {
  setupPage();
  for (const b of document.querySelectorAll<HTMLButtonElement>("[data-report]")) {
    b.addEventListener("click", () => {
      const what = b.dataset.report as CameraReport;
      // Tapping the active button again clears it.
      report = report?.what === what && Date.now() - report.at < REPORT_MS ? undefined : { what, at: Date.now() };
      render();
    });
  }

  setupCameras();
  // SDOT's camera server is sometimes slow; start it only once the page has
  // finished loading so it can't hold up the browser's loading indicator.
  if (document.readyState === "complete") refreshCamera();
  else window.addEventListener("load", refreshCamera, { once: true });
  // Show whatever this browser already has right away, then fill in each part
  // of SDOT's log, and traffic, as it arrives.
  const today = seattleDate();
  const cached = cachedYear(bridge, today);
  data.year = cached?.shares;
  data.recent = cachedRecent(bridge, today);
  render();
  const loads = [
    cached?.fresh ? undefined : fetchYear(bridge, today).then((v) => (data.year = v)),
    data.recent ? undefined : fetchRecent(bridge, today).then((v) => (data.recent = v)),
    refreshTraffic(),
  ].map((p) => p?.then(render));
  const results = await Promise.allSettled(loads);
  for (const r of results) if (r.status === "rejected") console.error(r.reason);
  if (!data.year && !data.recent) {
    $("answer").textContent = "No idea.";
    $("odds").textContent = "Couldn't reach SDOT's bridge log. Try again in a bit.";
    $("last").textContent = "";
  }
  setInterval(tick, REFRESH_MS);
  document.addEventListener("visibilitychange", tick);
}

if (location.pathname === OVERVIEW_PATH) startOverview();
else start();
