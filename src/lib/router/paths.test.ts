import { describe, expect, it } from "vitest";
import { buildPath, definePaths } from "./paths";

const paths = definePaths({
  root: { pattern: "/", requires: ["public"], params: {} },
  inspection: {
    pattern: "/inspection/:id",
    requires: ["public"],
    params: { id: "uuid" },
  },
  apartment: {
    pattern: "/host/apartments/:id",
    requires: ["public", "canOpenHost"],
    params: { id: "uuid" },
  },
  listing: {
    pattern: "/listing/:page",
    requires: ["public"],
    params: { page: "number" },
  },
  shots: {
    pattern: "/shots/:ids",
    requires: ["public"],
    params: { ids: "numbersList" },
  },
} as const);

const VALID_UUID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

describe("buildPath", () => {
  it("builds a pattern with no params from no argument", () => {
    expect(buildPath(paths.root)).toBe("/");
  });

  it("substitutes a uuid unchanged", () => {
    expect(buildPath(paths.inspection, { id: VALID_UUID })).toBe(
      `/inspection/${VALID_UUID}`,
    );
  });

  it("stringifies a number param", () => {
    expect(buildPath(paths.listing, { page: 3 })).toBe("/listing/3");
  });

  it("joins a numbersList with commas", () => {
    // `stringifyParam` joins with ","; react-router's `generatePath` then
    // percent-encodes it. "%2C" decodes back to "," on match, so this
    // round-trips — see the matchRoutes test in defineRoutes.test.ts.
    expect(buildPath(paths.shots, { ids: [1, 2, 3] })).toBe("/shots/1%2C2%2C3");
  });

  it("accepts a single-element numbersList", () => {
    expect(buildPath(paths.shots, { ids: [7] })).toBe("/shots/7");
  });

  it("keeps a multi-segment pattern intact", () => {
    expect(buildPath(paths.apartment, { id: VALID_UUID })).toBe(
      `/host/apartments/${VALID_UUID}`,
    );
  });
});

describe("definePaths", () => {
  it("preserves requires and pattern as literal types", () => {
    expect(paths.apartment.requires).toEqual(["public", "canOpenHost"]);
    expect(paths.apartment.pattern).toBe("/host/apartments/:id");
    expect(paths.apartment.params).toEqual({ id: "uuid" });
  });
});
