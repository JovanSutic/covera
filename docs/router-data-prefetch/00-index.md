# Router data prefetch — execution index

Spec: [../router-data-prefetch.md](../router-data-prefetch.md) · Decisions:
[../router-data-prefetch.decisions.md](../router-data-prefetch.decisions.md)

Baseline verified green on 2026-10-27: `npm run gate` → exit 0, `Test Files 12 passed (12)`,
`Tests 108 passed (108)`.

This feature closes the five data-loading holes found in review. The router's *mechanism* for
starting work early (`AccessLink` → 100 ms hover → `preloadRoute` → `matchRoutes` → rule/param
checks → `guard.preload`) is sound and is **not** redesigned. What changes is that a route's data
dependencies become declarative, so coverage stops being a thing someone has to remember.

## Phases

| Phase | File | Touches | Outcome (observable gain) | Requires |
| --- | --- | --- | --- | --- |
| 1 | [p1.md](./p1.md) | `src/lib/api/queries/shared.ts` (new), `assets.ts` (new), `shots.ts` (new), `reservations.ts` (new), `inspection.ts` (new), `admin.ts` (new), `apartment.ts`, `src/lib/api/queryKeys.ts`, `src/lib/api/queries/*.test.ts` | Every query the app reads has ONE definition — key and fetcher together — and one shared freshness window, so a route's prefetch and a page's hook cannot drift | — |
| 2 | [p2.md](./p2.md) | `src/lib/router/defineRoutes.tsx`, `src/lib/router/createAppRouter.tsx`, `src/lib/router/defineRoutes.test.ts` | A route can declare `data: ResourceName[]`; `prefetch`/`data` receive `searchParams`; a **group** route's prefetch finally runs on the intent path (hole 1); `recordCheck` is deleted (D10) | 1 |
| 3 | [p3.md](./p3.md) | `src/lib/router/routes/host.ts`, `admin.ts`, `public.ts`, `src/pages/host/IndividualApartment.tsx`, `src/pages/InspectionPage.tsx`, `src/components/host/ReservationsSection.tsx`, `src/components/host/ApartmentSection.tsx`, `src/components/admin/UsersSection.tsx`, `src/components/admin/ApartmentsSection.tsx`, `src/lib/api/queries/host.test.ts` (new) | `/host/apartments/:id` prefetches all four of its queries (hole 2), `/admin/dashboard` and `/inspection/:id` prefetch theirs (holes 3, 6), and every reader — pages **and sections** — goes through the shared modules, so phase 4's check can actually see them (D21) | 2 |
| 4 | [p4.md](./p4.md) | `src/lib/api/queries/manifest.ts` (new), `src/lib/router/__checks__/coverage.ts` (new), `src/lib/router/__checks__/prefetchCoverage.test.ts` (new), `docs/router-data-prefetch/00-index.md` | `npm run gate` **fails** when a page reads a query no route in its chain declares — the regression can no longer ship (D12), and the parser is proven non-vacuous (D22) | 3 |
| 5 | [p5.md](./p5.md) | `src/lib/router/navigationTiming.ts`, `src/lib/router/createAppRouter.tsx`, `src/lib/router/navigationTiming.test.ts` (new) | Timings distinguish `chunkMs` from `dataMs` and record whether the nav was prefetched, so the prefetch's value is measurable instead of asserted (hole 5) | 2 |
| 6 | [p6.md](./p6.md) | `docs/routing-performance-baseline.md` (recreate) | The before/after numbers for this feature are written down, with the waterfall count that proves hole 2 is closed | 1–5 |

## Dependency rules

State the reason, not just the edge.

- **P2 needs P1** — `defineRoutes` imports `ResourceName` and the resource resolvers P1 creates; the
  `data` declaration's type is derived from P1's registry.
- **P3 needs P2** — the route files declare `data`, and `data` does not exist as a route field until
  P2 adds it. P3 also rewires the three pages onto P1's query modules.
- **P4 needs P3** — the coverage check asserts on the real tree. Run against the tree as it stands
  before P3 and it fails by design (that is the point), but its own Accept requires a green gate, so
  it must land after the declarations it checks.
- **P5 needs P2** — the `prefetched` flag reads the preload path P2 wires; `dataMs` subscribes to
  the query cache P1 populates.
- **P6 needs P1–P5** — it measures the finished behaviour. Measuring earlier records a number for a
  tree that is about to change, which is worse than no number (the prior feature's P8 made exactly
  this argument).

A legal landing order: 1 → 2 → 3 → 4 → 5 → 6. Phases 1 and 5 touch disjoint files; they are still
run in order because P5's `prefetched` flag depends on P2, and serialising costs nothing here.

**Note on p1's length (~700 lines, against the skill's ~400 guideline).** It is six query modules
plus the registry, and they must land together: the registry imports all six, so a partial landing
does not compile. It is read once, and the alternative — splitting the modules across two phases —
would put a phase boundary inside a single compile unit. Every other phase file is under 500 lines.

## Invariants — check at every phase boundary

The nine repo invariants are in the kickoff skill. Feature-specific ones, applied per phase:

1. **Routes stay data.** No route object gains `lazy`, `element`, `Component`, `ErrorBoundary` or a
   hand-written `loader`; `prefetch`/`data` remain the only data hooks a route file may declare.
   The R1/R34 lint lock already enforces this — `npm run gate` is the check.
