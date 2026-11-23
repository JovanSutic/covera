import { describe, expect, it } from "vitest";

import { absoluteUrl } from "./absoluteUrl";

describe("absoluteUrl", () => {
  it("prefixes an app-relative path with the origin", () => {
    expect(absoluteUrl("/inspection/abc", "https://app.covera.test")).toBe(
      "https://app.covera.test/inspection/abc",
    );
  });

  it("preserves a query string", () => {
    expect(absoluteUrl("/inspection/abc?lang=de", "https://app.covera.test")).toBe(
      "https://app.covera.test/inspection/abc?lang=de",
    );
  });

  it("does not double the slash when the origin ends with one", () => {
    expect(absoluteUrl("/inspection/abc", "https://app.covera.test/")).toBe(
      "https://app.covera.test/inspection/abc",
    );
  });

  it("adds the leading slash when the path lacks one", () => {
    expect(absoluteUrl("inspection/abc", "https://app.covera.test")).toBe(
      "https://app.covera.test/inspection/abc",
    );
  });

  it("leaves an already-absolute URL alone", () => {
    expect(absoluteUrl("https://other.test/x", "https://app.covera.test")).toBe(
      "https://other.test/x",
    );
    expect(absoluteUrl("http://other.test/x", "https://app.covera.test")).toBe(
      "http://other.test/x",
    );
  });
});