# Login redirect — execution index

Spec: [../login-redirect.md](../login-redirect.md) · Decisions: [../login-redirect.decisions.md](../login-redirect.decisions.md)

## Phases

**Status 2026-10-28: phases 0–4 are complete; the phase files (`p0.md`–`p4.md`) have been deleted.**
The tree is green (`npm run gate` → exit 0, `Test Files 16 passed (16)`, `Tests 156 passed (156)`,
up from 142 at the baseline). Remaining work is the operator's: one commit per phase, the
`router-maximization.decisions.md` D3 pointer (D18), and the end-to-end sign-out check that needs a
real Supabase session.

The table below is the original plan of record; the "Requires" column is historical.

| Phase | File | Touches | Outcome | Requires |
| --- | --- | --- | --- | --- |
| 0 | ~~p0.md~~ | `src/lib/router/__checks__/router.behaviour.test.ts` | The pre-existing flaky gate goes green | — |
| 1 | ~~p1.md~~ | `src/components/Header.tsx`, `src/lib/router/session.test.ts` | Sign-out clears the session store, before navigating | 0 |
| 2 | ~~p2.md~~ | `src/lib/router/access.ts`, `src/lib/router/access.test.ts` | The `isAnonymous` rule exists | 1 |
| 3 | ~~p3.md~~ | `src/lib/router/redirects.ts`, `defineRoutes.tsx`, `createAppRouter.tsx`, 4 test files | A denied route can redirect instead of 403 | 2 |
| 4 | ~~p4.md~~ | `src/lib/router/routes/public.ts`, `paths.ts`, `__checks__/router.behaviour.test.ts` | `/login` requires `isAnonymous`; a signed-in visitor is redirected | 3 |

## Dependency rules

- A legal landing order: **0 → 1 → 2 → 3 → 4**. Phases 1–4 are sequential; do not reorder.
- **Phase 1 must precede phase 4** — not phase 3. The redirect makes `/login` unreachable to a
  still-stale session, so sign-out has to clear the store *before* anything depends on it. Landing
  phase 4 first would ship a logout that appears broken.
- **Phase 2 must precede phase 3** — a route cannot require a rule the registry does not define, and
  `RuleName` is derived from `ACCESS_RULES`, so the tree will not compile.
- **Phase 3 must precede phase 4** — `/login`'s `denyRedirect` field does not exist as a
  `RouteNode` property until phase 3 adds it.
- **Phase 0 must precede everything** — the skill forbids executing against a red gate, and the
  baseline is red. Phase 0 is a pre-existing bug fix and commits on its own.

## Invariants — check at every phase boundary

1. `src/api/generated/` is not hand-edited; regenerate with `npm run api:generate` instead.
2. No hardcoded user-facing strings; every key exists in `en`, `de`, `tr`, and `sr-Latn`. **This
   feature adds no keys at all** (D7).
3. No secret in a `VITE_` env var.
4. Routes live in `src/lib/router/routes/*.ts` as `page:`-style lazy imports; `lazy` is banned under
   `src/lib/router/` (existing D13). No step adds it.
5. Query keys come from `QUERY_ACTIONS` — this feature reads no server state.
6. Network calls go through `withAuth()` / `publicApi()` — this feature adds none.
7. Mutations invalidate the keys they changed — this feature adds no mutation.
8. _Feature-specific:_ **role literals (`"admin"`, `"host"`, `"guest"`) appear only inside
   `src/lib/router/access.ts`.** `dashboardPathForRole` is the single role → path mapping (D4).
9. _Feature-specific:_ **`status: 403` still appears exactly twice in `defineRoutes.tsx`** — the
   permission rule stays 403-in-place (D1, D2). Phase 3's step 3.3 asserts the count.
10. _Feature-specific:_ **`/update-password`, `/`, and `/inspection/:id` stay `public`** (D6).

## Execution protocol

