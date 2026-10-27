# Router maximization — execution index

Spec: [../router-maximization.md](../router-maximization.md) · Decisions: [../router-maximization.decisions.md](../router-maximization.decisions.md)

Playbook stages 0–8, one phase each. Baseline verified green on 2026-10-27: `npm run gate` → exit 0,
`Test Files 1 passed (1)` / `Tests 4 passed (4)`.

## Phases

**Status 2026-10-27: phases 1–9 are complete; the phase files (`p1.md`–`p8.md`) have been deleted.**
The tree is green (`npm run gate` → exit 0, `Test Files 12 passed (12)`, `Tests 108 passed (108)`).
Steps 9.5 and 9.6 were walked on 2026-10-27 in headless Chrome over CDP: the tracker and `## Final`
carry real numbers, and **12 of step 9.6's 13 rows pass — the A11y row fails** (see `p9.md` §9.6
result). Remaining operator work is commits only.

The table below is the original plan of record; the "Requires" column is historical.

| Phase | File | Touches | Outcome (observable gain) | Requires |
| --- | --- | --- | --- | --- |
| 1 | ~~p1.md~~ | `src/lib/router/session.ts` (new), `src/lib/router/session.test.ts` (new), `src/lib/router/AppContext.tsx` (new), `src/main.tsx`, `src/components/Header.tsx`, `src/hooks/auth.ts` (delete), `docs/routing-performance-baseline.md` (new) | The session is loaded **once** before the router exists, so access answers cost 0 requests; the baseline numbers this feature must beat are written down | — |
| 2 | ~~p2.md~~ | `src/lib/router/params.ts` (new), `src/lib/router/access.ts` (new), `src/lib/router/params.test.ts` (new), `src/lib/router/access.test.ts` (new) | Access answers are **synchronous** and cost 0 requests; params are typed and validated as pure functions | 1 |
| 3 | ~~p3.md~~ | `src/lib/router/paths.ts` (new), `src/lib/router/redirects.ts` (new), `src/lib/router/defineRoutes.tsx` (new), `src/lib/router/routes/public.ts` (new), `src/lib/router/routes/index.ts` (new), `src/lib/router/createAppRouter.tsx` (new), `src/lib/router/navigationTiming.ts` (new), `src/lib/router/paths.test.ts` (new), `src/lib/router/defineRoutes.test.ts` (new), `src/App.tsx`, `src/pages/LoginPage.tsx`, `src/pages/PassUpdatePage.tsx`, `src/pages/FormPage.tsx`, `src/pages/InspectionPage.tsx` | The router is built by a factory; `public` URLs are typed data; `/inspection/<garbage>` is a 404 **before** the chunk downloads; navigation timing becomes measurable | 2 |
| 4 | ~~p4.md~~ | `src/lib/router/routes/host.ts` (new), `src/lib/router/routes/admin.ts` (new), `src/lib/router/routes/index.ts`, `src/lib/router/routes.test.ts` (new), `src/lib/router/createAppRouter.tsx`, `src/lib/auth.ts`, `src/pages/host/*`, `src/pages/admin/Dashboard.tsx`, `src/components/host/ApartmentHeader.tsx`, `src/pages/InspectionPage.tsx`, `src/components/forms/LoginForm.tsx`, `src/components/forms/PassUpdateForm.tsx` | A host opening `/admin/dashboard` sees a 403 **at that URL** with 0 bytes of admin code; `/host` lands on `/host/dashboard` instead of a blank page | 3 |
| 5 | ~~p5.md~~ | `src/components/router/Shell.tsx` (new), `src/components/router/RouteError.tsx` (new), `src/components/router/NotFoundPage.tsx` (new), `src/components/router/ProgressBar.tsx` (new), `src/components/router/RouteAnnouncer.tsx` (new), `src/pages/ErrorPage.tsx`, `src/lib/router/createAppRouter.tsx`, `src/lib/router/routes/public.ts`, `src/lib/router/routes/index.ts`, `src/lib/router/routes.test.ts`, `src/App.tsx`, `vite.config.ts`, six in-shell pages, `public/locales/*/general.json` | The layout survives an error, an unknown URL is a 404 **inside** the shell, a slow navigation keeps the old page and shows a bar after 200 ms, and the header renders exactly once | 4 |
| 6 | ~~p6.md~~ | `src/lib/router/preloadRegistry.ts` (new), `src/lib/router/paths.ts`, `src/lib/router/routes/*.ts`, `src/lib/api/queries/apartment.ts` (new), `src/hooks/usePreloadRoute.ts` (new), `src/hooks/usePreloadRoute.test.ts` (new), `src/components/router/AccessLink.tsx` (new), `src/components/host/ApartmentSection.tsx`, `src/components/Header.tsx` | Hovering a menu/link item for 100 ms downloads its chunk, so the click shows no progress bar; the apartment detail's main request starts **with** its chunk instead of after it | 5 |
| 7 | ~~p7.md~~ | `src/pages/host/IndividualApartment.tsx`, `src/pages/InspectionPage.tsx`, `src/components/host/ReservationActionsCell.tsx`, `src/components/host/ApartmentHeader.tsx`, `src/lib/router/useRouteParams.ts` (new), `src/lib/api/queries/apartment.ts`, `src/lib/api/queries/apartment.test.ts` (new), `src/components/router/AccessLink.tsx` | No hand-built URL survives; `:id` is read parsed and validated, so a malformed id never reaches the API; the route and the page share one apartment query definition | 6 |
| 8 | ~~p8.md~~ | `vite.config.ts`, `package.json`, `scripts/check-bundle-budget.ts` (new), `src/lib/router/createAppRouter.tsx`, `src/components/router/PageSkeleton.tsx` (new), `src/App.tsx`, `src/lib/router/__checks__/bundleBudget.test.ts` (new), `docs/router-maximization/00-index.md` | The main bundle is vendor-split and under a budget `npm run perf:bundle` enforces; the shell paints before page loaders; deployment headers are documented | 7 |
| 9 | [p9.md](./p9.md) | `src/lib/router/__checks__/tree.test.ts` (new), `src/lib/router/__checks__/router.behaviour.test.ts` (new), `eslint.config.js`, `docs/routing-performance-baseline.md` | The static tree, the path definitions and the router's behaviour are checked on every `npm run gate`, and four lint locks stop the tree being rebuilt by hand | 8 |