2. **A prefetch never throws into the router.** Every prefetch goes through `prefetchQuietly` (P1).
   After each phase: `grep -rn "prefetchQuery" src/lib/router/routes/ src/lib/api/queries/` returns
   only calls inside `shared.ts`.
3. **Query keys come from `QUERY_ACTIONS`.** After P1:
   `grep -rn 'queryKey: \["' src/ | grep -v generated` returns nothing.
4. **`/inspection/:id` stays anonymous** (D7). After P3:
   `grep -n "withAuth" src/lib/api/queries/inspection.ts` returns nothing.
5. **Entry chunk stays under 94,208 gzip** (D18). Checked in P6 with
   `npx vite build && npm run perf:bundle`; a result over budget is a halt-and-ask, never a bump.
6. **No new i18n key, no locale file touched** (D15). After each phase:
   `git diff --stat public/locales/` is empty.
7. **`src/api/generated/` is untouched.** After each phase:
   `git status --porcelain src/api/generated/` is empty.
8. **A page's query hooks are declared.** Adding a `useX` to a route's page, or to any component that
   page imports, without declaring the resource fails `npm run gate` (phase 4). This is why phase 3
   converted the section components off inline `useQuery` (D21): the check finds a query by the
   module hook a component **imports**, so an inline `useQuery` is invisible to it. Exemptions are
   only ever added to `INTERACTION_GATED_HOOKS` with a written reason (D13).

## Execution protocol

```
You are executing a pre-written plan, one phase at a time. Do not design, redesign, or improve it.

SOURCES
- docs/router-data-prefetch/00-index.md — read ONCE at the start (dependencies, invariants, halt conditions).
- docs/router-data-prefetch/p<N>.md — read ONLY the phase file you are about to execute.
- docs/router-data-prefetch.decisions.md — read ONCE. If a decision is missing, HALT; do not decide it.

SCOPE
- Execute phases 1–6 in order. Stop at the phase boundary.

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
- the generated client does not export the request function a step assumes;
- a build measurement lands the entry chunk over 94,208 bytes gzip (D18) — report the number and
  the chunk diff, do not raise the budget.

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

- **Executor:** edits, runs `npm run gate` per step, **never commits**.
- **Operator:** runs `npm run gate` at each phase boundary and makes **one commit per phase** (D17).
  Docs commits are separate from code commits.
- Clear context at phase boundaries, not mid-phase.
- Tier the model: P1 and P3 are largely verbatim transcription gated by a compile — a cheap model
  handles them. **P2 and P4 are decision-heavy** (router internals; a check that must both pass on
  the real tree and fail on a fixture) — use the strong model. P6 is a measurement run.

## Test plan for this feature

| Phase | Test file | Covers |
| --- | --- | --- |
| 1 | `src/lib/api/queries/registry.test.ts` | every `QUERY_RESOURCES` entry has a distinct action and a `use…`-shaped hook name; each resolver returns a key beginning with its own `QUERY_ACTIONS` entry; a resolver whose params are absent returns `null` |
| 1 | `src/lib/api/queries/apartment.test.ts` (extend) | the resource resolver and the page hook produce an identical key — the existing §4 assertion, now against the resolver |
| 2 | `src/lib/router/defineRoutes.test.ts` (extend) | a group node's preload is defined and runs its `data` (hole 1's regression test); `searchParams` reaches `prefetch`; `data` resolves through the registry; `recordCheck` is gone from the built route |
| 3 | `src/lib/api/queries/host.test.ts` (new) | `/host/apartments/:id`'s declaration resolves to exactly the four keys the page reads, including the reservations key's exact five-element tail |
| 4 | `src/lib/router/__checks__/prefetchCoverage.test.ts` | the real tree passes **and** the parser is proven non-vacuous: a default import is read, nine specifiers are found, the admin page's hooks are reached transitively, the host detail page's set is exactly four |
| 5 | `src/lib/router/navigationTiming.test.ts` | `chunkMs` closes on idle; `dataMs` closes when the nav's queries settle; `prefetched` reflects the preload registry; a nav with no queries leaves `dataMs` null |

## Halt conditions

- Gate red and one honest fix attempt does not clear it
- The plan contradicts the code in a way that changes observable behaviour
- The step needs a file outside its Touch list
- A decision the plan does not cover changes observable behaviour
- A step needs a translation key that exists in no locale file
- The generated client does not export the request function a step assumes
- The entry chunk measures over 94,208 bytes gzip (D18)
- Any step makes `npm run dev` render a blank page at `/`, **or** makes a signed-out guest visit to
  `/inspection/:id` fail (D7) — both are regressions, not cosmetics, even if the gate is green

## Definition of done

- [ ] `npm run gate` green on the feature branch, including the new coverage check
- [ ] Every phase with testable logic landed its test; no test work deferred to review
- [ ] Every decision in `*.decisions.md` is `APPROVED` and reflected in the code
- [ ] No new i18n key and no locale file changed (D15): `git diff --stat public/locales/` empty
- [ ] No hand-edits under `src/api/generated/`
- [ ] Entry chunk measured and still ≤ 94,208 bytes gzip, or the overshoot is reported
- [ ] `docs/routing-performance-baseline.md` recreated and its final row filled with real numbers
- [ ] Docs commit is separate from code commits
- [ ] The PR calls out: the group-route `buildPreload` fix (a behaviour change), the removal of
      `recordCheck` (D10), and the pre-existing API-origin split left alone (D20)
