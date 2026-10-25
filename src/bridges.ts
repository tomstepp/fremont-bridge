// Everything that differs between bridges: SDOT's name for it, where it is,
// its opening rules, cameras and photos. Each bridge gets a page at its path.
import type { Factor, Level } from "./guess.ts";

export interface Camera {
  id: string;
  label: string;
  url: string;
  caption: string;
  alt: string;
}

/** A photo in public/img; all via Wikimedia Commons (see the README). */
export interface Photo {
  file: string;
  alt: string;
  credit: string;
}

export interface Bridge {
  id: string;
  name: string; // "Fremont", as in "the Fremont Bridge"
  path: string; // "/" or "/ballard/"
  logName: string; // entityname in SDOT's drawbridge log
  point: { lat: number; lng: number }; // the span itself, for TomTom
  /** Weekday closures to boats under 1,000 tons on a YYYY-MM-DD day, as [start, end) minutes after midnight. */
  rush: (day: string) => [number, number][];
  /** Weekday windows when it opens only on the hour and half hour, as [start, end) minutes. */
  halfHourly?: [number, number][];
  /** Whether the weekday rules still apply on this federal holiday. */
  rulesOnHoliday: (holiday: string) => boolean;
  /** Opens only with an hour's notice 11 PM–7 AM. */
  overnight: boolean;
  cameras: Camera[]; // first is the default
  photos: Record<Level, Photo[]>;
  /** The link-preview image (1200×630) in public/img. */
  preview: { file: string; alt: string };
}

const SDOT_CAMS = "https://www.seattle.gov/trafficcams/images/";
const SMA = "Seattle Municipal Archives, CC BY 2.0.";

// 33 CFR 117.1051(d): Ballard, Fremont and University close to most boats
// 7–9 AM and 4–6 PM on weekdays, except federal holidays other than Columbus
// Day, and open overnight only on notice.
const CANAL_RUSH = (): [number, number][] => [
  [7 * 60, 9 * 60],
  [16 * 60, 18 * 60],
];
const CANAL_HOLIDAYS = (holiday: string) => holiday === "Columbus Day";

const FREMONT: Bridge = {
  id: "fremont",
  preview: { file: "og.jpg", alt: "The Fremont Bridge's blue span raised over the ship canal" },
  name: "Fremont",
  path: "/",
  logName: "Fremont",
  point: { lat: 47.6476, lng: -122.3497 },
  rush: CANAL_RUSH,
  rulesOnHoliday: CANAL_HOLIDAYS,
  overnight: true,
  cameras: [
    {
      id: "south",
      label: "South end",
      url: `${SDOT_CAMS}4_N_Dexter_2.jpg`,
      caption: "4th Ave N & Dexter Ave N, looking north across the deck.",
      alt: "SDOT traffic camera at 4th Ave N and Dexter Ave N, looking north across the Fremont Bridge deck",
    },
    {
      id: "north",
      label: "North end",
      url: `${SDOT_CAMS}Fremont_N_34_NS.jpg`,
      caption: "Fremont Ave N & N 34th St, looking south toward the bridge.",
      alt: "SDOT traffic camera at Fremont Ave N and N 34th St, looking south toward the bridge",
    },
  ],
  photos: {
    "definitely-not": [
      {
        file: "fremont/definitely-not.jpg",
        alt: "Cars and a crowd crossing the lowered Fremont Bridge, 1917",
        credit: "Traffic and crowds crossing on July 4, 1917. Webster & Stevens, public domain.",
      },
      {
        file: "fremont/definitely-not-2.jpg",
        alt: "Streetcars and a car crossing the Fremont Bridge while workers repair the deck, 1936",
        credit: `Streetcars crossing during deck repairs, 1936. ${SMA}`,
      },
      {
        file: "fremont/definitely-not-3.jpg",
        alt: "Cars and a streetcar driving across the Fremont Bridge, 1927",
        credit: `Traffic crossing, 1927. ${SMA}`,
      },
    ],
    nope: [
      {
        file: "fremont/nope.jpg",
        alt: "Looking across the lowered Fremont Bridge with a streetcar and early cars, 1917",
        credit: "The bridge on opening day, June 15, 1917. James P. Lee, public domain.",
      },
      {
        file: "fremont/nope-2.jpg",
        alt: "Cars and a streetcar on the lowered Fremont Bridge between its tender houses, 1928",
        credit: `Traffic on the bridge, 1928. ${SMA}`,
      },
      {
        file: "fremont/nope-3.jpg",
        alt: "Hand-colored photo of the lowered Fremont Bridge from the canal bank, 1920s",
        credit: "A hand-colored view from the canal, 1920s. William Creswell, CC BY 2.0.",
      },
    ],
    "probably-not": [
      {
        file: "fremont/probably-not.jpg",
        alt: "The lowered Fremont Bridge seen from the canal, with small boats waiting, 1917",
        credit: "Boats waiting below the bridge, July 4, 1917. Webster & Stevens, public domain.",
      },
      {
        file: "fremont/probably-not-2.jpg",
        alt: "The lowered Fremont Bridge over calm water with the Aurora Bridge behind, 1936",
        credit: `The Fremont and Aurora bridges, 1936. ${SMA}`,
      },
    ],
    maybe: [
      {
        file: "fremont/maybe.jpg",
        alt: "A bridge operator in the control tower points at a ship coming up the canal, 2001",
        credit: "A bridge operator spots a ship, 2001. Ian Edelstein / Seattle Municipal Archives, CC BY 2.0.",
      },
    ],
    probably: [
      {
        file: "fremont/probably.jpg",
        alt: "The gears that raise the Fremont Bridge, 1916",
        credit: "The gears that lift the spans, November 16, 1916. James P. Lee, public domain.",
      },
      {
        file: "fremont/probably-2.jpg",
        alt: "Two workers servicing the bridge's lifting machinery, 1951",
        credit: `Workers tending the lifting machinery, 1951. ${SMA}`,
      },
    ],
    yep: [
      {
        file: "fremont/yep.jpg",
        alt: "The Fremont Bridge raised as a ship passes through, 1917",
        credit: "Opening of the Lake Washington Ship Canal, July 4, 1917. Asahel Curtis, public domain.",
      },
      {
        file: "fremont/yep-2.jpg",
        alt: "The Fremont Bridge's blue span raised, seen from the water, 2012",
        credit: "The span raised, 2012. Robert Ashworth, CC BY 2.0.",
      },
    ],
    definitely: [
      {
        file: "fremont/definitely.jpg",
        alt: "The Navy tug USS Tatnuck passing under the raised Fremont Bridge, with the Aurora Bridge behind, 1936",
        credit: `USS Tatnuck passing through, 1936. ${SMA}`,
      },
    ],
  },
};

