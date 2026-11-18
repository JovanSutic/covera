import { describe, expect, it } from "vitest";

import { withLang } from "./lang";

describe("withLang", () => {
  it("omits the default language", () => {
    expect(withLang("/host/dashboard", "en")).toBe("/host/dashboard");
  });

  it("appends a supported language", () => {
    expect(withLang("/host/dashboard", "de")).toBe("/host/dashboard?lang=de");
  });

  it("appends a hyphenated language", () => {
    expect(withLang("/host/dashboard", "sr-Latn")).toBe(
      "/host/dashboard?lang=sr-Latn",
    );
  });

  it("preserves an existing query", () => {
    expect(withLang("/listing?page=3", "tr")).toBe("/listing?page=3&lang=tr");
  });

  it("keeps a hash at the end", () => {
    expect(withLang("/host/dashboard#claims", "de")).toBe(
      "/host/dashboard?lang=de#claims",
    );
  });

  it("ignores an unsupported language", () => {
    expect(withLang("/host/dashboard", "fr")).toBe("/host/dashboard");
  });
});
