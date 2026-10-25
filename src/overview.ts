// The overview at /all: one row per bridge with its answer, its chance and a
// live camera picture, each linking to that bridge's page. Answers come from
// the same estimate as the bridge pages, so the two always agree.
import { BRIDGES, OVERVIEW_PATH, type Bridge } from "./bridges";
import { pct, type Level } from "./guess";
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
import { cachedRecent, cachedYear, fetchRecent, fetchTraffic, fetchYear } from "./sources";
import { formatTime, seattleDate } from "./time";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

interface Row {
  bridge: Bridge;
  data: BridgeData;
  word: HTMLElement;
  chance: HTMLElement;
  frame: HTMLElement;
  img: HTMLImageElement;
  camShown: boolean;
}

function buildRows(): Row[] {
  return BRIDGES.map((bridge) => {
    const li = document.createElement("li");
    li.className = "ov-row";

    // The name is the card's link; CSS stretches it over the whole card.
    const name = document.createElement("a");
    name.className = "ov-name";
    name.href = bridge.path;
    name.textContent = bridge.name;

    const answer = document.createElement("p");
    answer.className = "ov-answer";
    const word = document.createElement("span");
    word.className = "ov-word";
    word.textContent = "Checking…";
    const chance = document.createElement("span");
    chance.className = "ov-chance";
    answer.append(word, chance);

    const more = document.createElement("p");
    more.className = "ov-more";
    more.innerHTML = '<span class="on-touch">Tap</span><span class="on-pointer">Click</span> for more ›';
    more.setAttribute("aria-hidden", "true");

    const cam = document.createElement("span");
    cam.className = "ov-cam";
    const frame = document.createElement("span");
    frame.className = "ov-frame";
    frame.dataset.state = "loading";
    const img = document.createElement("img");
    img.alt = bridge.cameras[0].alt;
    img.width = 1280;
    img.height = 720;
    frame.append(img);
    cam.append(frame);

    li.append(name, answer, more, cam);
    $("overview-list").append(li);
    return { bridge, data: {}, word, chance, frame, img, camShown: false };
  });
}

// The page's own answer sums up the bridges: which are up, or "All down."
const ANSWER_ORDER: Level[] = ["definitely-not", "nope", "probably-not", "maybe", "probably", "yep", "definitely"];

function render(rows: Row[]) {
  const m = moment();
  const shown: { row: Row; probability: number; level: Level; up: boolean }[] = [];
  for (const row of rows) {
    const e = estimate(row.bridge, row.data, m);
    if (!e) continue;
    const g = e.guess;
    row.word.textContent = g.answer;
    row.word.dataset.level = g.level;
    row.chance.textContent = `${pct(g.probability)} chance`;
    shown.push({ row, probability: g.probability, level: g.level, up: g.up });
  }
  if (!shown.length) return;

  const up = shown.filter((s) => s.up).map((s) => s.row.bridge.name);
  const top = shown.reduce((a, b) => (ANSWER_ORDER.indexOf(b.level) > ANSWER_ORDER.indexOf(a.level) ? b : a));
  const summary = up.length
    ? `${up.join(" and ")} ${up.length > 1 ? "are" : "is"} probably up!`
    : top.level === "maybe" || top.level === "probably-not"
      ? "Probably all down."
      : "All down.";
  // A live region; only touch it on a real change.
  if ($("answer").textContent !== summary) {
    $("answer").textContent = summary;
    document.title = `${summary} · Seattle drawbridges`;
    $<HTMLLinkElement>("icon").href = iconFor(up.length > 0);
  }
  $("answer").dataset.level = top.level;
  $("odds").textContent = `Checked ${formatTime(m.now)}`;
}

let trafficAt = -Infinity;

async function refreshTraffic(rows: Row[]) {
  if (!TOMTOM_KEY || Date.now() - trafficAt < TRAFFIC_MS - SLACK_MS) return;
  trafficAt = Date.now();
  const key = TOMTOM_KEY;
  await Promise.all(
    rows.map(async (row) => {
      try {
        row.data.traffic = await fetchTraffic(row.bridge, key);
      } catch (err) {
        console.warn(err);
        row.data.traffic = undefined;
      }
    }),
  );
  $("traffic-credit").hidden = !rows.some((r) => r.data.traffic);
}

let cameraAt = -Infinity;

// Each picture loads off-page and replaces the shown one only once it arrives.
function refreshCameras(rows: Row[]) {
  cameraAt = Date.now();
  for (const row of rows) {
    const next = new Image();
    next.onload = () => {
      row.img.src = next.src;
      row.camShown = true;
      row.frame.dataset.state = "ready";
    };
    next.onerror = () => {
      if (!row.camShown) row.frame.dataset.state = "error";
    };
    next.src = `${row.bridge.cameras[0].url}?t=${Date.now()}`;
  }
}

export async function startOverview() {
  document.body.classList.add("overview-mode");
  $("overview").hidden = false;
  $("question").textContent = "Are Seattle's drawbridges up right now?";
  document.title = "Are Seattle's drawbridges up?";
  renderTabs($("bridges"), OVERVIEW_PATH);
  const rows = buildRows();

  // Same as the bridge page: cameras after the page has loaded, and whatever
  // this browser has saved shown at once, then each part as it arrives.
  const loadCameras = () => refreshCameras(rows);
  if (document.readyState === "complete") loadCameras();
  else window.addEventListener("load", loadCameras, { once: true });

  const today = seattleDate();
  const loads: Promise<unknown>[] = [];
  for (const row of rows) {
    const cached = cachedYear(row.bridge, today);
    row.data.year = cached?.shares;
    row.data.recent = cachedRecent(row.bridge, today);
    if (!cached?.fresh) loads.push(fetchYear(row.bridge, today).then((v) => (row.data.year = v)));
    if (!row.data.recent) loads.push(fetchRecent(row.bridge, today).then((v) => (row.data.recent = v)));
  }
  render(rows);
  loads.push(refreshTraffic(rows));
  const results = await Promise.allSettled(loads.map((p) => p.then(() => render(rows))));
  for (const r of results) if (r.status === "rejected") console.error(r.reason);
  if (!rows.some((r) => r.data.year || r.data.recent)) {
    $("answer").textContent = "No idea.";
    $("odds").textContent = "Couldn't reach SDOT's bridge log. Try again in a bit.";
  }

  const tick = async () => {
    if (document.hidden) return;
    if (Date.now() - cameraAt >= REFRESH_MS - SLACK_MS) refreshCameras(rows);
    await refreshTraffic(rows);
    render(rows);
  };
  setInterval(tick, REFRESH_MS);
  document.addEventListener("visibilitychange", tick);
}
