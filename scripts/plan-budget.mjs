#!/usr/bin/env node
/**
 * Plan budget check for a feature-kickoff plan directory.
 *
 *   node scripts/plan-budget.mjs docs/<feature>/00-index.md docs/<feature>/p*.md
 *
 * Prints per-file lines, fenced-code lines, and the code share, then a TOTAL line
 * with the only two numbers that actually separated a good plan from a runaway one:
 * total directory lines, and the largest single fenced block.
 *
 * Calibration: two real plans in this repo were measured.
 *   docs/inspection-guide-upgrade/  6 files, 2,596 lines, 55% code, 191-line block  -> ok
 *   docs/incident-claims/          10 files, 8,820 lines, 76% code, 374-line block  -> OVER
 * Total size separated them 3.3x; the code SHARE separated them only 1.4x, so the
 * share is reported as advisory and never decides the verdict.
 *
 * Fence-aware and CRLF-safe: reading fences with a /```lang\n/ regex scores every
 * CRLF file as 0% code, which is how the first draft of this check passed a
 * pathological plan and failed a good one.
 */
import { readFileSync } from "node:fs";

const FILE_SOFT = 400; // a phase file the executor loads comfortably
const FILE_HARD = 1000; // a phase file that is really a module
const TOTAL_LINES = 4000; // the directory is ~1.5x the acceptable plan and climbing
const BLOCK = 250; // a step carrying a module, not a step

const argv = process.argv.slice(2);
if (argv.length === 0) {
  console.error("usage: node scripts/plan-budget.mjs docs/<feature>/00-index.md docs/<feature>/p*.md");
  process.exit(2);
}

let total = 0;
let code = 0;
let largest = 0;

for (const path of argv) {
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  let inFence = false;
  let fileCode = 0;
  let run = 0;
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      if (inFence) {
        if (run > largest) largest = run;
        run = 0;
      }
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      fileCode++;
      run++;
    }
  }
  if (run > largest) largest = run;

  total += lines.length;
  code += fileCode;
  const share = Math.round((fileCode / lines.length) * 100);
  const note =
    lines.length > FILE_HARD
      ? "  OVER (hard)"
      : lines.length > FILE_SOFT
        ? "  (over soft 400)"
        : "";
  console.log(
    path.padEnd(34),
    "lines",
    String(lines.length).padStart(5),
    "code",
    String(fileCode).padStart(4),
    `${share}%`,
    note,
  );
}

const over = total > TOTAL_LINES || largest > BLOCK;
console.log(
  "TOTAL files",
  argv.length,
  "lines",
  total,
  `(limit ${TOTAL_LINES})`,
  "code",
  `${Math.round((code / total) * 100)}% (advisory)`,
  "largest block",
  largest,
  `(limit ${BLOCK})`,
  over ? " <-- OVER" : " ok",
);
process.exit(over ? 1 : 0);
