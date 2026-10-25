import { guess, pct, type CameraReport, type Level, type Traffic } from "./guess";
import { season, type Season } from "./season";
import { CAMERAS, fetchHistory, fetchTraffic, type Camera, type History } from "./sources";
import { dayName, formatFloating, formatStamp, formatTime, hourLabel, hourName, isOvernight, isRushHour, seattleDate, seattleDow, seattleHour } from "./time";

const TOMTOM_KEY = import.meta.env.VITE_TOMTOM_KEY as string | undefined;
const REFRESH_MS = 60_000;
// TomTom's flow data only changes every few minutes, and the free tier caps
// daily lookups, so traffic refreshes less often than the rest of the page.
const TRAFFIC_MS = 5 * 60_000;
// Timers drift a little; without slack the fifth minute's tick can land a few
// milliseconds short of five minutes and push traffic to the sixth.
const SLACK_MS = 5_000;
// A camera report goes stale about as fast as an opening ends.
const REPORT_MS = 5 * 60_000;
// How long to wait for the first camera picture before saying it's not responding.
const CAMERA_TIMEOUT_MS = 15_000;

// Photos for each answer, from the bridge busy with traffic to a ship passing
// under the raised spans. Files are in public/img; all via Wikimedia Commons
// (see the README). Each visit picks one per answer at random.
interface Photo {
  file: string;
  alt: string;
  credit: string;
}

const SMA = "Seattle Municipal Archives, CC BY 2.0.";
const PHOTOS: Record<Level, Photo[]> = {
  "definitely-not": [
    {
      file: "definitely-not.jpg",
      alt: "Cars and a crowd crossing the lowered Fremont Bridge, 1917",
      credit: "Traffic and crowds crossing on July 4, 1917. Webster & Stevens, public domain.",
    },
    {
      file: "definitely-not-2.jpg",
      alt: "Streetcars and a car crossing the Fremont Bridge while workers repair the deck, 1936",
      credit: `Streetcars crossing during deck repairs, 1936. ${SMA}`,
    },
    {
      file: "definitely-not-3.jpg",
      alt: "Cars and a streetcar driving across the Fremont Bridge, 1927",
      credit: `Traffic crossing, 1927. ${SMA}`,
    },
  ],
  nope: [
    {
      file: "nope.jpg",
      alt: "Looking across the lowered Fremont Bridge with a streetcar and early cars, 1917",
      credit: "The bridge on opening day, June 15, 1917. James P. Lee, public domain.",
    },
    {
      file: "nope-2.jpg",
      alt: "Cars and a streetcar on the lowered Fremont Bridge between its tender houses, 1928",
      credit: `Traffic on the bridge, 1928. ${SMA}`,
    },
    {
      file: "nope-3.jpg",
      alt: "Hand-colored photo of the lowered Fremont Bridge from the canal bank, 1920s",
      credit: "A hand-colored view from the canal, 1920s. William Creswell, CC BY 2.0.",
    },
  ],
  "probably-not": [
    {
      file: "probably-not.jpg",
      alt: "The lowered Fremont Bridge seen from the canal, with small boats waiting, 1917",
      credit: "Boats waiting below the bridge, July 4, 1917. Webster & Stevens, public domain.",
    },
    {
      file: "probably-not-2.jpg",
      alt: "The lowered Fremont Bridge over calm water with the Aurora Bridge behind, 1936",
      credit: `The Fremont and Aurora bridges, 1936. ${SMA}`,
    },
  ],
  maybe: [
    {
      file: "maybe.jpg",
      alt: "A bridge operator in the control tower points at a ship coming up the canal, 2001",
      credit: "A bridge operator spots a ship, 2001. Ian Edelstein / Seattle Municipal Archives, CC BY 2.0.",
    },
  ],
  probably: [
    {
      file: "probably.jpg",
      alt: "The gears that raise the Fremont Bridge, 1916",
      credit: "The gears that lift the spans, November 16, 1916. James P. Lee, public domain.",
    },
    {
      file: "probably-2.jpg",
      alt: "Two workers servicing the bridge's lifting machinery, 1951",
      credit: `Workers tending the lifting machinery, 1951. ${SMA}`,
    },
  ],
  yep: [
    {
      file: "yep.jpg",
      alt: "The Fremont Bridge raised as a ship passes through, 1917",
      credit: "Opening of the Lake Washington Ship Canal, July 4, 1917. Asahel Curtis, public domain.",
    },
    {
      file: "yep-2.jpg",
      alt: "The Fremont Bridge's blue span raised, seen from the water, 2012",
      credit: "The span raised, 2012. Robert Ashworth, CC BY 2.0.",
    },
  ],
  definitely: [
    {
      file: "definitely.jpg",
      alt: "The Navy tug USS Tatnuck passing under the raised Fremont Bridge, with the Aurora Bridge behind, 1936",
      credit: `USS Tatnuck passing through, 1936. ${SMA}`,
    },
  ],
};

// Picked once per visit, so the photo only changes when the answer does.
const photoFor = Object.fromEntries(
  Object.entries(PHOTOS).map(([level, list]) => [level, list[Math.floor(Math.random() * list.length)]]),
) as Record<Level, Photo>;

