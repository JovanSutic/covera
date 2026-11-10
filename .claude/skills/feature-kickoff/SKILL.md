---
name: feature-kickoff
description: Start-of-feature process for the covera frontend (Vite + React 19 SPA). Turns a prose feature intent into a decisions-locked spec, per-phase plan files, and an executable gate BEFORE any implementation. Invoke when the user describes a feature or refactor to build, asks for a plan or spec, or says "kick off", "spec out", "plan feature X", "start feature X".
---

# Feature kickoff — spec before code

This process is inherited from a post-mortem on the `covera-hono` error-handling migration: the
planning was cheap and excellent, the *execution* was not, and almost every wasted dollar came from
a decision left open until execution time or a verification step that was prose instead of a
command. The lessons transfer. **The specifics do not** — the evidence and file paths below have
been re-derived for this repo. Where a rule cites history, it is the other repo's history.

Read this whole file once at the start of a feature. Do not re-read it per phase.

---

## The cost model (why the process is shaped this way)

| What | Cost | Why |
| --- | --- | --- |
| Deciding something while writing the plan | ~free | no code, no context churn |
| Deciding it during execution | a full round trip | user must answer, context must be re-sent |
| Prose verification ("Accept: the screen looks right") | a full check pass later | it is unverifiable, so it defers to review |
| Executable verification (`npm run gate`) | ~free | fails loudly at the step that broke it |
| A monolith plan file | per-step re-reads | you cannot cheaply load 2,800 lines |

Two rules follow, and they are not negotiable:

1. **Every decision is closed before execution starts.** If the plan says "either X or Y — decide
   when you get there", the plan is not done.
2. **Every acceptance criterion is a command.** If it cannot be run, it is not a criterion.

### Nothing here is guarding you

`covera-hono` had `.husky/pre-commit` re-running the suite on every commit. **This repo has no
husky, no git hooks, and no CI.** Nothing runs a check unless a human or an agent types it.

That inverts one conclusion from the original post-mortem: per-step commits are *not* expensive
here, so there is no technical reason to batch commits. But it makes the gate **more** load-bearing,
not less — it is the only thing standing between a broken branch and `main`. Run it.

The other consequence: a red gate is now a *silent* red gate. Nothing will tell you. When a phase
ends, run the gate before moving on.

---

## Budgets, and the stop condition

Planning is the one stage with no compiler and no test suite, so nothing stops it on its own. It
will happily run all afternoon producing a better plan than the code needs. **The budget below is
the stop condition.** When the plan meets it and the decisions are closed, planning is **done** —
stop, and hand off. A plan that is 10% better than an adequate one and 3× the cost is a loss.

The evidence is our own. The `feature/46_incident-page` kickoff on **2026-11-08** ran **2,459
assistant turns, 4.01M output tokens, 1,827 tool calls (251 of them edits) to produce a
368K-character plan directory and zero lines of `src/`.** The comparable feature a week earlier
(`feature/50_inspection-guide-upgrade`, same repo, same skill, a similar flow) came in at
**110K characters — 3.3× smaller** — and was executed and shipped. The runaway run also wrote
**938K characters into `docs/` for a 368K-character artifact** (a 2.6× rewrite amplification), made
127 exactly-repeated tool calls, and planned nine phases in full while five of them could not be
verified against a backend that was answering 500.

**Note what did *not* separate the two runs.** The share of the plan that was code was **55% in the
acceptable run and 76% in the runaway** — a 1.4× difference. The discriminating metric was
**total size, at 3.3×**. Calibrate to size first: an adequate plan with a lot of code in it is fine,
and a runaway plan with elegant thin phases is not. The limits below are set from those two data
points.

| Limit | Budget | Why this number |
| --- | --- | --- |
| **Whole plan directory** | **≤ 150K characters, and ≤ 4,000 lines** | the acceptable plan was 110K chars / 2,596 lines; the runaway was 368K / 8,820 (3.3×) |
| **One phase file** | **≤ 400 lines (hard stop at 1,000)** | the executor loads it whole; the acceptable run's worst was 907 and was already uncomfortable |
| **Verbatim code, per phase file** | **logic phase ≤ 130 lines, surface phase ≤ 40** | a phase whose code exceeds this is really two phases — see §"What goes in a `Do` block" |
| **Any single fenced block** | **≤ 250 lines** | above this it is a module, not a step, and the executor should write it |
| **Phase file count** | **5–9** | the acceptable run used 6; 15 means the phases are too big, not that the doc should be split |
| **Reads of any one source file** | **2** (the spec and `00-index.md`: **1**) | beyond that you are re-reading, not verifying |
| **In-place edits to one plan file** | **3**, and never a file over 300 lines | each edit re-sends the file; the runaway run's p9 took 54 |
| **Phases planned against an unverifiable backend** | **0** | plan the backend-independent slice and say the rest is blocked — see §"What to do when the backend is not ready" |

