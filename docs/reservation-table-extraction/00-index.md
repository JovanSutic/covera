# Reservation table extraction — execution index

Spec: [../reservation-table-extraction.md](../reservation-table-extraction.md) · Decisions: [../reservation-table-extraction.decisions.md](../reservation-table-extraction.decisions.md)

## Phases

| Phase | File | Touches | Outcome | Requires |
| --- | --- | --- | --- | --- |
| 1 | [p1.md](./p1.md) | `src/lib/helpers/proofWindow.ts`, `src/lib/helpers/proofWindow.test.ts` | `getProofWindowState` also answers "is this stay over", for both the effective check-out and the plain one, with tests proving every branch | — |
| 2 | [p2.md](./p2.md) | `src/hooks/useReservationActions.ts`, `src/components/host/ReservationActionsMenu.tsx`, `src/components/host/ReservationHeaderActions.tsx` | A past stay offers no actions, in the table's menu and on the page's header alike | 1 |
| 3 | [p3.md](./p3.md) | `src/components/host/ReservationsTable.tsx`, `src/pages/host/IndividualApartment.tsx` | The table is table-only, the page owns the chrome, every row is clickable, and no column sets its own type | 1 |
| 4 | [p4.md](./p4.md) | `public/locales/*/host.json` | The four new tooltips exist in `en`, `de`, `tr`, `sr-Latn` | 2 |

## Dependency rules

- A legal landing order: **1 → 2 → 3 → 4**. Phases 2 and 3 are independent of each other (they touch
  disjoint files) and either may land first; 4 depends on 2 only.
- Do not start phase 2 before phase 1 — phase 2's `useReservationActions` reads `window.isPast`, the
  field phase 1 adds to `getProofWindowState`. Referencing it before phase 1 lands is a red `tsc`.
- Do not start phase 4 before phase 2 — it translates the four keys phase 2's components reference.
  `i18n:translate` copies whatever `en` holds, so running it first would translate four keys nobody
  uses and then need a second run.
- Phase 3 does not import phase 1's field and does not reference phase 4's keys, but it is ordered
  last of the two independent phases only because its `tsc` is cleanest with 2 already landed.
- Inside phase 2, step 2.1 precedes its two consumers (2.2, 2.3) — it is what puts the field they
  read on the hook.
- Inside phase 3, step 3.3 restores the create affordance step 3.1 removes from the table, so **3.3
  must not be skipped or reordered before 3.1** or the screen loses its only way to create a
  reservation. The tree compiles at every boundary regardless; the gate is what proves it.
- **No router file is touched.** No path, route entry, or lazy import changes.
- **No generated file is touched.** No `api:generate` run, no hard stop.

## Invariants — check at every phase boundary

1. `src/api/generated/` is not hand-edited; regenerate with `npm run api:generate` instead.
2. No hardcoded user-facing strings — every key exists in `en`, `de`, `tr`, and `sr-Latn`.
3. No secret in a `VITE_` env var; everything so prefixed ships to the browser.
4. Routes live in `src/lib/router/routes/*.ts` as `page: () => import(...)` entries built by
   `defineRoutes`; every authenticated branch carries a rule name from `ACCESS_RULES`.
5. Query keys come from `QUERY_ACTIONS`; no string literals at `useQuery` / `invalidateQueries`
   sites. This feature adds no key and moves no call site.
6. Network calls go through `withAuth()` / `publicApi()`.
7. Mutations invalidate the keys they changed. This feature changes no mutation's invalidation.
8. Forms validate with a zod schema resolved through `@hookform/resolvers`.
9. **Feature-specific: the past-date rule is computed only in `getProofWindowState`.** No component
   derives it from `checkOutDatetime` or `alternativeCheckOutDatetime`. If a surface needs a variant
   of the answer, it extends the helper and its test — it does not copy the comparison.
10. **Feature-specific: `DataTable`'s props and markup are unchanged.** The table's `className`
    contract, its header styling, and `isRowDisabled` all stay exactly as they are (D9, D10).
11. **Feature-specific: `ReservationsTable` renders no section chrome** — no heading, no
    description, no create button, in any state including empty (D7, D12).
12. **Feature-specific: the table's empty state still exists** and still renders its title and
    description text (D12). Only the button leaves it.
13. **Feature-specific: every past-stay gate is `isPast || <the item's original rule>`.** No item's
    existing disabled rule is replaced by the past check — the two are OR-ed, so a reservation that
    is past *and* already covered stays disabled for both reasons. The one item whose shape changes
    is the copy-guest-message item, which becomes a ternary because its `Popover` trigger is the
    click target; its enabled branch keeps the original `hasInspection` rule verbatim (D17).