// Tab icon: who gets across right now, cars or boats. Same markup as the
// starting icon in index.html.
const iconFor = (up: boolean) =>
  `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.88em' x='50' text-anchor='middle' font-size='100'>${up ? "⛵" : "🚗"}</text></svg>`;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

let history: History | undefined;
let traffic: Traffic | undefined;
let report: { what: CameraReport; at: number } | undefined;

function render() {
  if (!history) return;
  const now = new Date();
  const dow = seattleDow(now);
  const hour = seattleHour(now);
  const camera = report && Date.now() - report.at < REPORT_MS ? report.what : undefined;
  const year = history.shares[dow];
  const s = season(history.seasonOpenings, history.seasonDays, year);
  const g = guess({ baseRate: s.shares[hour], yearRate: year[hour], dayLabel: `${dayName(dow)}s`, traffic, camera });

  // The answer is a live region; only touch it on a real change so screen
  // readers don't re-announce it every minute.
  if ($("answer").textContent !== g.answer) {
    $("answer").textContent = g.answer;
    document.title = `${g.answer} · Is the Fremont Bridge up?`;
    $<HTMLLinkElement>("icon").href = iconFor(g.up);
  }
  $("answer").dataset.level = g.level;
  $("odds").textContent = `${pct(g.probability)} chance it's up · ${formatTime(now)}`;

  const photo = photoFor[g.level];
  const img = $<HTMLImageElement>("photo");
  const src = `img/${photo.file}`;
  if (!img.src.endsWith(`/${src}`)) img.src = src;
  img.alt = photo.alt;
  $("photo-credit").textContent = photo.credit;

  const factors = [...g.factors];
  if (isRushHour(dow, hour)) factors.splice(1, 0, { label: "It's weekday rush hour, so only large ships get an opening" });
  $("factors").replaceChildren(
    ...factors.map((f) => {
      const li = document.createElement("li");
      li.textContent = f.label;
      if (f.ratio !== undefined && f.ratio !== 1) li.dataset.effect = f.ratio > 1 ? "up" : "down";
      return li;
    }),
  );

  const last = history.lastOpening;
  $("last").textContent = last
    ? `Last logged opening: ${formatFloating(last.at)}, ${last.minutes} min.`
    : "";

  for (const b of document.querySelectorAll<HTMLButtonElement>("[data-report]"))
    b.setAttribute("aria-pressed", String(b.dataset.report === camera));

  renderChart(s, dow, hour);
}

function renderChart({ shares, stats }: Season, dow: number, hour: number) {
  const max = Math.max(...shares, 0.01);
  const peak = shares.indexOf(Math.max(...shares));
  const days = `${dayName(dow)}s`;
  $("chart-title").textContent = `${days} this time of year`;

  // A sensor outage leaves a day blank; say so rather than count it as quiet.
  const missing = 9 - stats.recentDays - stats.lastYearDays;
  $("chart-stats").replaceChildren(
    ...[
      [`Last 4 ${days}`, `${stats.recentPerDay}/day`, "Openings a day, last four weeks"],
      ["Last year", `${stats.lastYearPerDay}/day`, "Openings a day, same weeks last year"],
      ["Duration", `${stats.medianMinutes} min`, "Median opening length"],
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

  const weekday = dow >= 1 && dow <= 5;
  $("chart-note").textContent =
    `${9 - missing} days${missing ? ` (${missing} not logged)` : ""} blended with the year-round average. ` +
    "Shaded: overnight, appointment only" +
    (weekday ? "; rush hours, large ships only." : ".");
  $("chart").setAttribute(
    "aria-label",
    `Share of each hour the bridge is up on ${days} this time of year; busiest is ${hourLabel(peak)}, about ${pct(max)}.`,
  );
  $("chart").replaceChildren(
    ...shares.map((s, h) => {
      const col = document.createElement("div");
      col.className = "col";
      if (h === hour) col.dataset.now = "";
      if (isRushHour(dow, h) || isOvernight(h)) col.dataset.limited = "";
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
    traffic = await fetchTraffic(TOMTOM_KEY);
  } catch (err) {
    console.warn(err);
    traffic = undefined;
  }
}

// Each picture loads off-page and only replaces the shown one once it has
// arrived, so a slow or failed fetch never blanks a picture that's already up.
let camShown = false;
let cameraAt = -Infinity;

// The viewer's pick of camera, remembered between visits when storage allows.
const CAMERA_KEY = "fremont-camera";
let camera = CAMERAS[0];
try {
  camera = CAMERAS.find((c) => c.id === localStorage.getItem(CAMERA_KEY)) ?? camera;
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
    ...CAMERAS.map((c) => {
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
  showCamera(camera);
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
  if (!TOMTOM_KEY) $("traffic-credit").hidden = true;
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
  try {
    [history] = await Promise.all([fetchHistory(seattleDate()), refreshTraffic()]);
  } catch (err) {
    console.error(err);
    $("answer").textContent = "No idea.";
    $("odds").textContent = "Couldn't reach SDOT's bridge log. Try again in a bit.";
    return;
  }
  render();
  setInterval(tick, REFRESH_MS);
  document.addEventListener("visibilitychange", tick);
}

start();
