import { describe, expect, it } from "vitest";
import { BRIDGES, bridgeForPath, isOvernight, isRushHour, isRushMinute } from "../src/bridges";

const byId = (id: string) => BRIDGES.find((b) => b.id === id)!;
const fremont = byId("fremont");
const montlake = byId("montlake");

describe("bridgeForPath", () => {
  it("maps paths to bridges, with Fremont at the root and as the fallback", () => {
    expect(bridgeForPath("/").id).toBe("fremont");
    expect(bridgeForPath("/ballard/").id).toBe("ballard");
    expect(bridgeForPath("/university").id).toBe("university");
    expect(bridgeForPath("/nowhere/").id).toBe("fremont");
  });
});

describe("rush closures", () => {
  it("cover 7–9 AM and 4–6 PM on weekdays for the SDOT canal bridges", () => {
    expect(isRushHour(fremont, 2, 7, 10)).toBe(true);
    expect(isRushHour(fremont, 2, 9, 10)).toBe(false);
    expect(isRushHour(fremont, 5, 17, 10)).toBe(true);
    expect(isRushHour(fremont, 6, 17, 10)).toBe(false);
  });

  it("run longer on Montlake outside summer", () => {
    expect(isRushMinute(montlake, 2, 9 * 60 + 30, 10)).toBe(true); // 9:30 AM in October
    expect(isRushMinute(montlake, 2, 9 * 60 + 30, 7)).toBe(false); // 9:30 AM in July
    expect(isRushMinute(montlake, 2, 15 * 60 + 15, 7)).toBe(false); // 3:15 PM
    expect(isRushMinute(montlake, 2, 15 * 60 + 45, 7)).toBe(true); // 3:45 PM
    expect(isRushHour(montlake, 2, 15, 7)).toBe(true); // the 3 PM hour partly closed
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
