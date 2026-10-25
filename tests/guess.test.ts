import { describe, expect, it } from "vitest";
import { answerFor, guess, trafficRatio, type Traffic } from "../src/guess";

const flowing: Traffic = { currentSpeed: 24, freeFlowSpeed: 25, closed: false, confidence: 1 };
const stopped: Traffic = { currentSpeed: 2, freeFlowSpeed: 25, closed: false, confidence: 1 };

describe("guess", () => {
  it("uses the history alone when there's no live signal", () => {
    const g = guess({ baseRate: 0.05 });
    expect(g.probability).toBeCloseTo(0.05);
    expect(g.answer).toBe("Probably not.");
    expect(g.up).toBe(false);
  });

  it("says nope in a quiet hour with traffic flowing", () => {
    expect(guess({ baseRate: 0.02, traffic: flowing }).answer).toBe("Nope.");
  });

  it("flips to up when traffic stops and the viewer sees it waiting", () => {
    const g = guess({ baseRate: 0.06, traffic: stopped, camera: "waiting" });
    expect(g.up).toBe(true);
    expect(g.factors).toHaveLength(3);
  });

  it("trusts a viewer who sees cars crossing", () => {
    expect(guess({ baseRate: 0.2, traffic: stopped, camera: "moving" }).up).toBe(false);
  });

  it("says definitely only at the extremes", () => {
    expect(guess({ baseRate: 0.05, camera: "moving" }).level).toBe("definitely-not");
    expect(guess({ baseRate: 0.08, traffic: { ...stopped, closed: true }, camera: "waiting" }).level).toBe("definitely");
    expect(guess({ baseRate: 0.08 }).level).toBe("probably-not");
  });
});

describe("answerFor", () => {
  it("steps through the levels in order", () => {
    expect([0.001, 0.01, 0.1, 0.3, 0.6, 0.9, 0.99].map((p) => answerFor(p).level)).toEqual([
      "definitely-not",
      "nope",
      "probably-not",
      "maybe",
      "probably",
      "yep",
      "definitely",
    ]);
  });
});

describe("trafficRatio", () => {
  it("ignores low-confidence readings", () => {
    expect(trafficRatio({ ...stopped, confidence: 0.2 })).toBe(1);
  });

  it("treats a reported closure with stopped traffic as strong evidence", () => {
    expect(trafficRatio({ ...stopped, closed: true })).toBeGreaterThan(10);
  });

  it("ignores a closure flag while traffic is still moving", () => {
    expect(trafficRatio({ ...flowing, closed: true })).toBe(trafficRatio(flowing));
  });
});
