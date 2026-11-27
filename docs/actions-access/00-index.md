# Actions & access — execution index

Spec: [../actions-access.md](../actions-access.md) · Decisions: [../actions-access.decisions.md](../actions-access.decisions.md)

Baseline verified green **2026-11-26**: `npm run gate` → exit 0, `Test Files 51 passed (51)` /
`Tests 549 passed (549)`.

**The backend is deployed.** Every probe in `docs/handoff.md` §4 answers its "required now" value
(probed 2026-11-26; the table is in `docs/actions-access.decisions.md` §"Facts verified"). So unlike
`feature/46`, **no phase here is unverifiable** — every acceptance criterion is a real request or
`npm run gate`.

**The regenerated client is already in the working tree, uncommitted.** `npm run api:generate` has
been run against the deployed document. Phase 1 adopts it. Do not re-run `api:generate` mid-plan
unless the backend changes — it is a network step and would rewrite the tree under the executor.

## Phases

| Phase | File | Touches | Outcome (observable gain) | Requires |
| --- | --- | --- | --- | --- |
| 1 | [p1.md](./p1.md) | `src/api/generated/**` (adopt), `src/lib/api/queryKeys.ts`, `src/lib/api/specialAccess.ts`, `src/lib/api/specialAccess.test.ts` (new) | The generated client is committed; the `as never` cast is gone, so a backend rename of `accessId` is a compile error instead of a silent 401 | — |
| 2 | [p2.md](./p2.md) | `src/lib/helpers/claimDeadline.ts`, `src/lib/helpers/actionWindows.ts` (new) | The four button rules exist as one pure function, and the claim window has a reason | — |
| 3 | [p3.md](./p3.md) | `src/lib/helpers/actionWindows.test.ts` (new), `src/lib/helpers/claimDeadline.test.ts` | Every one of the four rules is pinned by a test, including the same-day checkout/check-in case | 2 |
| 4 | [p4.md](./p4.md) | `src/lib/router/access.ts`, `defineRoutes.tsx`, `createAppRouter.tsx`, `routes/public.ts`, `access.test.ts`, `router.behaviour.test.ts` | A route may admit a visitor holding a named query parameter, so a photographer's link reaches the guide page instead of a router 403 | — |
| 5 | [p5.md](./p5.md) | `src/lib/api/submitPhotoProofs.ts`, `src/pages/InspectionGuidePage.tsx`, `public/locales/*/host.json` | A guest with a link can collect **and submit** the proofs; an invalid link says so | 1, 4 |
| 6 | [p6.md](./p6.md) | `src/pages/host/IncidentProofsPage.tsx`, `src/lib/api/queries/{incident,assets,reservation,reservationPhotos}.ts`, `src/lib/api/incidentClaims.ts`, `src/components/host/incident/IncidentItemEvidence.tsx`, `public/locales/*/host.json` | A guest with a link can open the claim-proofs page and capture evidence | 1, 4 |
| 7 | [p7.md](./p7.md) | `src/lib/api/queries/specialAccess.ts` (new), `src/lib/helpers/specialAccessState.ts` (new) + test, `src/components/host/ReservationLinksSection.tsx`, `public/locales/*/host.json` | A host sees every link for a reservation, not just the one this session minted, and can revoke any of them | 1 |
| 8 | [p8.md](./p8.md) | `src/lib/router/routes/host.ts`, `src/hooks/useReservationActions.ts`, `src/lib/helpers/reservationActions.ts`, `src/components/host/ReservationActionsBar.tsx`, `ReservationLinksSection.tsx`, `src/pages/host/ReservationPage.tsx`, `public/locales/*/host.json` | Buttons 2 and 4 obey their windows and live in the Access links section | 2, 7 |
| 9 | [p9.md](./p9.md) | `src/lib/router/routes/host.ts`, `src/components/host/incident/ReservationIncidentSection.tsx`, `src/pages/host/IncidentPage.tsx`, `public/locales/*/host.json` | Buttons 1 and 3 obey their windows | 2, 8 |

## Phase sizes — one recorded exception

`node scripts/plan-budget.mjs docs/actions-access/00-index.md docs/actions-access/p*.md` → **exit 0**,
2,591 lines of 4,000, largest single block 246 of 250.

**`p4.md` is 424 lines — over the 400 soft limit by 24.** Recorded rather than cut: the overage is
the §"Why this phase is split this way" preamble and the per-step classifier commentary, which is
the one thing in this plan an executor must read before touching the guard. Its largest fenced block
is 45 lines and its six steps average ~32 lines of code each, so no step is carrying a module. The
skill's rule is that a single soft `OVER` is a prompt to look, not a stop.

## Dependency graph

```
P1 ──┬── P5 ──┐
     ├── P6  │
     └── P7 ──┴── P8 ── P9
P2 ──┬── P3  │
     └───────┴── P8, P9
P4 ──┴── P5, P6
```

Edges, and why each exists:

- **P3 needs P2** — the tests import `actionWindows` and the widened `claimOpenState`.
- **P5, P6 need P1** — both call the access-aware fetchers and the guest submit chain P1 creates.
- **P5, P6 need P4** — without the guard, a link holder is refused by the router before the page
  renders, so the guest branch is unreachable and the phase is unobservable.
