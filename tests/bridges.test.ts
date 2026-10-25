import { describe, expect, it } from "vitest";
import {
  BRIDGES,
  bridgeForPath,
  isHalfHourly,
  isOvernight,
  isRushHour,
  isRushMinute,
  scheduleFactor,
  type When,
} from "../src/bridges";
import { holidayOn } from "../src/holidays";

const byId = (id: string) => BRIDGES.find((b) => b.id === id)!;
const fremont = byId("fremont");
const montlake = byId("montlake");

// Real 2026 dates, so weekday and holiday line up.
const tue = (day: string): When => ({ day, dow: 2, holiday: holidayOn(day) });
const OCT_TUE = tue("2026-10-20");
const JUL_TUE = tue("2026-07-21");
const MON = (day: string): When => ({ day, dow: 1, holiday: holidayOn(day) });
const at = (h: number, m = 0) => h * 60 + m;

describe("bridgeForPath", () => {
  it("maps paths to bridges, with Fremont at the root and as the fallback", () => {
    expect(bridgeForPath("/").id).toBe("fremont");
    expect(bridgeForPath("/ballard").id).toBe("ballard");
    expect(bridgeForPath("/ballard/").id).toBe("ballard"); // older links had a trailing slash
    expect(bridgeForPath("/university").id).toBe("university");
    expect(bridgeForPath("/nowhere/").id).toBe("fremont");
  });
});

describe("rush closures", () => {
  it("cover 7–9 AM and 4–6 PM on weekdays for the SDOT canal bridges", () => {
    expect(isRushHour(fremont, OCT_TUE, 7)).toBe(true);
    expect(isRushHour(fremont, OCT_TUE, 9)).toBe(false);
    expect(isRushHour(fremont, OCT_TUE, 17)).toBe(true);
    expect(isRushHour(fremont, { day: "2026-10-24", dow: 6 }, 17)).toBe(false);
  });

  it("run longer on Montlake outside summer (April 30 to September 1)", () => {
    expect(isRushMinute(montlake, OCT_TUE, at(9, 30))).toBe(true);
    expect(isRushMinute(montlake, JUL_TUE, at(9, 30))).toBe(false);
    expect(isRushMinute(montlake, JUL_TUE, at(15, 15))).toBe(false);
    expect(isRushMinute(montlake, JUL_TUE, at(15, 45))).toBe(true);
    expect(isRushHour(montlake, JUL_TUE, 15)).toBe(true); // the 3 PM hour is partly closed
    expect(isRushMinute(montlake, tue("2026-04-28"), at(9, 30))).toBe(true); // April 28: still winter hours
  });
});

describe("federal holidays", () => {
  it("knows the observed dates", () => {
    expect(holidayOn("2026-11-26")).toBe("Thanksgiving");
    expect(holidayOn("2026-10-12")).toBe("Columbus Day");
    expect(holidayOn("2026-07-03")).toBe("Independence Day"); // July 4 is a Saturday
    expect(holidayOn("2026-05-25")).toBe("Memorial Day");
    expect(holidayOn("2022-12-26")).toBe("Christmas Day"); // Christmas on a Sunday
    expect(holidayOn("2021-12-31")).toBe("New Year's Day"); // Jan 1, 2022 was a Saturday
    expect(holidayOn("2026-10-20")).toBeUndefined();
  });

  it("lift the canal closures, except Columbus Day for SDOT's bridges", () => {
    const memorial = MON("2026-05-25");
    const columbus = MON("2026-10-12");
    expect(isRushHour(fremont, memorial, 8)).toBe(false);
    expect(isRushHour(fremont, columbus, 8)).toBe(true);
    expect(isRushHour(montlake, columbus, 8)).toBe(false);
  });
});

describe("Montlake's half-hourly openings", () => {
  it("apply 12:30–3:30 PM on weekdays but not on holidays or weekends", () => {
    expect(isHalfHourly(montlake, OCT_TUE, at(13, 10))).toBe(true);
    expect(isHalfHourly(montlake, OCT_TUE, at(12, 10))).toBe(false);
    expect(isHalfHourly(montlake, OCT_TUE, at(15, 40))).toBe(false); // the closure has started
    expect(isHalfHourly(montlake, MON("2026-10-12"), at(13, 10))).toBe(false); // Columbus Day
    expect(isHalfHourly(fremont, OCT_TUE, at(13, 10))).toBe(false);
  });

  it("raise the odds just after :00 and :30 and lower them otherwise", () => {
    expect(scheduleFactor(montlake, OCT_TUE, at(13, 32))!.ratio).toBeGreaterThan(1);
    const later = scheduleFactor(montlake, OCT_TUE, at(13, 12))!;
    expect(later.ratio).toBeLessThan(1);
    expect(later.label).toContain("next chance 1:30");
    expect(scheduleFactor(montlake, OCT_TUE, at(10, 30))).toBeUndefined();
  });
});

describe("overnight", () => {
  it("applies to SDOT's bridges but not Montlake", () => {
    expect(isOvernight(fremont, 23)).toBe(true);
    expect(isOvernight(fremont, 7)).toBe(false);
    expect(isOvernight(montlake, 23)).toBe(false);
  });
});

describe("bridge config", () => {
  it("gives every bridge at least one camera and a photo for every answer", () => {
    for (const b of BRIDGES) {
      expect(b.cameras.length).toBeGreaterThan(0);
      for (const list of Object.values(b.photos)) expect(list.length).toBeGreaterThan(0);
    }
  });
});
