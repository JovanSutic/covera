import { describe, expect, it } from "vitest";

import {
  DEFAULT_CURRENCY,
  claimTotals,
  formatCents,
  parseCentsFromInput,
} from "./claimMoney";

describe("formatCents", () => {
  it("renders zero rather than an empty string", () => {
    expect(formatCents(0)).not.toBe("");
    expect(formatCents(0)).toContain("0");
  });

  it("divides by a hundred — the value is cents, not euros", () => {
    // The assertion is on the digits, not the currency symbol or the grouping
    // separator: those are locale-dependent and Intl.NumberFormat owns them.
    expect(formatCents(12345).replace(/\D/g, "")).toContain("12345");
    expect(formatCents(12345)).toContain("123");
  });

  it("groups thousands", () => {
    // The grouping separator is U+00A0 or U+202F, written as escapes because
    // eslint rejects the literal characters even inside a regex literal. Same
    // three characters the plan names.
    expect(formatCents(1234567)).toMatch(/12[.,\u00A0\u202F]345/);
  });

  it("honours an explicit currency", () => {
    expect(formatCents(1000, "USD")).toContain("$");
  });

  it("defaults to EUR", () => {
    expect(formatCents(1000)).toContain("€");
    expect(DEFAULT_CURRENCY).toBe("EUR");
  });

  it("returns an empty string for a non-finite value rather than throwing", () => {
    expect(formatCents(Number.NaN)).toBe("");
  });
});

describe("claimTotals", () => {
  it("sums the items", () => {
    expect(
      claimTotals({ finalPayoutRequestedCents: 0 }, [
        { estimatedPlaceholderValueCents: 5000 },
        { estimatedPlaceholderValueCents: 2500 },
      ]),
    ).toEqual({
      itemsSubtotalCents: 7500,
      requestedCents: 7500,
      hasFinalFigure: false,
    });
  });

  it("is zero on a claim with no items", () => {
    expect(claimTotals({ finalPayoutRequestedCents: 0 }, [])).toEqual({
      itemsSubtotalCents: 0,
      requestedCents: 0,
      hasFinalFigure: false,
    });
  });

  it("prefers the filed figure once the host has set one", () => {
    expect(
      claimTotals({ finalPayoutRequestedCents: 9000 }, [
        { estimatedPlaceholderValueCents: 5000 },
      ]),
    ).toEqual({
      itemsSubtotalCents: 5000,
      requestedCents: 9000,
      hasFinalFigure: true,
    });
  });

  it("treats a missing item value as zero rather than as NaN", () => {
    const totals = claimTotals({ finalPayoutRequestedCents: 0 }, [
      { estimatedPlaceholderValueCents: undefined as unknown as number },
      { estimatedPlaceholderValueCents: 1000 },
    ]);

    expect(totals.itemsSubtotalCents).toBe(1000);
  });
});

describe("parseCentsFromInput", () => {
  it("parses a dot decimal", () => {
    expect(parseCentsFromInput("12.34")).toBe(1234);
  });

  it("parses a comma decimal, which is what de, tr and sr-Latn users type", () => {
    expect(parseCentsFromInput("12,34")).toBe(1234);
  });

  it("parses a whole number", () => {
    expect(parseCentsFromInput("250")).toBe(25000);
  });

  it("rounds to whole cents rather than carrying a fraction", () => {
    expect(parseCentsFromInput("1.005")).toBe(101);
  });

  it("returns null for empty input — 'not said yet' is not 'zero'", () => {
    expect(parseCentsFromInput("")).toBeNull();
    expect(parseCentsFromInput("   ")).toBeNull();
  });

  it("returns null for anything that is not a positive amount", () => {
    expect(parseCentsFromInput("abc")).toBeNull();
    expect(parseCentsFromInput("-5")).toBeNull();
  });
});