const BALLARD_UP: Photo[] = [
  {
    file: "ballard/up-1918.jpg",
    alt: "The Ballard Bridge raised as a sailing ship passes through, 1918",
    credit: "A ship passing through, March 13, 1918. James P. Lee, public domain.",
  },
  {
    file: "ballard/up-2011.jpg",
    alt: "The Ballard Bridge's green spans raised, seen from a boat on the canal, 2011",
    credit: "The spans raised, seen from a boat, 2011. Brian Teutsch, CC BY 2.0.",
  },
];

const BALLARD: Bridge = {
  id: "ballard",
  preview: { file: "og-ballard.jpg", alt: "The Ballard Bridge's green spans raised, seen from a boat on the canal" },
  name: "Ballard",
  path: "/ballard/",
  logName: "Ballard",
  point: { lat: 47.6598, lng: -122.3762 },
  rush: CANAL_RUSH,
  rulesOnHoliday: CANAL_HOLIDAYS,
  overnight: true,
  cameras: [
    {
      id: "south",
      label: "South end",
      url: `${SDOT_CAMS}15_W_Nickerson.jpg`,
      caption: "15th Ave W & W Nickerson St, looking north up the bridge approach.",
      alt: "SDOT traffic camera at 15th Ave W and W Nickerson St, looking north toward the Ballard Bridge",
    },
  ],
  photos: {
    "definitely-not": [
      {
        file: "ballard/definitely-not.jpg",
        alt: "A crowd around a streetcar and an early car on the Ballard Bridge, 1918",
        credit: `The first streetcar across, 1918. ${SMA}`,
      },
      {
        file: "ballard/definitely-not-2.jpg",
        alt: "Cars driving across the Ballard Bridge, 1941",
        credit: `Traffic crossing, 1941. ${SMA}`,
      },
    ],
    nope: [
      {
        file: "ballard/nope.jpg",
        alt: "The lowered Ballard Bridge seen from the water, 1918",
        credit: "The bridge from the water, March 13, 1918. James P. Lee, public domain.",
      },
    ],
    "probably-not": [
      {
        file: "ballard/probably-not.jpg",
        alt: "Fishing boats tied up beside the Ballard Bridge's timber trestle, 1936",
        credit: `Fishing boats beside the bridge, 1936. ${SMA}`,
      },
    ],
    maybe: [
      {
        file: "ballard/maybe.jpg",
        alt: "The tug Winona steaming toward the Ballard Bridge, around 1925",
        credit: "The tug Winona near the bridge, around 1925. Webster & Stevens, public domain.",
      },
    ],
    probably: [BALLARD_UP[0]],
    yep: BALLARD_UP,
    definitely: BALLARD_UP,
  },
};