## Dependency graph

Strictly sequential: `P1 → P2 → P3 → P4 → P5 → P6 → P7 → P8 → P9`.

Why each edge exists, and why parallel execution is **not** used here:

- **P2 needs P1** — `selectSources(session)` maps the `SessionState` shape P1 defines. P2's tests import
  P1's module.
- **P3 needs P2** — `defineRoutes` calls `deps.isAllowed(rule)` and `areParamsValid`. Both are P2
  exports.
- **P4 needs P3** — it extends the same `src/lib/router/routes/index.ts` tree and the same
  `createAppRouter` file P3 created.
- **P5 needs P4** — the shell wraps the finished tree in `errorElement`/`hydrateFallbackElement`, which
  only has a meaning once every in-shell route exists.
- **P6 needs P5** — the preload registry is registered **by the router factory**, and `AccessLink`
  renders `NavLink` inside the shell's `Outlet`.
- **P7 needs P6** — URL ownership converts the call sites P6 creates (`AccessLink`, `useAccessPath`).
  The playbook allows stage 7 to run beside 5–6; here they touch the same two files
  (`AccessLink.tsx`, `ApartmentSection.tsx`), so parallel execution would conflict on every step.
- **P8 needs P7** — the bundle budget must be set on the **final** module graph. Measuring before P7
  lands would set the budget against a tree with links still pulling `useParams`.
- **P9 needs P8** — the tree test asserts on the final tree, and the behaviour test builds the real
  factory, whose shape P5/P8 change (`outsideRoutes`/`backstopElement`/`shellElement`, the hydrate
  fallback route).

## Invariants — check at every phase boundary

The eight repo invariants are in the spec (§"Invariants this feature must not break"). Restated as
checks the operator runs at each boundary:

1. `git status --porcelain src/api/generated/` → **empty**. Never hand-edit it.
2. Every key a phase adds exists in all four of `public/locales/{en,de,tr,sr-Latn}/general.json`.
   Only phase 5 adds keys (four of them, verbatim in `p5.md`).
3. No new `VITE_`-prefixed variable. Phase 7 *removes* the last use of `VITE_APP_BASE_PATH`.
4. Routes live in `src/lib/router/routes/*.ts`; `src/App.tsx` mounts the router only. (This is the
   deliberate replacement of the old invariant 4 — decision D5.)
5. Query keys come from `QUERY_ACTIONS`. Phase 7's `apartment.ts` re-exports one; it does not invent
   one. The one pre-existing literal is D40 and stays.
6. Network calls go through `withAuth()` / `publicApi()`.
7. Mutations still invalidate what they changed — phases 4–7 touch no mutation.
8. Feature-specific: no route object contains `lazy`, `element`, `Component`, `ErrorBoundary` or a
   hand-written `loader`; every `:param` has a declared type; role literals appear only in
   `src/lib/router/access.ts`.

## Execution protocol

