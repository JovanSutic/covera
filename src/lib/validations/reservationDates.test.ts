import { describe, expect, it } from "vitest";
import {
  ALTERNATIVE_DATE_MESSAGE_KEYS,
  alternativeDatesSchema,
  fromDatetimeLocalValue,
  isAfterDatetime,
  isFutureDatetime,
  toDatetimeLocalValue,
} from "./reservationDates";

const FUTURE = "2099-01-01T10:00";
const FUTURE_LATER = "2099-01-05T10:00";
const PAST = "2020-01-01T10:00";

/** The first issue's message, which is the i18n key the form renders. */
function firstMessage(result: ReturnType<typeof alternativeDatesSchema.safeParse>) {
  return result.success ? null : result.error.issues[0].message;
}

describe("the alternative-date rules", () => {
  it("accepts a complete, future-dated, correctly ordered pair", () => {
    const result = alternativeDatesSchema.safeParse({
      alternativeCheckInDatetime: FUTURE,
      alternativeCheckOutDatetime: FUTURE_LATER,
    });

    expect(result.success).toBe(true);
  });

  it("accepts the empty case, because clearing the fields is how an alternative is removed", () => {
    const result = alternativeDatesSchema.safeParse({
      alternativeCheckInDatetime: "",
      alternativeCheckOutDatetime: "",
    });

    expect(result.success).toBe(true);
  });

  it("rejects a past check-in with the future rule's key", () => {
    const result = alternativeDatesSchema.safeParse({
      alternativeCheckInDatetime: PAST,
      alternativeCheckOutDatetime: FUTURE_LATER,
    });

    expect(result.success).toBe(false);
    expect(firstMessage(result)).toBe(
      ALTERNATIVE_DATE_MESSAGE_KEYS.altCheckInFuture,
    );
  });

  it("rejects a past check-out with the future rule's key", () => {
    const result = alternativeDatesSchema.safeParse({
      alternativeCheckInDatetime: FUTURE,
      alternativeCheckOutDatetime: PAST,
    });

    expect(result.success).toBe(false);
    expect(firstMessage(result)).toBe(
      ALTERNATIVE_DATE_MESSAGE_KEYS.altCheckOutFuture,
    );
  });

  it("rejects a check-out at or before the check-in, pinned to the check-out field", () => {
    for (const checkOut of [FUTURE, "2098-12-31T10:00"]) {
      const result = alternativeDatesSchema.safeParse({
        alternativeCheckInDatetime: FUTURE,
        alternativeCheckOutDatetime: checkOut,
      });

      expect(result.success, checkOut).toBe(false);
      expect(result.success ? [] : result.error.issues.map((i) => i.path.join("."))).toEqual([
        "alternativeCheckOutDatetime",
      ]);
    }
  });

  it("accepts a lone field, because an incomplete pair cannot be ordered", () => {
    expect(
      alternativeDatesSchema.safeParse({
        alternativeCheckInDatetime: FUTURE,
        alternativeCheckOutDatetime: "",
      }).success,
    ).toBe(true);

    expect(
      alternativeDatesSchema.safeParse({
        alternativeCheckInDatetime: "",
        alternativeCheckOutDatetime: FUTURE_LATER,
      }).success,
    ).toBe(true);
  });
});

describe("the two datetime predicates", () => {
  it("isFutureDatetime rejects an unparseable value rather than passing it", () => {
    const now = Date.now();

    expect(isFutureDatetime("2099-01-01T10:00", now)).toBe(true);
    expect(isFutureDatetime("2020-01-01T10:00", now)).toBe(false);
    expect(isFutureDatetime("not-a-date", now)).toBe(false);
    expect(isFutureDatetime("", now)).toBe(false);
  });

  it("isAfterDatetime is strict, and false for anything unparseable", () => {
    expect(isAfterDatetime(FUTURE_LATER, FUTURE)).toBe(true);
    expect(isAfterDatetime(FUTURE, FUTURE)).toBe(false);
    expect(isAfterDatetime(FUTURE, FUTURE_LATER)).toBe(false);
    expect(isAfterDatetime("nonsense", FUTURE)).toBe(false);
    expect(isAfterDatetime(FUTURE, "nonsense")).toBe(false);
  });
});

describe("the datetime-local conversion round-trips the instant", () => {
  it("converts an ISO instant to a local datetime-local value and back", () => {
    const iso = "2026-09-01T14:00:00.000Z";

    const local = toDatetimeLocalValue(iso);

    // 16 characters, zone-less: exactly what the input element accepts.
    expect(local).toHaveLength(16);
    expect(local).not.toContain("Z");

    // The round trip returns the SAME instant, which is the property that matters;
    // the intermediate string is deliberately local and will differ by timezone.
    expect(fromDatetimeLocalValue(local)).toBe(iso);
  });

  it("maps a missing or corrupt instant to the empty value, never a crash", () => {
    expect(toDatetimeLocalValue(null)).toBe("");
    expect(toDatetimeLocalValue(undefined)).toBe("");
    expect(toDatetimeLocalValue("")).toBe("");
    expect(toDatetimeLocalValue("not-a-date")).toBe("");

    expect(fromDatetimeLocalValue("")).toBeNull();
    expect(fromDatetimeLocalValue(undefined)).toBeNull();
    expect(fromDatetimeLocalValue("not-a-date")).toBeNull();
  });
});
