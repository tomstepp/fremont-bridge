import { describe, expect, it } from "vitest";
import { blend, hourlyShares, season, seasonDays, toOpenings } from "../src/season";

describe("seasonDays", () => {
  it("picks the same weekday: four recent weeks and five around last year's date", () => {
    const d = seasonDays("2026-10-25"); // a Sunday
    expect(d.recent).toEqual(["2026-10-18", "2026-10-11", "2026-10-04", "2026-09-27"]);
    expect(d.lastYear).toEqual(["2025-10-12", "2025-10-19", "2025-10-26", "2025-11-02", "2025-11-09"]);
    for (const day of [...d.recent, ...d.lastYear]) expect(new Date(`${day}T12:00:00Z`).getUTCDay()).toBe(0);
  });
});

describe("toOpenings", () => {
  it("merges an opening logged as several pairs", () => {
    const o = toOpenings([
      { opendatetime: "2026-10-18T14:05:00.000", closedatetime: "2026-10-18T14:07:00.000" },
      { opendatetime: "2026-10-18T14:08:00.000", closedatetime: "2026-10-18T14:11:00.000" },
      { opendatetime: "2026-10-18T16:00:00.000", closedatetime: "2026-10-18T16:04:00.000" },
    ]);
    expect(o).toEqual([
      { day: "2026-10-18", start: 14 * 60 + 5, minutes: 6 },
      { day: "2026-10-18", start: 16 * 60, minutes: 4 },
    ]);
  });

  it("caps glitched hours-long openings", () => {
    const [o] = toOpenings([{ opendatetime: "2026-10-18T01:00:00.000", closedatetime: "2026-10-18T09:00:00.000" }]);
    expect(o.minutes).toBe(30);
  });
});

describe("hourlyShares", () => {
  it("splits an opening across the hour boundary", () => {
    const s = hourlyShares([{ day: "x", start: 14 * 60 + 57, minutes: 6 }], 1);
    expect(s[14]).toBeCloseTo(3 / 60);
    expect(s[15]).toBeCloseTo(3 / 60);
  });
});

describe("blend", () => {
  it("leans on the season more as more days are logged", () => {
    const season = new Array(24).fill(0.1);
    const year = new Array(24).fill(0.04);
    expect(blend(season, year, 9)[12]).toBeCloseTo(0.076); // 60% season
    expect(blend(season, year, 0)[12]).toBeCloseTo(0.04);
  });
});

describe("season", () => {
  it("counts only days SDOT logged and reports per-day stats", () => {
    const days = seasonDays("2026-10-25");
    const openings = [
      { day: "2026-10-18", start: 840, minutes: 5 },
      { day: "2026-10-18", start: 900, minutes: 7 },
      { day: "2025-10-19", start: 840, minutes: 4 },
    ];
    const { stats } = season(openings, days, new Array(24).fill(0));
    expect(stats).toEqual({ recentDays: 1, lastYearDays: 1, recentPerDay: 2, lastYearPerDay: 1, medianMinutes: 5 });
  });
});
