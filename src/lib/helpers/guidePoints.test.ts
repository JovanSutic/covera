import { describe, expect, it } from "vitest";

import { guidePoints } from "./guidePoints";

describe("guidePoints", () => {
  it("returns a real array unchanged", () => {
    expect(guidePoints(["one", "two"])).toEqual(["one", "two"]);
  });

  it("recovers the numeric-keyed object the translate script writes", () => {
    // The exact shape `de`/`tr`/`sr-Latn` carried before step 2.2 — the regression this
    // helper exists to survive.
    expect(guidePoints({ "0": "one", "1": "two", "2": "three" })).toEqual([
      "one",
      "two",
      "three",
    ]);
  });

  it("orders numeric keys numerically, not lexically", () => {
    expect(guidePoints({ "2": "c", "10": "d", "0": "a" })).toEqual(["a", "c", "d"]);
  });

  it("drops non-string entries rather than rendering them", () => {
    expect(guidePoints(["one", 42, null, "two"])).toEqual(["one", "two"]);
  });

  it("returns an empty list for anything unusable", () => {
    expect(guidePoints(undefined)).toEqual([]);
    expect(guidePoints(null)).toEqual([]);
    expect(guidePoints("one")).toEqual([]);
    expect(guidePoints(7)).toEqual([]);
  });
});