const UNIVERSITY: Bridge = {
  id: "university",
  preview: { file: "og-university.jpg", alt: "The University Bridge raised with the gate down and a car waiting" },
  name: "University",
  path: "/university/",
  logName: "University",
  point: { lat: 47.6527, lng: -122.3204 },
  rush: CANAL_RUSH,
  rulesOnHoliday: CANAL_HOLIDAYS,
  overnight: true,
  cameras: [
    {
      id: "south",
      label: "South end",
      url: `${SDOT_CAMS}Eastlake_Fuhrman.jpg`,
      caption: "Eastlake Ave E & Fuhrman Ave E, looking north across the deck.",
      alt: "SDOT traffic camera at Eastlake Ave E and Fuhrman Ave E, looking north across the University Bridge deck",
    },
  ],
  photos: {
    "definitely-not": [
      {
        file: "university/definitely-not.jpg",
        alt: "Cars and a streetcar on the University Bridge, 1933",
        credit: `Traffic crossing, 1933. ${SMA}`,
      },
    ],
    nope: [
      {
        file: "university/nope.jpg",
        alt: "A rider on a white horse crossing the University Bridge's steel deck, 1933",
        credit: `Horses crossing, 1933. ${SMA}`,
      },
    ],
    "probably-not": [
      {
        file: "university/probably-not.jpg",
        alt: "The lowered University Bridge seen from Portage Bay, 1932",
        credit: `The bridge from the water, 1932. ${SMA}`,
      },
    ],
    maybe: [
      {
        file: "university/maybe.jpg",
        alt: "Rowboats gathered below the University Bridge on its opening day, 1919",
        credit: "Opening day on the water, 1919. Seattle Public Library, public domain.",
      },
    ],
    probably: [
      {
        file: "university/probably.jpg",
        alt: "The gears and counterweight works of the University Bridge, 1918",
        credit: "The lifting gears, September 18, 1918. James P. Lee, public domain.",
      },
    ],
    yep: [
      {
        file: "university/yep.jpg",
        alt: "A raised leaf of the University Bridge towering over a waiting car, around 1919",
        credit: "A raised leaf and a waiting car, around 1919. Seattle Public Library, public domain.",
      },
    ],
    definitely: [
      {
        file: "university/definitely.jpg",
        alt: "The University Bridge raised with the gate down and a car waiting, early 1980s",
        credit: `Raised with the gate down, early 1980s. ${SMA}`,
      },
    ],
  },
};

const MONTLAKE: Bridge = {
  id: "montlake",
  preview: { file: "og-montlake.jpg", alt: "A tug and a ship passing under the raised Montlake Bridge" },
  name: "Montlake",
  path: "/montlake/",
  logName: "Montlake",
  point: { lat: 47.6473, lng: -122.3046 },
  // 33 CFR 117.1051(e): longer closures, longer still outside summer
  // (April 30 to September 1), and none on any federal holiday.
  rush: (day) =>
    day.slice(5) >= "04-30" && day.slice(5) < "09-01"
      ? [
          [7 * 60, 9 * 60],
          [15 * 60 + 30, 18 * 60 + 30],
        ]
      : [
          [7 * 60, 10 * 60],
          [15 * 60 + 30, 19 * 60],
        ],
  // The rule also lists 6–6:30 PM, but that's inside the closure in every season.
  halfHourly: [
    [12 * 60 + 30, 15 * 60 + 30],
    [18 * 60, 18 * 60 + 30],
  ],
  rulesOnHoliday: () => false,
  overnight: false,
  cameras: [
    {
      id: "south",
      label: "South end",
      url: `${SDOT_CAMS}Montlake_E_Shelby_SWC.jpg`,
      caption: "Montlake Blvd E & E Shelby St, looking north at the gates and tower.",
      alt: "SDOT traffic camera at Montlake Blvd E and E Shelby St, looking north toward the Montlake Bridge",
    },
    {
      id: "north",
      label: "North end",
      url: `${SDOT_CAMS}Montlake_NE_Pacific_2.jpg`,
      caption: "Montlake Blvd NE & NE Pacific St, looking south at the tower.",
      alt: "SDOT traffic camera at Montlake Blvd NE and NE Pacific St, looking south toward the Montlake Bridge",
    },
  ],
  photos: {
    "definitely-not": [
      {
        file: "montlake/nope.jpg",
        alt: "The lowered Montlake Bridge and its two towers over the Montlake Cut, around 1925",
        credit: "The bridge over the Cut, around 1925. Webster & Stevens, public domain.",
      },
    ],
    nope: [
      {
        file: "montlake/nope.jpg",
        alt: "The lowered Montlake Bridge and its two towers over the Montlake Cut, around 1925",
        credit: "The bridge over the Cut, around 1925. Webster & Stevens, public domain.",
      },
    ],
    "probably-not": [
      {
        file: "montlake/probably-not.jpg",
        alt: "A tall ship and pleasure boats in the Montlake Cut, with the lowered bridge behind, 1951",
        credit: `Boats in the Montlake Cut, 1951. ${SMA}`,
      },
    ],
    maybe: [
      {
        file: "montlake/maybe.jpg",
        alt: "Portage Bay and the Montlake Bridge from Shelby Street, with a boat on the water, 1925",
        credit: "From Shelby Street, May 15, 1925. Asahel Curtis, public domain.",
      },
    ],
    probably: [
      {
        file: "montlake/probably.jpg",
        alt: "The Montlake Bridge's lifting mechanism under construction, 1924",
        credit: "The lifting mechanism, January 23, 1924. James P. Lee, public domain.",
      },
      {
        file: "montlake/probably-2.jpg",
        alt: "Workers servicing the Montlake Bridge's gears, 1953",
        credit: `Workers with the gears, 1953. ${SMA}`,
      },
    ],
    yep: [
      {
        file: "montlake/yep.jpg",
        alt: "A steamship passing under the raised Montlake Bridge, 1926",
        credit: "A ship passing under, 1926. Linkletter Studio, public domain.",
      },
    ],
    definitely: [
      {
        file: "montlake/definitely.jpg",
        alt: "A tug and a ship passing under the raised Montlake Bridge, 1934",
        credit: `A tug and ship passing under, 1934. ${SMA}`,
      },
    ],
  },
};

