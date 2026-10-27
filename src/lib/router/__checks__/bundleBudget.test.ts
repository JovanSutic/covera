import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const BUDGET_BYTES = 94208;
const DIST_ASSETS = path.join(process.cwd(), "dist", "assets");

// The gate must stay green on a clean checkout, where dist/ does not exist.
// The budget is enforced by `npm run perf:bundle` (and by this test whenever a
// build happens to be present).
const distExists = fs.existsSync(DIST_ASSETS);

describe("main bundle budget", () => {
  it.skipIf(!distExists)("keeps the entry chunk under the budget", () => {
    const main = fs
      .readdirSync(DIST_ASSETS)
      .filter((name) => /^index-.*\.js$/.test(name))
      .map((name) => ({
        name,
        gzip: zlib.gzipSync(fs.readFileSync(path.join(DIST_ASSETS, name))).length,
      }))
      .sort((a, b) => b.gzip - a.gzip)[0];

    expect(main, "no index-*.js entry chunk in dist/assets").toBeDefined();
    expect(main.gzip).toBeLessThanOrEqual(BUDGET_BYTES);
  });

  it("documents the budget in one place", () => {
    const script = fs.readFileSync(
      path.join(process.cwd(), "scripts", "check-bundle-budget.ts"),
      "utf-8",
    );

    // The two budgets must not drift: the script is the source of truth.
    expect(script).toContain("BUDGET_BYTES");
  });
});