Run this before you call Stage 5 done. It is the gate for the plan itself, and it **exists as a
script** — do not retype it as an inline `node -e` one-liner, which is how the first draft of this
check shipped broken:

```bash
node scripts/plan-budget.mjs docs/<feature>/00-index.md docs/<feature>/p*.md
```

It exits non-zero when the plan is over budget, so it can gate a stage the same way `npm run gate`
gates a step. It is fence-aware and CRLF-safe, because a naive `` ```lang\n `` regex silently scores
every CRLF file as 0% code — which is how the first version passed a pathological plan.

**The two numbers it decides on are total directory lines and the largest single block.** Read the
code share as advisory: it separated the two measured plans by only 1.4× (55% vs 76%), while total
size separated them by 3.3×. **A plan with a lot of code in it is not the failure mode. A plan that
kept growing is.** When the total is over 4,000 lines the answer is to stop planning, not to thin the
prose — thinning prose while adding steps is exactly how one phase file reached 62KB.

Any line marked `OVER` is a defect in the plan, not a style preference. Fix it by **cutting**, not by
reformatting: an over-budget phase file means a step is carrying code the executor should write.

**These limits are a judgement call, not a law.** The acceptable plan would itself have failed a
400-line phase limit at p1 and p4, and was still shipped and was still worth its cost. So treat a
single `OVER` as a prompt to look, and two or a blown `TOTAL` as a stop. The failure mode this
section exists to prevent is not "a phase file was 500 lines"; it is "the plan grew to 4× the plan
that worked while nobody was counting."

### When the budget is exceeded

- **Stop and report.** Do not "tighten it up" and keep going — thinning prose while adding steps is
  how one phase file became 62KB.
- Report which limit was hit, the current count, and the choice you see: split the phase, move the
  code block to a signature, or cut the step. **The operator picks.** This is a decision, not a
  cleanup.

---

## Planning mechanics — the four ways a plan run burns money

These are cheap to follow and were each worth a large fraction of the runaway run.

1. **Never re-read what you just wrote.** The `Write` result already proves the file landed, and the
   budget check above is the only verification a plan file needs. In the runaway run, 72 Bash calls
   read the plan back to count its own characters and lines, and `00-index.md` was read 6 times.
   Counting your own prose is not a verification step; it is churn.
2. **Never in-place-edit a file over 300 lines.** Compose it, `Write` it once, and if it must change,
   change the part you are writing. In-place edits to the 62KB phase file cost 54 round trips.
3. **Read each source file twice at most** — once to learn its shape, once to confirm a symbol you
   are about to name. Reading `types.gen.ts` 13 times is not diligence.
4. **Leave no scratch files.** No `.tmp-*.cjs`, no `.tmp-*.ts` in the repo root. If you need a
   throwaway, pass it to `node -e` or write it under the system temp directory. The runaway run left
   two scratch scripts in the repo and edited one of them 7 times.

### Trial-compile rather than speculate

A decision that can be checked by putting the code in the tree and running the gate **must** be
checked that way, not argued in prose. On the previous feature, three decisions (`D1`, `D18`, `D21`)
were green to read and wrong to run; all three were caught in minutes by trial-implementing the
phase and reverting. The prose was not wrong because it was thin — it was wrong because it reasoned
about the *shape* of the code instead of running it.

So: when a step's correctness is genuinely uncertain, spend the code budget on a **trial compile of
that one step**, record the result as fact in `*.decisions.md`, and revert the tree. That is a far
better use of tokens than transcribing nine phases of code the compiler has never seen.

---

## Stage map

Run stages in order. Each has a required artifact and a cost target. Do not begin the next stage
until the prior artifact exists on disk.

| Stage | Artifact | Cost target |
| --- | --- | --- |
| 1. Interview | (answers in conversation) | $0.03 |
| 2. Rules check | (delta notes only) | $0.02 |
| 3. Spec | `docs/<feature>.md` | $0.05 |
| 4. Decisions | `docs/<feature>.decisions.md` | $0.05 |
| 5. Plan | `docs/<feature>/p<N>.md` per phase + `00-index.md` | **$0.30, and hard-capped by §"Budgets"** |
| 6. Gate | `npm run gate` passes on the baseline | $0.02 |
| 7. Execute | code on a branch, one commit per phase | $1.00–$1.50 |
| 8. Review | `npm run gate` + a diff read | $0.10 |

Total target: **$1.50–$2.00**. If execution exceeds twice the plan's cost, the plan was
under-specified — stop and fix the plan, do not push through.

**Stages 1–6 combined should cost less than stage 7.** That is the whole point of the process: the
plan is cheap, the execution is where the money goes. If planning is costing more than the
implementation it is planning, the budget in §"Budgets" was not applied — stop and cut, do not
continue "to be safe". A plan is insurance, and you do not buy more insurance than the house.

---

## Stage 1 — Interview (ask, do not infer)

Ask the operator for exactly these things. Ask once, in a single message, as a numbered list.
Do not proceed until you have answers, and do not ask follow-ups individually — batch them.

**What I need from you (the operator):**

1. **Intent** — 1–3 paragraphs of prose: what the feature does and why. No implementation detail.
2. **Acceptance** — how *you* will know it works. Concrete: a user story ("a host can add an asset
   and see it listed without a reload"), a screen and its states, or a broken behaviour that must
   change. "It looks good" is not an answer; ask again.
3. **Out-of-scope** — what this feature explicitly does *not* do. This is the single highest-value
   input: it prevents the executor from "helpfully" expanding the diff.
4. **Decisions you have already made** — anything you do not want re-litigated (route path, which
   ecosystem the page lives in, naming, whether it needs a backend contract change first).
5. **Definition of done** — is this "merged and green", "deployed", or "documented"? Default:
   merged, gate green, all four locales carrying every new key.

**Do not ask the operator about implementation.** If a choice exists, it goes in the Decisions
document (Stage 4) with your recommendation, and they approve it in one pass.

### One question the frontend adds

Ask early, because the answer reshapes the plan: **does the backend already expose what this
needs?** If not, the feature is blocked on an API change in `covera-hono`, and the plan's first
phase is a contract change, not UI work. A plan that assumes an endpoint exists is the most
expensive kind of wrong.

---

## Stage 2 — Rules check

Read the existing rules before writing anything new. These are the load-bearing files — **verify the
paths still exist before citing them; this repo moves fast and a stale fact here becomes a wrong
decision executed twenty times**:

- `src/lib/router/routes/{host,admin,public}.ts` — the route tables. Each is a `SectionRoute` from
  `src/lib/router/defineRoutes.tsx`: `path`, `requires` (capability names), `data`, `children`. A
  child declares `page: () => import("@/pages/...")` and `params` (`"uuid"`, `"hex32"`, …).
- `src/App.tsx` — **mounts the router only** and is 38 lines. Do not add routes here; add them to the
  route tables. (An older revision of this skill said the opposite; the router was extracted.)
- `src/lib/router/access.ts` — the capability rules (`canUseApp`, `canOpenAdmin`, `canOpenHost`,
  `canOpenPublicOnly`), referenced by name in a route's `requires`. `UserRole` is
  `"admin" | "host" | "guest"`.
- `src/lib/router/paths.ts` and `params.ts` — `appPaths` and the param types. Adding a param type
  means editing **both**: `paths.ts`'s `ParamKeysMatch` guard and `params.ts`'s exhaustive switch
  fail loudly if only one is updated.
- `src/lib/api/api.ts` — `publicApi()` and `withAuth()`; every generated call goes through one.
- `src/lib/api/queryKeys.ts` — `QUERY_ACTIONS`. Query keys are registry entries, not literals.
- `public/locales/<lng>/<ns>.json` — four locales (`en`, `de`, `tr`, `sr-Latn`) × four namespaces
  (`general`, `host`, `guest`, `assets`). Namespaces are passed to `useTranslation("<ns>")`.

Closest analogues, by what you are building:

- Full page with queries + mutations + invalidation → `src/pages/host/IndividualApartment.tsx`
- A form → `src/components/forms/CreateAssetForm.tsx` (react-hook-form + zod + `t()`)
- Pure logic with no React → `src/lib/validations/shots.ts`
- Route + guard wiring → the `host` / `admin` route tables in `src/lib/router/routes/`

Name the analogue a step should follow in the step itself (see the phase template's *Pattern to
follow* bullet). An executor copying a named existing file is faster and more consistent than one
interpreting a description.

Produce **delta notes only** — what this feature needs that the rules do not already say. Do not
restate the rules in the spec; link to them.

If the feature requires changing an established rule, that is a decision, not an edit. It belongs
in Stage 4 with the rationale, and it must be called out in the PR.

---

## Stage 3 — Spec (`docs/<feature>.md`)

The spec says **what is true after this lands**. It is short — aim for under 150 lines. It is the
only document a reviewer needs to read.

Use `references/feature-spec.template.md`. Required sections:

- Intent (from Stage 1, in the operator's words)
- Behaviour: a table of route → component → guard → data → states → i18n namespace
- Data: the generated API surface this depends on, or `none`
- Invariants this feature must not break (link §"Invariants" below)
- Out of scope
- Open questions → **must be empty**; anything here moves to Stage 4 as a decision

A spec with a non-empty "Open questions" section cannot proceed.

---

## Stage 4 — Decisions (`docs/<feature>.decisions.md`)

**This is the stage that pays for the whole process.** Every choice the executor would otherwise
have to make mid-flight gets an ID, a recommendation, and a one-line rationale. The operator
approves the table in one pass.

Use `references/decisions.template.md`. Rules:

- One row per decision. ID (`D1`, `D2`, …). Decision. Rationale. Status.
- **Prefer the option that keeps the gate green** and say so.
- Include the boring ones: route path, which component directory, state placement, query key
  name, i18n key names, whether the copy is ready, commit granularity, test placement.
- Include a **rejected alternatives** line only where the rejection is non-obvious enough that
  someone would otherwise re-propose it.
- Never write "decide later", "either X or Y", or "flag it and move on". Those are the exact
  phrases that cost round trips in the last migration.

Search the codebase for the facts these decisions depend on *now* — does the route already exist in
`src/App.tsx`, does `QUERY_ACTIONS` already have a key for this, does the generated client already
export the request fn. A wrong fact here becomes a wrong decision executed 20 times.

---

## Stage 5 — Plan (a directory, never a monolith)

Write one file per phase:

```
docs/<feature>/
  00-index.md          # dependency graph, invariant list, execution protocol
  p1.md … pN.md        # one phase each, self-contained