```
You are executing a pre-written plan, one phase at a time. Do not design, redesign, or improve it.

SOURCES
- docs/login-redirect/00-index.md — read ONCE at the start (dependencies, invariants, halt conditions).
- docs/login-redirect/p<N>.md — read ONLY the phase file you are about to execute.
- docs/login-redirect.decisions.md — read ONCE. If a decision is missing, HALT; do not decide it.

SCOPE
- Execute phases 0–4 in order. Stop at each phase boundary.

PRECONDITION
- `npm run gate` must pass. It does NOT pass on the baseline: phase 0 fixes it. Run phase 0 first,
  then treat the gate as a precondition for phases 1–4.

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
- Line numbers in the plan are hints measured on 2026-10-28. Locate by symbol.

BATCHING
- Group steps that touch the same file into one read + one write, unless a step's Accept must be
  observed before the next step runs. Say which steps you grouped.
- Phase 3 steps 3.3–3.5 are a single compile-fix sequence: the gate is expected RED from 3.2 until
  3.5. Group them, and do not report 3.2–3.4 as "blocked" for a red gate that 3.5 clears.

HALT AND ASK — do not guess — when:
- the gate is red and one honest fix attempt does not clear it (phase 3's 3.2→3.5 window excepted);
- the plan contradicts the actual code in a way that changes observable behaviour;
- completing a step needs a file outside Touch;
- a decision the plan does not cover changes observable behaviour;
- a step needs a translation key that does not exist in any locale file (should not occur — D7 adds none);
- the generated client does not export the request function a step assumes (should not occur — no API change).

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

### Division of labour

- **Executor:** edits, runs `npm run gate` per step, never commits.
- **Operator:** runs `npm run gate` at each phase boundary and makes one commit per phase. This is a
  convention, not a cost saving — this repo has no husky hook and no CI, so nothing runs a check
  automatically. The gate is the only thing catching a regression.
- Clear context at phase boundaries, not mid-phase.
- Tier the model per step: cheap for transcription, strong for phase 3 (the builder change) and the
  final review.

## Test plan for this feature

| Phase | Test file | What it adds |
| --- | --- | --- |
| 0 | `__checks__/router.behaviour.test.ts` | no new test — an explicit `timeout` on `settle` |
| 1 | `src/lib/router/session.test.ts` | +1: `refresh` clears the user after sign-out (6 total) |
| 2 | `src/lib/router/access.test.ts` | +4 rule rows, and the naming test widened (28 total) |
| 3 | `src/lib/router/defineRoutes.test.ts` | +5: 403 default, fall-through, redirect, sources passed, no import (20 total) |
| 4 | `__checks__/router.behaviour.test.ts` | +5: host/admin/guest redirect, role-403 unchanged, `/` unchanged (11 total) |

Phases exempt from a test step: **none.** Phase 1's `Header.tsx` change is covered by its own store
test (step 1.2) and end-to-end by phase 4's behaviour tests, so its exemption is partial and
recorded in D16 rather than by silence.

## Where the executed code diverges from the plan

Two deviations, both recorded here because the phase files that carried them are gone.

**1. Phase 3, step 3.6 — the 403 assertions (now in `defineRoutes.test.ts`).** The step's `Do` block
asserted `isRouteErrorResponse(thrown)` and `thrown.status === 403`. That is false for a loader's
`throw data(null, { status: 403 })`: react-router 7.14 returns a `DataWithResponseInit` (keys `type`,
`data`, `init`), not a `Response`, so `isRouteErrorResponse` answers `false` on the raw thrown value.
`RouteError.tsx:49` only sees `true` because `RouterProvider` has already converted it. The two
assertions use `toMatchObject({ init: { status: 403 } })` instead — the convention already at
`defineRoutes.test.ts:103` and `:119` — and the `isRouteErrorResponse` import the step added was
dropped, since eslint fails on an unused import. No production code changed.

**2. Phase 4, step 4.1 — the `?? "guest"` fallback (now in `routes/public.ts`).** The phase invariant
says no role literal is added outside `src/lib/router/access.ts`, but the step writes
`dashboardPathForRole(sources.role ?? "guest")`. Kept as written: it is the pre-existing call shape
(`LoginForm.tsx:63`, `PassUpdateForm.tsx:76`), and `selectSources` (`access.ts:36`) already defaults a
missing JWT role to `"guest"`. Invariant 8 is a **new-mapping** rule — `dashboardPathForRole` is still
the only role → path mapping — and no new mapping is introduced. The `"guest"` here is a null-default,
not a second mapping.

**Gate note.** `npm run gate` uses `vitest run`, not bare `vitest` (which is watch mode here and
hangs). `package.json`'s `gate` script runs `tsc -b && eslint . --quiet && vitest run`. The
`--passWithNoTests` flag is **not** present — the repo has 16 test files, so a bare `vitest run` is
correct and stricter. Never add `npm run build` to the gate: its `prebuild` hook runs
`npm run api:generate`, which fetches over the network.

## Halt conditions

- Gate red and one honest fix attempt does not clear it (phase 3's compile-fix window excepted)
- The plan contradicts the code in a way that changes observable behaviour
- The step needs a file outside its Touch list
- A decision the plan does not cover changes observable behaviour
- A step needs a translation key that exists in no locale file
- The generated client does not export the request function a step assumes

Report raw output, file and symbol, the options, and a recommendation. Do not proceed past it.

## Definition of done

- [ ] `npm run gate` green on the feature branch, **and green on the baseline before phase 1**
- [ ] Every phase landed its test step; no test work deferred to review
- [ ] Every decision in `login-redirect.decisions.md` is `APPROVED` and reflected in the code
- [ ] No new i18n key was added, and `public/locales/` is unchanged by this feature
- [ ] No hand-edits under `src/api/generated/`
- [ ] A signed-in admin, host and guest each land on their dashboard when opening `/login`
- [ ] A signed-out visitor still sees the login form at `/login`
- [ ] Signing out clears the user and leaves you on `/login` as an anonymous visitor
- [ ] A host opening `/admin/dashboard` still gets a 403 at that URL
- [ ] `router-maximization.decisions.md` D3 carries a pointer to this feature's D3
- [ ] Docs commit is separate from code commits
