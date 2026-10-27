/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

/**
 * The main bundle budget, in gzipped bytes. Set from the baseline measured at the
 * end of phase 1 (docs/routing-performance-baseline.md, row 1) and lowered by the
 * phase-8 split. A PR that raises it fails `npm run perf:bundle` (R34/R19).
 */
const BUDGET_BYTES = 94208;

const DIST_ASSETS = path.join(process.cwd(), "dist", "assets");

function gzipSize(file: string): number {
  return zlib.gzipSync(fs.readFileSync(file)).length;
}

function main(): void {
  if (!fs.existsSync(DIST_ASSETS)) {
    console.error(
      `[perf:bundle] ${DIST_ASSETS} does not exist. Run "npx vite build" first ` +
        `(not "npm run build" — its prebuild hook calls the network).`,
    );
    process.exit(2);
  }

  const entries = fs
    .readdirSync(DIST_ASSETS)
    .filter((name) => name.endsWith(".js"))
    .map((name) => ({
      name,
      gzip: gzipSize(path.join(DIST_ASSETS, name)),
    }))
    .sort((a, b) => b.gzip - a.gzip);

  const main = entries.find((entry) => /^index-.*\.js$/.test(entry.name));

  if (!main) {
    console.error("[perf:bundle] no index-*.js entry chunk found in dist/assets.");
    process.exit(2);
  }

  console.log("[perf:bundle] largest chunks (gzip):");
  for (const entry of entries.slice(0, 5)) {
    console.log(`  ${entry.name}  ${(entry.gzip / 1024).toFixed(1)} KiB`);
  }

  const actualKib = main.gzip / 1024;
  const budgetKib = BUDGET_BYTES / 1024;

  if (main.gzip > BUDGET_BYTES) {
    console.error(
      `[perf:bundle] FAIL ${main.name} is ${actualKib.toFixed(1)} KiB gzip, ` +
        `budget is ${budgetKib.toFixed(1)} KiB. Move a heavy import out of the root, ` +
        `shell or route config (R19), or lower the budget deliberately in this file ` +
        `and say why in the PR.`,
    );
    process.exit(1);
  }

  console.log(
    `[perf:bundle] OK ${main.name} is ${actualKib.toFixed(1)} KiB gzip ` +
      `(budget ${budgetKib.toFixed(1)} KiB).`,
  );
}

main();