14. **Feature-specific: the side-effect buttons are never inside a `PopoverTrigger` on the disabled
    path.** `PopoverTrigger` is a `<div onClick={toggleOpen}>`, so `disabled` on a button inside it
    is inert (D17). A disabled past-stay item renders outside any popover.

## Execution protocol

```
You are executing a pre-written plan, one phase at a time. Do not design, redesign, or improve it.

SOURCES
- docs/reservation-table-extraction/00-index.md — read ONCE at the start (dependencies, invariants, halt conditions).
- docs/reservation-table-extraction/p<N>.md — read ONLY the phase file you are about to execute.
- docs/reservation-table-extraction.decisions.md — read ONCE. If a decision is missing, HALT; do not decide it.

SCOPE
- Execute phases 1–4 in order. Stop at the phase boundary.

PRECONDITION
- `npm run gate` must pass in the repo the phase targets. If not, STOP and report.

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

### Division of labour

- **Executor:** edits, runs `npm run gate` per step, never commits.
- **Operator:** runs the gate at each phase boundary, makes **one commit per phase**, and owns the
  `i18n:translate` run in phase 4 (it needs network). In `covera` nothing enforces this — no hook, no
  CI — so the gate is the only thing catching a regression.
- Clear context at phase boundaries, not mid-phase.
- Tier the model per step: cheap for transcription, strong for phase 1 (the precedence rule and its
  edge cases) and for review.

## Test plan for this feature

- **Phase 1, step 1.2** — `src/lib/helpers/proofWindow.test.ts`, extending the existing 9-case suite
  with 6 cases: `isPast` true after the effective check-out; `isPast` false before it; `isPast` reads
  the alternative check-out when one is set (the precedence rule); `isPast` is `true` for a corrupt
  or missing check-out; `isPastEnd` ignores the alternative; and the existing states are unchanged
  when a reservation is past (the two questions are independent).
- **Phases 2, 3 and 4 are exempt (D15)** — OR-ing one already-tested field into existing `disabled`
  expressions, markup movement with className deletion, and copy plus a translation run, with no new
  branch logic. The operator's click-through is the check that fits.
- This repo's gate has **no** `--passWithNoTests`; `covera` already has 180 tests, so no gate
  promotion is part of this feature.

## Halt conditions

- Gate red in the target repo and one honest fix attempt does not clear it
- The plan contradicts the code in a way that changes observable behaviour
- A step needs a file outside its Touch list
- A decision the plan does not cover changes observable behaviour
- A step needs a translation key that exists in no locale file
- The generated client does not export the request function a step assumes
- `npm run i18n:translate` fails (it needs network access to Google Translate) and leaves the new
  keys missing from `de`, `tr`, or `sr-Latn`
- A step finds that removing `isRowDisabled` from the table's `DataTable` call breaks another
  `DataTable` caller, or that `getProofWindowState`'s two new fields change any of its three
  existing call sites' behaviour

Report raw output, file and symbol, the options, and a recommendation. Do not proceed past it.

## Definition of done

- [ ] `npm run gate` green in `covera` on the feature branch
- [ ] `isRowDisabled` is gone from `ReservationsTable`'s `DataTable` call; a past-date row renders
      undimmed and navigating from it works
- [ ] All four kebab items are disabled for a past reservation, each with its own tooltip, and
      **none of them opens anything** — in particular the copy-guest-message item shows no popover
      (D17: `PopoverTrigger` is the click target, so a disabled button inside one is inert)
- [ ] The reservation page's header buttons disable by the same rule, with the copy button likewise
      showing no popover
- [ ] `ReservationsTable` renders no heading, description, or create button in any state, including
      empty, and references none of `.title`, `.description`, `.newReservationButton`; it takes
      exactly `{ apartmentId, onTakeProofs }`
- [ ] The heading, description and create button render in `IndividualApartment.tsx` and open the
      create drawer
- [ ] No column in the table overrides its own font, size or colour; platform-id's header and cell
      match the rest
- [ ] `DataTable` and `component.types.ts` are unmodified: `git diff --stat` names neither
- [ ] Every new i18n key is present in `en`, `de`, `tr`, and `sr-Latn`
- [ ] No hand-edits under `src/api/generated/`; no router file touched
- [ ] `docs/` commit separate from code commits
- [ ] Every decision in `reservation-table-extraction.decisions.md` is `APPROVED` and reflected in
      the code
- [ ] Operator has clicked through: apartment → reservations tab → a past reservation row is visible
      and opens → its kebab shows four disabled items with tooltips, **and clicking the copy item
      opens no popover** → a current reservation's kebab still works, including its copy item → the
      create button above the table still opens the drawer → the empty state (an apartment with no
      reservations) still reads correctly and has no button
