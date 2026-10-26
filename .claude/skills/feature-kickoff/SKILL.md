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

## Stage map

Run stages in order. Each has a required artifact and a cost target. Do not begin the next stage
until the prior artifact exists on disk.

| Stage | Artifact | Cost target |
| --- | --- | --- |
| 1. Interview | (answers in conversation) | $0.03 |
| 2. Rules check | (delta notes only) | $0.02 |
| 3. Spec | `docs/<feature>.md` | $0.05 |
| 4. Decisions | `docs/<feature>.decisions.md` | $0.05 |
| 5. Plan | `docs/<feature>/p<N>.md` per phase + `00-index.md` | $0.30 |
| 6. Gate | `npm run gate` passes on the baseline | $0.02 |
| 7. Execute | code on a branch, one commit per phase | $1.00–$1.50 |
| 8. Review | `npm run gate` + a diff read | $0.10 |

Total target: **$1.50–$2.00**. If execution exceeds twice the plan's cost, the plan was
under-specified — stop and fix the plan, do not push through.

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

Read the existing rules before writing anything new. These are the load-bearing files:

- `src/App.tsx` — the only router. Route shape, `ErrorBoundary`, lazy imports, and role guards
  all live here.
- `src/lib/auth.ts` — `requireRoleGuard(role)` and `redirectIfAuthenticated()`; `UserRole` is
  `"admin" | "host" | "guest"`.
- `src/lib/api/api.ts` — `publicApi()` and `withAuth()`; every generated call goes through one.
- `src/lib/api/queryKeys.ts` — `QUERY_ACTIONS`. Query keys are registry entries, not literals.
- `public/locales/<lng>/<ns>.json` — four locales (`en`, `de`, `tr`, `sr-Latn`) × four namespaces
  (`general`, `host`, `guest`, `assets`). Namespaces are passed to `useTranslation("<ns>")`.

Closest analogues, by what you are building:

- Full page with queries + mutations + invalidation → `src/pages/host/IndividualApartment.tsx`
- A form → `src/components/forms/CreateAssetForm.tsx` (react-hook-form + zod + `t()`)
- Pure logic with no React → `src/lib/validations/shots.ts`
- Route + guard wiring → the `host` / `admin` branches in `src/App.tsx`

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
  - **Do** carries exact code where code is what's wanted. Verbatim. No paraphrase.
  - **Accept** is a command whose output proves it, or a grep with its expected result. Never
    "looks correct", never "the render shows …" — if the proof is a rendered output, make it a
    check.
  - **Verify** is `npm run gate` for most steps. Only write a delta when the step needs a
    narrower check (e.g. one file's tests via `npx vitest run src/lib/foo.test.ts`).
- **A test step per phase — where the phase has testable logic.** See the rule below.
- Anchors are **symbols, not line numbers**: "the `validateAssetShotCoverage` export in
  `src/lib/validations/shots.ts`", not "line 33". Line numbers go stale inside a phase.

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

**Never put `npm run build` in the gate.** Its `prebuild` hook runs `npm run api:generate`, which
fetches `VITE_API_DOCS_URL` over the network and rewrites `src/api/generated/`. A gate that depends
on a running backend is not a gate.

**When a prompt says "Accept: `npm run gate`", that is the whole acceptance criterion.** Do not add
prose acceptance on top of it.

If the baseline is not green, stop and fix it before planning. Never plan against a red tree.

### Checks worth adding later, once they earn their keep

Not in the gate today — each needs a script that does not exist yet. Add one when a feature is
actually burned by its absence:

- **Locale key parity** — every key present in `public/locales/en/<ns>.json` exists in `de`, `tr`,
  and `sr-Latn`. This is the frontend's highest-value structural check, because a missing key
  degrades silently to showing the raw key string at runtime.
- **No hand-edits under `src/api/generated/`** — a git diff check against `api:generate` output.
- **No hardcoded user-facing strings** — a grep for JSX text nodes with no `t()` nearby.

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
- Tier the model: most steps are literal reproduction gated by a compile — use a cheap model.
  Reserve the strong model for steps whose content is a decision table or reasoning about
  existing code, and for the final review.

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
4. **Routes live in `src/App.tsx`** as lazy `import()` entries, and any authenticated branch is
   behind `requireRoleGuard("<role>")`.
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

---

## Definition of ready-to-execute

Every box must be true before Stage 7 starts. If any is false, the plan is not done.

- [ ] Spec exists, "Open questions" is empty
- [ ] Every decision has an ID and an approved status; no "decide later" anywhere
- [ ] Every phase that has testable logic either has a test step, or has a decision row saying why not
- [ ] `00-index.md` has the phase table, dependency graph, invariants, and this protocol
- [ ] Every phase file is self-contained and under ~400 lines
- [ ] No step has a `Goal` field; every step has Touch / Do / Accept / Verify
- [ ] Every Accept is a command or a grep with a stated expected result
- [ ] `npm run gate` is green on the baseline
