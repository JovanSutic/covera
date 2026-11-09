import { describe, expect, it } from "vitest";
import {
  areParamsValid,
  isValidParam,
  parseParam,
  parseParams,
  stringifyParam,
} from "./params";
import { appPaths } from "./paths";

const VALID_UUID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

describe("isValidParam", () => {
  it.each([
    ["number", "42", true],
    ["number", "0", true],
    ["number", "-1", false],
    ["number", "4.2", false],
    ["number", "abc", false],
    ["number", "9007199254740993", false],
    ["uuid", VALID_UUID, true],
    ["uuid", VALID_UUID.toUpperCase(), true],
    ["uuid", "not-a-uuid", false],
    ["uuid", `${VALID_UUID}-extra`, false],
    ["numbersList", "1", true],
    ["numbersList", "1,2,3", true],
    ["numbersList", "1,,2", false],
    ["numbersList", "a,b", false],
    ["name", "apt-1_alpha", true],
    ["name", "has space", false],
  ] as const)("%s %s → %s", (type, value, expected) => {
    expect(isValidParam(value, type)).toBe(expected);
  });

  it("accepts only listed members of a oneOf declaration", () => {
    const type = { oneOf: ["reservations", "assets"] } as const;

    expect(isValidParam("assets", type)).toBe(true);
    expect(isValidParam("users", type)).toBe(false);
  });
});

describe("parseParam and stringifyParam", () => {
  it("round-trips a number", () => {
    expect(stringifyParam(parseParam("42", "number"), "number")).toBe("42");
  });

  it("round-trips a numbersList", () => {
    expect(parseParam("1,2,3", "numbersList")).toEqual([1, 2, 3]);
    expect(stringifyParam([1, 2, 3], "numbersList")).toBe("1,2,3");
  });

  it("round-trips a uuid unchanged", () => {
    expect(stringifyParam(parseParam(VALID_UUID, "uuid"), "uuid")).toBe(VALID_UUID);
  });

  it("parses a oneOf member as the string itself", () => {
    expect(parseParam("assets", { oneOf: ["assets"] })).toBe("assets");
  });
});

describe("areParamsValid", () => {
  it("is true when every declared param is present and valid", () => {
    expect(areParamsValid({ id: VALID_UUID }, { id: "uuid" })).toBe(true);
  });

  it("is false when a declared param is absent", () => {
    expect(areParamsValid({}, { id: "uuid" })).toBe(false);
  });

  it("is false when any one param is invalid", () => {
    expect(areParamsValid({ id: VALID_UUID, page: "x" }, { id: "uuid", page: "number" })).toBe(
      false,
    );
  });

  it("is true for an empty declaration", () => {
    expect(areParamsValid({}, {})).toBe(true);
  });
});

describe("parseParams", () => {
  it("returns only the declared params, parsed", () => {
    expect(parseParams({ id: VALID_UUID, extra: "ignored" }, { id: "uuid" })).toEqual({
      id: VALID_UUID,
    });
  });

  it("omits an absent param rather than inventing one", () => {
    expect(parseParams({}, { id: "uuid" })).toEqual({});
  });
});

describe("hex32 — the field-link token's param type (D6)", () => {
  const VALID_TOKEN = "0123456789abcdef0123456789abcdef";

  it("accepts exactly 32 hex characters, in either case", () => {
    expect(isValidParam(VALID_TOKEN, "hex32")).toBe(true);
    expect(isValidParam(VALID_TOKEN.toUpperCase(), "hex32")).toBe(true);
  });

  it("rejects 31 and 33 characters", () => {
    expect(isValidParam(VALID_TOKEN.slice(0, 31), "hex32")).toBe(false);
    expect(isValidParam(`${VALID_TOKEN}0`, "hex32")).toBe(false);
  });

  it("rejects a hyphenated uuid — the token is a STRIPPED uuid, not a uuid", () => {
    expect(isValidParam(VALID_UUID, "hex32")).toBe(false);
    expect(isValidParam(VALID_UUID.replace(/-/g, ""), "hex32")).toBe(true);
  });

  it("rejects the shapes 'name' would have accepted", () => {
    // D6/R8: this is the whole reason the type exists. `"name"` is /^[\w.-]+$/, so
    // every one of these is a valid `name` — and each would reach the API and fail
    // as a network error instead of the router's 404.
    for (const value of ["not-a-token", "abcdefg", "0123456789abcdef0123456789abcdeg", "has space"]) {
      expect(isValidParam(value, "hex32"), value).toBe(false);
    }
    // The three that `"name"` accepts; `"has space"` is not one of them — the table
    // above already pins `["name", "has space", false]`.
    for (const value of ["not-a-token", "abcdefg", "0123456789abcdef0123456789abcdeg"]) {
      expect(isValidParam(value, "name"), value).toBe(true);
    }
  });

  it("parses as the string it already is", () => {
    expect(parseParam(VALID_TOKEN, "hex32")).toBe(VALID_TOKEN);
  });

  it("stringifies unchanged, so buildPath round-trips the token", () => {
    expect(stringifyParam(parseParam(VALID_TOKEN, "hex32"), "hex32")).toBe(VALID_TOKEN);
    expect(stringifyParam(VALID_TOKEN, "hex32")).toBe(VALID_TOKEN);
  });

  it("is the type the field route actually declares", () => {
    // The wiring, not the rule: a type that exists but is not applied to the route
    // is the failure mode this asserts against.
    expect(appPaths.fieldIncident.params).toEqual({ token: "hex32" });
    expect(appPaths.fieldIncident.pattern).toBe("/field/incident/:token");
    expect(appPaths.incidentClaim.pattern).toBe(
      "/host/apartments/:id/reservations/:reservationId/incident",
    );
    expect(appPaths.incidentClaim.params).toEqual({ id: "uuid", reservationId: "uuid" });
  });
});
