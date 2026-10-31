import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const LOCALES = ["en", "de", "tr", "sr-Latn"] as const;
const NAMESPACES = ["assets", "guest", "general", "host"] as const;

function flatten(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object") return prefix ? [prefix] : [];

  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    flatten(child, prefix ? `${prefix}.${key}` : key),
  );
}

function keysOf(locale: string, namespace: string): Set<string> {
  const file = path.join(process.cwd(), "public", "locales", locale, `${namespace}.json`);

  return new Set(flatten(JSON.parse(fs.readFileSync(file, "utf8"))));
}

describe("locale key parity", () => {
  // The check is only worth anything if it can see the files it claims to read.
  it("reads a key set from every locale file", () => {
    for (const locale of LOCALES) {
      for (const namespace of NAMESPACES) {
        const keys = keysOf(locale, namespace);
        expect(keys.size, `${locale}/${namespace}`).toBeGreaterThan(0);
      }
    }
  });

  for (const namespace of NAMESPACES) {
    for (const locale of LOCALES.filter((value) => value !== "en")) {
      it(`every '${namespace}' key in en exists in ${locale}`, () => {
        const english = keysOf("en", namespace);
        const translated = keysOf(locale, namespace);

        // Extra keys in a translation are dead weight, not a runtime failure —
        // `assets` carries nine of them and always has. Only MISSING keys render
        // raw strings to a user, so only those fail.
        expect([...english].filter((key) => !translated.has(key))).toEqual([]);
      });
    }
  }
});
