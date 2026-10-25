// Turns the signals into one chance that the bridge is up right now. Naive
// Bayes: start from how often the bridge is up at this weekday and hour, then
// let each live signal shift the odds by a likelihood ratio. Pure, so it can be
// tested; the ratios are hand-tuned guesses, not fitted.

/** What the viewer saw on the traffic camera. */
export type CameraReport = "waiting" | "moving";

export interface Traffic {
  currentSpeed: number; // mph
  freeFlowSpeed: number; // mph
  closed: boolean;
  confidence: number; // 0–1, TomTom's own
}

export interface Signals {
  /** Share of minutes the bridge is typically up at this weekday and hour, this time of year. */
  baseRate: number;
  /** The same over the whole past year, for comparison in the explanation. */
  yearRate?: number;
  /** "Sundays", for the explanation. */
  dayLabel?: string;
  /** False when baseRate is the year-round average because the seasonal days haven't loaded. */
  seasonal?: boolean;
  traffic?: Traffic;
  camera?: CameraReport;
}

export interface Factor {
  label: string;
  /** Likelihood ratio applied: above 1 pushes toward "up". Absent for the starting odds. */
  ratio?: number;
}

export interface Guess {
  probability: number;
  answer: string;
  level: Level;
  up: boolean;
  factors: Factor[];
}

// Even the quietest hour gets a sliver of a chance, so live signals can still flip it.
const MIN_BASE = 0.002;
const MAX_BASE = 0.5;

// A closure with traffic stopped: as strong as traffic evidence gets.
const CLOSED_RATIO = 20;

export function trafficRatio(t: Traffic): number {
  if (t.confidence < 0.5 || t.freeFlowSpeed <= 0) return 1;
  const speed = t.currentSpeed / t.freeFlowSpeed;
  // TomTom also flags long-running closures (construction on one direction,
  // say) while traffic still moves, so a closure only counts if it's crawling.
  if (t.closed && speed < 0.5) return CLOSED_RATIO;
  // TomTom smooths over a few minutes and openings last about five, so a crawl
  // is decent evidence but free-flowing traffic is only weak evidence of "down".
  if (speed < 0.25) return 6;
  if (speed < 0.5) return 2;
  if (speed > 0.8) return 0.5;
  return 1;
}

// The camera looks across N 34th St toward the bridge's north end.
export const CAMERA_RATIO: Record<CameraReport, number> = {
  waiting: 15, // traffic stopped and nothing coming off the bridge
  moving: 0.05, // cars are crossing, so it's down
};

/** How sure the answer is; the page colors the answer by it. */
export type Level = "definitely-not" | "nope" | "probably-not" | "maybe" | "probably" | "yep" | "definitely";

// Upper bound of each level's probability, in order.
const LEVELS: [number, Level, string][] = [
  [0.005, "definitely-not", "Definitely not."],
  [0.03, "nope", "Nope."],
  [0.15, "probably-not", "Probably not."],
  [0.4, "maybe", "Hmm, maybe."],
  [0.75, "probably", "Probably!"],
  [0.95, "yep", "Yep, it's up."],
  [Infinity, "definitely", "Definitely up!"],
];

export function answerFor(p: number): { level: Level; answer: string } {
  const [, level, answer] = LEVELS.find(([max]) => p < max)!;
  return { level, answer };
}

export function guess(s: Signals): Guess {
  const base = Math.min(Math.max(s.baseRate, MIN_BASE), MAX_BASE);
  const days = s.dayLabel ?? "this weekday";
  const year = s.yearRate === undefined ? "" : ` (${pct(s.yearRate)} year-round)`;
  const factors: Factor[] = [
    {
      label:
        s.seasonal === false
          ? `Up about ${pct(s.baseRate)} of this hour on ${days} year-round`
          : `Up about ${pct(s.baseRate)} of this hour on ${days} this time of year${year}`,
    },
  ];
  let odds = base / (1 - base);

  if (s.traffic) {
    const ratio = trafficRatio(s.traffic);
    const { currentSpeed, freeFlowSpeed } = s.traffic;
    const label = ratio === CLOSED_RATIO
      ? "TomTom reports the bridge road closed"
      : `Traffic on the bridge: ${Math.round(currentSpeed)} mph (normally ${Math.round(freeFlowSpeed)})`;
    factors.push({ label, ratio });
    odds *= ratio;
  }

  if (s.camera) {
    const ratio = CAMERA_RATIO[s.camera];
    factors.push({ label: s.camera === "waiting" ? "You saw traffic stopped at the bridge" : "You saw cars crossing", ratio });
    odds *= ratio;
  }

  const probability = odds / (1 + odds);
  return { probability, ...answerFor(probability), up: probability >= 0.4, factors };
}

/** 0.053 -> "5%", 0.004 -> "<1%" */
export const pct = (p: number) => (p > 0 && p < 0.01 ? "<1%" : `${Math.round(p * 100)}%`);