```

Why a directory: the executor needs exactly one phase file in context at a time. A 2,800-line
monolith forces either a full read (expensive) or "read only the step section" (an instruction
that cannot be verified and was violated repeatedly in the last migration).

**"One file per phase" is not sufficient on its own.** The `feature/46` run obeyed it and still
produced four files of 1,078–1,397 lines, because each file contained a whole module's finished
code. The file count was right and the *phase size* was wrong. Split by module, and if a phase's
finished code does not fit in 130 lines, it is two phases.

### Size the plan before you write it

Roughly proportional to the code the feature actually adds:

| Feature size | Phases | Plan directory |
| --- | --- | --- |
| Copy change, one component | 1–2 | 15–30K chars |
| One screen with queries and a form | 2–3 | 40–60K chars |
| A multi-screen flow (`feature/50` scale) | 3–5 | ~80–110K chars |
| A flow plus a tokenized second surface, with new helpers | 5–7 | 110–150K chars |

The `feature/46` incident feature — a host flow plus a tokenless field surface, with new helpers —
was planned at **9 phases / 368K chars** and would fit the last row at **6 phases / ~130K**. That is
the shape to aim at: same scope, **three fewer phases and a third of the size**, because each phase
carries a contract rather than a finished module.

If your estimate lands above the table, **the feature is too big for one plan** — plan the first
slice, ship it, and plan the next. A plan covering a feature that a single execution budget cannot
finish is worth less than the sum of two that can.

### Stage 5 is done when the budget is clean

Run `node scripts/plan-budget.mjs docs/<feature>/*.md`. When it is clean and the decisions are
closed, **stop writing plan**.
Do not add a phase, a step, a rejected-alternative row, or another cross-reference because the plan
"could be more complete". Completeness beyond the budget is the failure mode this section exists to
prevent — the runaway run kept improving a plan that was already adequate, for 2,459 turns.

**`00-index.md` must contain:**

- Phase table: phase → files touched → outcome → prerequisite phases
- The dependency graph, explicit. If phase 4 needs phase 1, say so and say *why*.
- Invariants to check after every phase (link §"Invariants" below, plus any feature-specific ones)
- The execution protocol (Stage 7 block below, verbatim)
- Halt conditions (verbatim from Stage 7)

**Each `p<N>.md` must contain:**

- A phase-level `Prerequisite:` line and a `Gate:` line (`npm run gate`)
- Steps with exactly four fields: **Touch**, **Do**, **Accept**, **Verify**
  - No `Goal` field. The heading is the goal. Restating it was 33 redundant fields last time.
  - **Do** is written in one of two modes — **verbatim** for logic, **contract** for surface. See
    §"What goes in a `Do` block". Getting this wrong is what filled the last plan directory.
  - **Accept** is a command whose output proves it, or a grep with its expected result. Never
    "looks correct", never "the render shows …" — if the proof is a rendered output, make it a
    check.
  - **Verify** is `npm run gate` for most steps. Only write a delta when the step needs a
    narrower check (e.g. one file's tests via `npx vitest run src/lib/foo.test.ts`).
- **A test step per phase — where the phase has testable logic.** See the rule below.
- Anchors are **symbols, not line numbers**: "the `validateAssetShotCoverage` export in
  `src/lib/validations/shots.ts`", not "line 33". Line numbers go stale inside a phase.

### What goes in a `Do` block

The plan's job is to close decisions, not to pre-write the implementation. Closing a decision means
the executor can write the code without choosing anything — it does not mean the plan contains the
code. Separating these two is the difference between a 110K-character plan and a 423K-character one.

**Verbatim — the exact bytes *are* the decision.** Reserve this for code that is small, pure, and
where "nearly right" is wrong: a helper, validator, formatter, reducer, state machine, a zod schema,
a `QUERY_ACTIONS` entry, a route declaration, an exhaustive switch, a locale key list, and **test
files**. A test written in the plan is the acceptance criterion, so it is worth its lines.

> Budget: **≤ 130 lines of code per phase file**, **≤ 250 lines in any one block.** If a `Do` needs
> more, the module is too big for one step — split the step, or move the code to contract mode.

**Contract — for components, pages, hooks, and anything composing existing pieces.** These are
mostly transcription against a pattern the repo already has, and the executor writes them better
with the real file open than the planner does from memory. Specify, do not transcribe:

- the path, and `(create | edit | delete)`
- **exports with full signatures** — `export function IncidentItemList(props: {…}): JSX.Element`
- the **props interface**, written out; this is the part the compiler checks across files
- which query keys / helpers it consumes, **by exported name**
- which `t()` keys it renders, **by name**
- **every state branch it must handle**: loading, empty, error, success, plus any feature state
- the callbacks it invokes and what the caller does with them
- the invariant the step must not break

> Budget: **≤ 40 lines of specified surface per phase file.** A contract step normally carries no
> fenced block at all — a signature line and a bullet list. If you find yourself writing JSX, stop:
> that is the executor's 40 lines to spend, not yours.

**When in doubt, use contract mode.** An executor that writes a component from a signature plus the
gate is cheap and correctable; a planner that writes nine phases of untried JSX is neither. The
strongest evidence available: on `feature/50` the plan carried heavy verbatim code and its decisions
still included three (`D1`, `D18`, `D21`) that were green to read and wrong to run — caught by
trial-compiling, not by planning harder.

**What every step must carry regardless of mode** — this is what makes an implementation-free plan
executable:

- the exact file path, and whether it is created, edited, or deleted
- every symbol the step *creates*, by name, with its exported signature
- every symbol it *consumes*, by name and by the file it comes from
- the i18n keys it needs, so the locale step is a lookup and not a discovery
- the states and the error paths
- the invariant, or the sentence "no new invariant"
- a **command** that proves the step landed

### The test rule for a frontend

The original rule was "a test step at the end of every phase, tests are never deferred." Applied
literally to UI work that is a tax — a jsdom render of static markup proves little and rots fast.

**The rule here:**

- A phase whose Do contains **pure logic** — a helper, a validator, a reducer, a formatter, a
  state machine — **must** end with a test step whose Do is the actual test code. This is most of
  the value for a fraction of the cost.
- A phase that is **purely presentational or wiring** (a route entry, a component that composes
  existing pieces, copy changes) **may skip it**, but only via a decision row in
  `docs/<feature>.decisions.md` that says so and why. Silence is not an opt-out.
- Tests live beside the code as `*.test.ts(x)` — next to the module under `src/lib/` or
  `src/components/`, matching the convention already implied by `vitest.config.ts`.
- `test-setup.ts` already global-mocks `react-i18next` so `t()` returns the key. Assert on keys,
  not on translated English. `@testing-library/react` and `user-event` are available.

---

## Stage 6 — Gate

`npm run gate` exists in this repo. It must pass on the baseline branch *before* execution starts.

```
  ok    typecheck    tsc -b
  ok    lint         eslint . --quiet   (errors only; warnings are not a gate)
  ok    tests        vitest run --passWithNoTests
```

`--passWithNoTests` is deliberate and temporary: the repo currently has **zero** test files, so a
bare `vitest run` exits 1 and the gate would be red on a clean tree. The moment a feature lands its
first test, promote the gate to `npm run gate:strict` (same three checks, no `--passWithNoTests`)
and delete the permissive flag. `vitest run` and not `vitest` — bare `vitest` is watch mode in this
repo (`"test": "vitest"`) and will hang forever instead of exiting.

> **Verify the gate script's current text before citing it.** `package.json`'s `gate` is the
> authority; the block above is a snapshot that has already gone stale once. The suite now runs at
> **31 files / 324 tests**, so `--passWithNoTests` is vestigial — the tests line simply reports the
> counts, and an *increase* in both is an acceptance signal. A count that **drops** means a test was
> deleted rather than adapted.

**Never put `npm run build` in the gate.** Its `prebuild` hook runs `npm run api:generate`, which
fetches `VITE_API_DOCS_URL` over the network and rewrites `src/api/generated/`. A gate that depends
on a running backend is not a gate. `npm run perf:bundle` is likewise advisory and belongs in a
phase only if that phase adds to the entry chunk.

**When a prompt says "Accept: `npm run gate`", that is the whole acceptance criterion.** Do not add
prose acceptance on top of it.

If the baseline is not green, stop and fix it before planning. Never plan against a red tree.

### What to do when the backend is not ready

Ask in Stage 1, and take the answer seriously:

- **Backend merged and reachable** → the plan may contain real requests; keep browser passes advisory
  anyway.
- **Backend on an unmerged branch, or the route answers 500** → **every acceptance criterion must be
  a `npm run gate` or a grep.** No step may depend on a live request, and a browser pass is a
  *noticed item*, never a checkbox. Say this in `00-index.md` explicitly, so the executor does not
  discover it at step 1 and start retrying a dead endpoint.
- **Contract change needed first** → make it phase 1 and say so in the spec's §Data, as Stage 1
  already requires.

In that second case, also **state plainly which phases are blocked** and let the operator decide
whether to start at all. `feature/46` planned nine phases in full while five of them could not be
verified against anything — the plan was accurate and the acceptance was unobservable, which is the
most expensive combination.

### Structural checks that already exist — know them, do not rebuild them

These are in the suite today, and two of them are **assertion files a phase must never edit to make
itself pass**. If one goes red, the *declaration* is wrong, not the assertion:

- **`src/lib/__checks__/localeParity.test.ts`** — locale key parity, the frontend's highest-value
  structural check, because a missing key degrades silently to showing the raw key at runtime.
  **It only asserts `en ⊆ <locale>` and flattens recursively**, so a key added to `en` alone *is*
  caught, but extra keys and differing values are not. Never trust the gate alone for a new key —
  dump all four files with a `node -e` one-liner per phase that adds one.
- **`src/lib/router/__checks__/prefetchCoverage.test.ts`** and **`tree.test.ts`** — every route's
  declared `data` resource must exist and be reachable. Red means the route declaration in
  `routes/*.ts` is wrong.
- **`src/lib/router/routes.test.ts`** — the route tables' shape.

Still not in the gate, and worth adding when a feature is burned by its absence: a check for
hand-edited `src/api/generated/`, and a grep for user-facing JSX text with no `t()` nearby.

---

## Stage 7 — Execute

Hand off with this block, filling in the phase range. It is the contract; the executor gets
nothing else.

```
You are executing a pre-written plan, one phase at a time. Do not design, redesign, or improve it.

SOURCES
- docs/<feature>/00-index.md — read ONCE at the start (dependencies, invariants, halt conditions).
- docs/<feature>/p<N>.md — read ONLY the phase file you are about to execute.
- docs/<feature>.decisions.md — read ONCE. If a decision is missing, HALT; do not decide it.

SCOPE
- Execute phases <A>–<B> in order. Stop at the phase boundary.

PRECONDITION
- `npm run gate` must pass. If not, STOP and report.

PER STEP
1. Read the step's Touch / Do / Accept / Verify.
2. Make exactly the change in Do. Files outside Touch are off-limits.
3. Run Verify (`npm run gate` unless the step says otherwise).
4. Walk Accept bullets against real command output, not intent.
5. Report in the fixed format. Then the next step.

FIDELITY
- Do blocks are exact. Reproduce verbatim. If one does not compile or does not match its target
  file, STOP and report the mismatch — do not improvise a substitute.
- Do not rename, reformat, reorder, or "clean up" given code.
- Line numbers in the plan are hints measured on a past date. Locate by symbol.

BATCHING
- Group steps that touch the same file into one read + one write, unless a step's Accept must be
  observed before the next step runs. Say which steps you grouped.

HALT AND ASK — do not guess — when:
- the gate is red and one honest fix attempt does not clear it;
- the plan contradicts the actual code in a way that changes observable behaviour;
- completing a step needs a file outside Touch;
- a decision the plan does not cover changes observable behaviour;
- a step needs a translation key that does not exist in any locale file;
- the generated client does not export the request function a step assumes.
Report: raw output, file and symbol, the options you see, your recommendation.

OUT OF SCOPE
- Anything no step asks for. Collect it in one `Noticed, untouched:` line. Do not fix it.

REPORT — one block per step, nothing longer
Step <N.M> — done | blocked
Touch:   <files>
Verify:  <command> → <result>
Accept:  <bullet> ✓ <evidence>   (one line each)
Noticed: <unrelated issues, untouched>

Do not summarize the plan back, restate code you wrote, or ask whether to continue between steps.
```

**Division of labour during execution:**

- The executor edits and runs `npm run gate` per step. It does **not** commit.
- The operator runs the gate at the phase boundary and makes **one commit per phase**. Nothing
  enforces this — no hooks, no CI — so it is a convention, not a cost saving. If a phase turns out
  to be one logical change, committing per step is fine; say which you did.
- Docs commits are separate from code commits.
- Clear context at phase boundaries, not mid-phase.
- Tier the model per phase, not per habit. **Verbatim logic steps are literal reproduction gated by
  a compile — a cheap model handles them.** **Surface steps are now the executor's own work, so they
  need a model that can write the repo's style from a signature**, and the decision-heavy phases
  (state machines, deadline arithmetic, key identity) and the final review need the strong one.
  With the planning budget applied, execution carries more of the total cost than it used to —
  spend the model tier where the writing happens, not where the copying does.

---

## Stage 8 — Review

Run `npm run gate`. Then read the diff for what a gate cannot see:

- **Scope creep** — files changed that no step names.
- **Untranslated strings** — user-facing text rendered without `t()`, or a key added to `en` but
  not to `de`/`tr`/`sr-Latn`. Both are invisible until someone runs the app in another language.
- **Hand-edited `src/api/generated/`** — regenerated output is not reviewable as a diff; a manual
  edit there is silently destroyed by the next `api:generate`.
- **Secrets in the bundle** — any `VITE_`-prefixed env var is compiled into client JavaScript and
  is public. A service key or token in a `VITE_` var is a leak, not a config choice.
- **Query keys bypassing the registry** — a string literal where `QUERY_ACTIONS` has an entry.
- **Missing states** — a data-fetching component with no loading, empty, and error branch.
- **Leftover `console.log` / `debugger`.**

Review findings become a follow-up phase file, not ad-hoc edits. If review finds work the plan
promised would be done, the plan's definition-of-done section is what needs fixing next time.

---

## Invariants

Check these at every phase boundary. They are what "green" means beyond the compiler.

1. **`src/api/generated/` is generated.** Never hand-edit it. It is excluded from
   `tsconfig.app.json` and from eslint via `globalIgnores` — so a hand-edit there is invisible to
   the gate and destroyed by the next `npm run api:generate`. Regenerate instead.
2. **No hardcoded user-facing strings.** Every label, message, and title goes through `t()` with
   the correct namespace, and the key exists in all four locales.
3. **No secret in a `VITE_` env var.** Everything so prefixed ships to the browser.
4. **Routes live in the route tables** — `src/lib/router/routes/{host,admin,public}.ts`, as
   `page: () => import("@/pages/...")` entries with a `requires` capability. `src/App.tsx` mounts
   the router and nothing else.
5. **Query keys come from `QUERY_ACTIONS`** in `src/lib/api/queryKeys.ts` — no string literals at
   `useQuery` / `invalidateQueries` call sites.
6. **Network calls go through `withAuth()` / `publicApi()`** from `src/lib/api/api.ts`; no
   hand-rolled `fetch` with a manually attached token.
7. **Mutations invalidate what they changed** — a write that leaves a stale list on screen is a bug
   the gate cannot see.
8. **Forms validate with a zod schema**, resolved through `@hookform/resolvers`.
9. **Feature-specific:** <add here, or delete>

---

## Anti-patterns (each one cost money last time)

The evidence column is from the `covera-hono` migration. The lessons were re-checked against this
repo; where a lesson no longer applies it has been dropped rather than carried over.

| Anti-pattern | Evidence | Instead |
| --- | --- | --- |
| Discovering the cheap execution mode mid-run | batch-verify was introduced at step 0.5 of 40, after 26 steps ran per-step | decide execution mode in `00-index.md` before step 1 |
| "Either X or Y — decide when you get there" | 1.8, 5.4, 3.2 | resolve in `*.decisions.md` |
| Prose acceptance checked by eyeballing output | 3.1/3.2 verified by dumping a JSON endpoint | `npm run gate` |
| Tests discovered at review | registry-wide test requirement surfaced only in the final check; cost two follow-up commits | a test step in every phase with testable logic |
| `Goal:` restating the heading | 33 of 40 steps | delete the field |
| Identical verify line copy-pasted | 21 of 39 steps | `npm run gate` |
| Line-number anchors | "line 33", "lines 122–127" | symbol anchors |
| One monolith plan | 2,810 lines, 1,452 of them code | one file per phase |
| Docs committed with code | `ed4e94e` mixed 3,778 insertions of plan text into a code commit | separate commits |
| Assuming the backend already has the endpoint | *frontend-specific; not yet observed here* | ask in Stage 1 |
| A key added to `en` only | *frontend-specific; not yet observed here* | all four locales, or a decision saying otherwise |
| **Unbudgeted planning** — no stop condition, so the plan runs until it is perfect | `feature/46` kickoff, 2026-11-08: **2,459 turns, 4.01M output tokens, 1,827 tool calls, 0 lines of `src/`**; the comparable `feature/50` plan was 110K chars, this one 368K | the §"Budgets" table, and stage 5's cap |
| **Transcribing code the executor will write anyway** | the runaway run: **76% of the plan directory was fenced code**; phase files ran 909–1,397 lines against the 400-line rule | §"What goes in a `Do` block" — contract mode for surface, verbatim only for logic. The acceptable `feature/50` plan was itself 55% code, so *volume* is the signal, not the share |
| **Re-reading and re-writing your own plan files** | 72 Bash calls read the plan back to count its characters; `00-index.md` read 6×, `decisions.md`, `p1.md`, `p4.md` 9–11×; **127 exactly-repeated tool calls**; `p9.md` edited **54 times**, `p7.md` 38 | §"Planning mechanics" 1–4: verification is the budget check, not a re-read |
| **Rewrite amplification** | 938K characters written into `docs/` for a 368K-character artifact — **2.6×** | compose a file once and `Write` it; never in-place-edit a file over 300 lines |
| **Scratch files in the repo** | two `.tmp-*.cjs` scripts, one edited 7 times | `node -e`, or the system temp dir |
| **Planning phases against a backend that does not exist** | 5 of 9 phases here were written against an unmerged branch whose route answers `500`; every acceptance criterion had to be a grep | plan the backend-independent phases; mark the rest blocked, or make the contract change phase 1 |
| **Treating verbatim code as correctness** | `feature/50`: heavy verbatim code, and `D1`/`D18`/`D21` were still green-to-read and wrong-to-run — caught only by trial-compiling | trial-compile the uncertain step, record it as a fact, revert |

---

## Definition of ready-to-execute

Every box must be true before Stage 7 starts. If any is false, the plan is not done.

- [ ] Spec exists, "Open questions" is empty
- [ ] Every decision has an ID and an approved status; no "decide later" anywhere
- [ ] Every phase that has testable logic either has a test step, or has a decision row saying why not
- [ ] `00-index.md` has the phase table, dependency graph, invariants, and this protocol
- [ ] Every phase file is self-contained and **at or under 400 lines** (a soft limit — an existing
      good plan had two files at 734 and 907, so record why if one is over, rather than pretending
      it is not)
- [ ] The whole plan directory is **under 150K characters and 4,000 lines**
- [ ] `node scripts/plan-budget.mjs docs/<feature>/*.md` exits **0** — no `OVER` on total lines or
      largest block
- [ ] Each phase file is in the right mode: logic phases carry verbatim code within budget, surface
      phases carry signatures and bullets instead of JSX
- [ ] No step has a `Goal` field; every step has Touch / Do / Accept / Verify
- [ ] Every Accept is a command or a grep with a stated expected result
- [ ] No scratch or `.tmp-*` files left in the repo
- [ ] `npm run gate` is green on the baseline

If a box is false because the plan is over budget, **cut the plan** — do not start execution and
plan to improve it later. An over-budget plan is executed at the cost of both, and the code it
front-runs gets rewritten anyway by the trial-compile it should have had.

**The one hard number is total size.** 4,000 lines for the directory is the line. Below it, a
400-line or 900-line phase file is a judgement call the operator can accept with an eye on the actual
file; above it, stop planning regardless of how good the individual files look.
