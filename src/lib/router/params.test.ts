import { describe, expect, it } from "vitest";
import {
  areParamsValid,
  isValidParam,
  parseParam,
  parseParams,
  stringifyParam,
} from "./params";

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