```
You are executing a pre-written plan, one phase at a time. Do not design, redesign, or improve it.

SOURCES
- docs/router-maximization/00-index.md — read ONCE at the start (dependencies, invariants, halt conditions).
- docs/router-maximization/p<N>.md — read ONLY the phase file you are about to execute.
- docs/router-maximization.decisions.md — read ONCE. If a decision is missing, HALT; do not decide it.

SCOPE
- Execute phases 1–9 in order. Stop at the phase boundary.

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
- a react-router export a step assumes is missing (check with
  `grep -c "<name>" node_modules/react-router/dist/development/index.d.ts`).

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
- **Operator:** runs `npm run gate` at each phase boundary and makes **one commit per phase** (D49).
  Docs commits are separate from code commits.
- Clear context at phase boundaries, not mid-phase.
- Tier the model: phases 1 and 9 are decision-heavy (read the whole tree, reason about behaviour) —
  use the strong model. Phases 3, 4 and 6 are mostly verbatim transcription gated by a compile — a
  cheap model handles them.

### How each phase proves its gain

| Phase | Proof of the gain |
| --- | --- |
| 1 | The baseline document exists and its tracker row 0 is filled with real numbers |
| 2 | `access.test.ts` table tests + `params.test.ts` round-trips, on `npm run gate` |
| 3 | `defineRoutes.test.ts`: denied → import function never called; bad uuid → 404. Manual: `/inspection/abc` → 404, Network tab shows **no** inspection chunk |
| 4 | `routes.test.ts` static tree assertions. Manual: sign in as host, open `/admin/dashboard` → 403 at that URL, Network tab shows **no** admin chunk |
| 5 | Manual checklist in `p5.md` (numbered, browser-only by D44) |
| 6 | `usePreloadRoute.test.ts` fake-timer cases. Manual: hover a menu item 100 ms → chunk downloads; click → no progress bar |
| 7 | `apartment.test.ts`: key/args identity between prefetch and page. Manual: Apartment detail's API request starts with the chunk (waterfall count 0) |
| 8 | `bundleBudget.test.ts` + `npm run perf:bundle` |
| 9 | `tree.test.ts` + `router.behaviour.test.ts` in `npm run gate`, plus the seven deliberate violations of step 9.4 each observed to fail |

## Test plan for this feature

Eleven test files, all under `npm run gate` except the bundle budget (which self-skips without a
build):

| Phase | Test file | Covers |
| --- | --- | --- |
| 1 | `src/lib/router/session.test.ts` | snapshot shape for anonymous / guest / host; subscribe/unsubscribe; a role change notifies once |
| 2 | `src/lib/router/params.test.ts` | every `ParamType` valid + invalid; parse ↔ stringify round trip; `areParamsValid` on absent optional |
| 2 | `src/lib/router/access.test.ts` | rule-name uniqueness; `can…` naming; one table per combined rule; `canOpenPath` = every inherited rule |
| 3 | `src/lib/router/defineRoutes.test.ts` | untyped `:param` throws; duplicate sibling id throws; a parent rule is inherited into the child's guard root-first; variant filtering; 403 before the page import when a rule fails; 404 before the page import when a param is invalid; imports and returns null when the checks pass; enforces the whole inherited chain; stable ids per pattern and kind; `matchRoutes` resolves a nested URL |
| 3 | `src/lib/router/paths.test.ts` | `buildPath` with each param type; a pattern with no params takes no argument; multi-segment patterns; `requires`/`pattern` stay literal |
| 4 | `src/lib/router/routes.test.ts` | builds without throwing; every top-level section has a rule; every `:param` typed; no duplicate route id; a section rule is inherited into every child; `/host` and `/admin` have an index redirect to a child they can open; every guard-carrying route sits under a boundary that can render an error |
| 5 | — | exempt by D44 |
| 6 | `src/hooks/usePreloadRoute.test.ts` | 100 ms fires; 50 ms + leave does not; disabled never |
| 7 | `src/lib/api/queries/apartment.test.ts` | the route's `prefetch` and the page's `useQuery` produce an identical `queryKey` and call the same request fn once |
| 8 | `src/lib/router/__checks__/bundleBudget.test.ts` | main chunk ≤ budget; self-skips when `dist/` is absent |
| 9 | `src/lib/router/__checks__/tree.test.ts` | H13 checks against the real tree: every `appPaths` definition matched to a route with the same inherited rules and params |
| 9 | `src/lib/router/__checks__/router.behaviour.test.ts` | 404 on bad params; 403 in place; index redirect; admin allowed; `/login` reachable signed out; an unknown URL matched by `*` rather than erroring |

## Deployment requirements (R35)

There is no deploy config in this repo (no netlify/vercel/Dockerfile/nginx/caddy — checked
2026-10-27). These are the headers the deployment must set; they are the server half of R35 and the
reason a repeat visit loads only `index.html` and API data:

| Path | Header | Why |
| --- | --- | --- |
| `/assets/*` (Vite's hashed output) | `Cache-Control: public, max-age=31536000, immutable` | A hashed filename can never change, so it can be cached forever (R35) |
| `/index.html` | `Cache-Control: no-cache` | It is the one file that must always be revalidated, or a deploy is invisible to open tabs |
| `/locales/*.json` | `Cache-Control: public, max-age=3600` | Reference data that changes with a deploy; an hour is short enough to be safe |
| everything else | `Cache-Control: public, max-age=300` | Conservative default |

Also required: brotli or gzip compression on text assets, and HTTP/2 or better. Without compression
the bundle budget above is measured on bytes the user never downloads, so the numbers stop matching
reality.

If a service worker is ever added to precache route chunks, it **must not** serve a cached
`index.html` — that is the one file whose staleness breaks a deploy (R35).

## Phase 9's lint-lock lesson (flat-config trapping)

Step 9.4 proved two of the four locks were dead. Under flat config, `no-restricted-syntax` is
**replaced wholesale** by the last matching config object — the selector arrays do *not* merge. The
original `eslint.config.js` had four objects all matching `src/**/*.{ts,tsx}`, each redefining that
rule, so only the last one survived; the "routes are data" (R1/R34) and role-comparison (R26) locks
never fired.

The rule for this repo: **one `no-restricted-syntax` entry per `files` scope, with selectors combined
in a single array, and `ignores` covering every rule in that object.** If you add a fifth lock, add it
to an existing object's selector array — do not create a new object with the same `files` glob. The
config is verified load-bearing by step 9.4's seven cases; re-run them if you touch it.

## Halt conditions

- `npm run gate` red and one honest fix attempt does not clear it
- The plan contradicts the code in a way that changes observable behaviour
- A step needs a file outside its Touch list
- A decision the plan does not cover changes observable behaviour
- A step needs a translation key that exists in no locale file
- A react-router export a step assumes is absent from
  `node_modules/react-router/dist/development/index.d.ts`
- Phase 3+: `src/lib/router/routes/index.ts` fails to compile in a way the step's Do block does not
  explain — do not invent a route shape to make it compile
- **Stopping the dev server:** if `npm run dev` reports a module-level `createBrowserRouter`, a step
  reintroduced module-level router construction. That is principle 6 and D5 — fix the step, do not
  work around it
- Any step that makes `npm run dev` render a blank page at `/` (the app's entry URL) is a regression,
  not a cosmetic issue — halt even if `npm run gate` is green

## Definition of done

- [x] `npm run gate` green on `feature/49_router-improvements` (2026-10-27: exit 0, `Test Files 12 passed (12)`, `Tests 108 passed (108)`)
- [ ] Every phase's manual checklist (P3–P8) walked and ticked by the operator in a browser — these are
      superseded by **step 9.6**, which is their superset; walk that one
- [x] Row 0 of the tracker in `docs/routing-performance-baseline.md` filled (P1) and the final row
      filled after P8 — **done 2026-10-27** (step 9.5): row `8` is `9.2 | 7.2 | 0 | 1 | 90566 | 3/3`
- [x] `npm run dev` shows: warm navigation with no progress bar, `/host` → `/host/dashboard`, unknown
      URL → 404 inside the shell, host at `/admin/dashboard` → 403 with no admin chunk requested —
      **all four confirmed 2026-10-27** (step 9.6), except the A11y row, which fails
- [x] No hand-edits under `src/api/generated/` (`git status --porcelain src/api/generated/` → empty)
- [x] No route object contains `lazy` / `element` / `Component` / `ErrorBoundary` / a hand-written
      `loader` outside `defineRoutes.tsx` — now enforced by the repaired R1/R34 lint lock (step 9.4)
- [x] Role literals appear only in `src/lib/router/access.ts` (plus `src/lib/auth.ts`, the role type's
      home, and tests) — now enforced by the repaired R26 lint lock (step 9.4)
- [ ] Docs commits separate from code commits; one commit per phase — **operator**
- [ ] The PR calls out the deliberate replacement of repo invariant 4 (D5) and the three observable
      behaviour changes: 403 in place (D1), `/host` index redirect, and 404-inside-the-shell

### Open items (both operator-only)

1. **Step 9.5** — fill the `8` row and the `## Final` metrics in `docs/routing-performance-baseline.md`.
2. **Step 9.6** — the browser pass, which covers every earlier phase's checklist.