export const BRIDGES: Bridge[] = [FREMONT, BALLARD, UNIVERSITY, MONTLAKE];

/** The bridge for a URL path; anything unknown is Fremont. */
export function bridgeForPath(path: string): Bridge {
  const id = path.split("/").filter(Boolean)[0];
  return BRIDGES.find((b) => b.id === id) ?? FREMONT;
}

/** A moment's calendar, in Seattle. dow 0 = Sunday. */
export interface When {
  day: string; // YYYY-MM-DD
  dow: number;
  holiday?: string;
}

/** Whether the weekday rules (closures, half-hourly openings) are in force today. */
export const weekdayRules = (b: Bridge, w: When) =>
  w.dow >= 1 && w.dow <= 5 && !(w.holiday && !b.rulesOnHoliday(w.holiday));

/** Whether boats under 1,000 tons wait at this minute. */
export const isRushMinute = (b: Bridge, w: When, minute: number) =>
  weekdayRules(b, w) && b.rush(w.day).some(([s, e]) => minute >= s && minute < e);

/** Whether any part of this hour is a rush closure. */
export const isRushHour = (b: Bridge, w: When, hour: number) =>
  weekdayRules(b, w) && b.rush(w.day).some(([s, e]) => s < (hour + 1) * 60 && e > hour * 60);

/** Whether the bridge opens only on the hour and half hour at this minute. */
export const isHalfHourly = (b: Bridge, w: When, minute: number) =>
  weekdayRules(b, w) &&
  !isRushMinute(b, w, minute) &&
  (b.halfHourly ?? []).some(([s, e]) => minute >= s && minute < e);

// An opening takes about five minutes, plus a few for the span to settle and
// the logs to round; outside that stretch after :00 or :30 it's almost surely down.
const AFTER_SLOT_MINUTES = 8;
// Chosen so the half hour as a whole keeps about the same odds:
// 8/30 × 3.5 + 22/30 × 0.15 ≈ 1.
const IN_SLOT_RATIO = 3.5;
const OUT_OF_SLOT_RATIO = 0.15;

/** How a half-hourly schedule shifts the odds at this minute, if one is in force. */
export function scheduleFactor(b: Bridge, w: When, minute: number): (Factor & { ratio: number }) | undefined {
  if (!isHalfHourly(b, w, minute)) return undefined;
  const sinceSlot = minute % 30;
  if (sinceSlot < AFTER_SLOT_MINUTES)
    return { label: "Opens only at :00 and :30 now; one just started", ratio: IN_SLOT_RATIO };
  const next = minute + 30 - sinceSlot;
  const time = `${Math.floor(next / 60) % 12 || 12}:${String(next % 60).padStart(2, "0")}`;
  return { label: `Opens only at :00 and :30 now; next chance ${time}`, ratio: OUT_OF_SLOT_RATIO };
}

/** 11 PM to 7 AM, when SDOT's bridges open only by appointment. */
export const isOvernight = (b: Bridge, hour: number) => b.overnight && (hour >= 23 || hour < 7);