- **P7 needs P1** — it calls `listSpecialAccess` and the `SPECIAL_ACCESS_LIST` key P1 adds.
- **P8 needs P2** (the helper) and **P7** (the section it edits).
- **P9 needs P2** (the helper) and **P8** (the locale block P8.6 writes; P9 reuses its keys).

**P8 and P9 are otherwise independent** and may be executed in either order. They share
`src/lib/router/routes/host.ts` and the locale files, so if two executors run at once, serialize
those two files.

**P1 must be committed before P5/P6/P7 start**, because those phases' Accept commands read the
generated types P1 commits.

## Invariants — check at every phase boundary

The eight repo invariants, plus this feature's four (spec §"Invariants"):

1. `git status --porcelain src/api/generated/` → **empty**. Phase 1 commits the regeneration; no
   later phase may touch it.
2. Every key a phase adds exists in all four of `public/locales/{en,de,tr,sr-Latn}/host.json`.
   **Never run `npm run i18n:translate`** — it corrupts array-valued keys.
3. No new `VITE_`-prefixed variable.
4. Routes live in `src/lib/router/routes/*.ts`; `src/App.tsx` mounts the router only.
5. Query keys come from `QUERY_ACTIONS`. Phase 1 adds `SPECIAL_ACCESS_LIST`; no phase invents a
   literal.
6. Network calls go through `withAuth()` / `publicApi()`.
7. Mutations invalidate what they changed.
8. Forms validate with a zod schema — n/a, no new form.
9. **One computation per rule** — every enable rule comes from a helper.
10. **One clock per page** — `now` is captured once at render and passed down.
11. **A page holding a link never calls `withAuth()`.**
12. **A token `PATCH /reservations/{id}` sends only `hasPhotoProof` and `status: "COVERED"`.**

## Execution protocol

```
You are executing a pre-written plan, one phase at a time. Do not design, redesign, or improve it.

SOURCES
- docs/actions-access/00-index.md — read ONCE at the start (dependencies, invariants, halt conditions).
- docs/actions-access/p<N>.md — read ONLY the phase file you are about to execute.
- docs/actions-access.decisions.md — read ONCE. If a decision is missing, HALT; do not decide it.

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
- the generated client does not export the request function a step assumes;
- **an Edit is refused by the permission classifier** (see below).

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

### The permission-classifier hazard — read this before phase 4

On **2026-11-25** and again on **2026-11-26** (re-verified while writing this plan), the Claude Code
auto-mode classifier **refuses** the edit that changes what a route guard admits, with reason
`[Security Weaken]`. The measured boundary:

- **Allowed:** adding type declarations — `AccessParamName` / `hasAccessParam` in `access.ts`, the
  `accessParam?` field on `RouteBase` and `GuardMeta`.
- **Refused:** every decision-changing edit — `GuardMeta.accessParam`'s *use* in `makeLoader`'s rule
  loop, `guardPasses`, and the `requires` lines in `paths.ts` / `routes/public.ts`.
- `createAppRouter.tsx`'s preloader loop was allowed on 2026-11-25 (it gates prefetching, not
  admission).

**Phase 4 is therefore split so that its refusable steps are isolated and last.** Steps 4.1–4.4 are
type declarations and pure functions (allowed). Step 4.5 is the admission change. If 4.5 is refused:

1. Do **not** reword the edit to evade the classifier — that is permission laundering.
2. Revert 4.1–4.4 (`git checkout -- <files>`) so the tree stays green and the phase is a clean no-op.
3. Report: the raw denial, the file and symbol, and that the operator must either approve the edit
   interactively or accept D1's deferral.
4. Phases 5 and 6 are then **blocked** (a link holder is still refused by the router). Phases 1, 2,
   3, 7, 8 and 9 are unaffected and should proceed.

## Halt conditions

- `npm run gate` red and one honest fix attempt does not clear it
- The plan contradicts the code in a way that changes observable behaviour
- A step needs a file outside its Touch list
- A decision the plan does not cover changes observable behaviour
- A step needs a translation key that exists in no locale file
- The generated client does not export a request function a step assumes
- **An Edit is refused by the permission classifier** — revert the phase and report; do not reword
- Any step that makes `npm run dev` render a blank page at `/` is a regression, not a cosmetic issue
- A step that changes `src/api/generated/` by hand (rather than by `api:generate`) — halt

## Definition of done

- [ ] `npm run gate` green, with the test count **above** the 51 files / 549 tests baseline
- [ ] Every new i18n key present in all four locales (`grep` per phase, not just the gate — the
      parity check only asserts `en ⊆ <locale>`)
- [ ] `git status --porcelain src/api/generated/` → empty after phase 1
- [ ] The probe table in `docs/handoff.md` §4 re-run and recorded (this is the feature's own
      definition of done for workstream A)
- [ ] A photographer's link opens `/inspection-guide/...?accessId=…` with no session and can submit
- [ ] A link holder opens `/incident/:id/proofs?accessId=…` and captures evidence
- [ ] A host reloading the reservation page sees and can revoke a link minted in a previous session
- [ ] All four buttons obey their windows (each has a helper test)
- [ ] Docs commits separate from code commits; one commit per phase
- [ ] The PR calls out: the guard's admission change (D1), the button-2 relocation (D17), the
      button-4 rename (D18), and the guest submit path (D3)
