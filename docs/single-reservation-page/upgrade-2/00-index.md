# Reservation page upgrade 2 — execution index

Spec and decisions: [`../upgrade-2.md`](../upgrade-2.md). Read that once; it carries the
corrections to the prep's diagnosis (prep §1 and §6 are both wrong about the cause) — do not
re-derive them from `upgrade-prep-1.md`.

## Phases

| # | File | Files touched | Outcome (prep bullet) | Needs |
| --- | --- | --- | --- | --- |
| 1 | [p1.md](./p1.md) | `src/components/shared/InfoTooltip.tsx`, `src/components/shared/ActionButton.tsx`, `src/components/host/ReservationActionsBar.tsx` | Tooltips render at all widths, open above the trigger, and are unclipped; the bar wraps instead of scrolling; delete's tooltip is gone (§2, §3, §4) | — |
| 2 | [p2.md](./p2.md) | `src/lib/helpers/reservationActions.ts` (+ test), `src/hooks/useReservationActions.ts`, `src/components/host/ReservationActionsBar.tsx`, `src/components/host/ReservationActionsMenu.tsx`, `public/locales/*/host.json` | One rule table for both surfaces: delete from the table works in place, create-link matches the backend guard, copy is always present and enabled only when usable, every action dies at effective check-in (§1, §6, §7) | 1 |
| 3 | [p3.md](./p3.md) | `src/components/host/ReservationProofSection.tsx`, `src/pages/host/ReservationPage.test.tsx` | The photo-proofs control is enabled whenever photos exist **or** the reservation is covered (§5) | 1 |
| 4 | [p4.md](./p4.md) | `src/lib/validations/reservationDates.ts` (+ test), `src/components/host/ReservationTimeSection.tsx` | Alternative check-in/out are capped at booked + 8h, in the schema and in the input (§8) | — |

Four phases, four commits. Docs are committed separately from code.

## Dependency graph

```
p1 (tooltip primitives) ──┬─> p2 (rule table + both surfaces)
                          └─> p3 (photos enabled)
p4 (8h cap) — independent
```

- **p2 needs p1** because p2 rewrites `ReservationActionsBar`'s buttons and must not fight p1
  over the same JSX. Landing both in one phase would make the phase unreviewable.
- **p3 needs p1** only because `ReservationProofSection` renders `ActionButton`, whose shape p1
  changes. It does not read anything p2 introduces.
- **p4 is independent** and may be run first if a smaller first commit is wanted.

## Invariants to check after every phase

The nine in `.claude/skills/feature-kickoff/SKILL.md` §"Invariants", plus three for this feature
(`../upgrade-2.md` §"Invariants"):

- **10 — one clock per surface.** `getProofWindowState` is called once with a render-time
  `now`. `getReservationActionAvailability` calls it internally; callers pass `now`, never a
  second `Date.now()` and never a pre-computed window.
- **11 — tooltips are always-on.** No `hidden sm:` (or any width gate) on the tooltip
  affordance anywhere in `ActionButton`/`InfoTooltip`.
- **12 — `data-row-click-stop` survives a portal.** Every `PopoverContent` rendered inside a
  `DataTable` row carries it.

## Execution protocol

```
You are executing a pre-written plan, one phase at a time. Do not design, redesign, or improve it.

SOURCES
- docs/single-reservation-page/upgrade-2/00-index.md — read ONCE at the start.
- docs/single-reservation-page/upgrade-2/p<N>.md — read ONLY the phase file you are about to execute.
- docs/single-reservation-page/upgrade-2.md — read ONCE. If a decision is missing, HALT; do not decide it.

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

## Known deviation from the skill

**p2 is 898 lines, over the skill's ~400-line target.** It is kept whole because its subject is
*one* thing — "the four reservation actions behave the same on both surfaces" — and the surfaces
cannot be split from the rule table that decides them without leaving a red gate at the boundary
for a reason no step in either half could fix. The steps inside it are self-contained and each
names its own Touch, so an executor can still read one at a time. Of the 898 lines, 693 are
verbatim code (`Do` blocks and test bodies) and 205 are prose; p1, p3 and p4 are all well inside
the target.

## Verification already performed during planning

The plan was not written blind. These were run against the real tree before the plan was handed
over, and the plan text was corrected where the experiment disagreed with it:

- **Prep §1's root cause was reproduced and confirmed.** A throwaway test rendering the menu
  through the real `DataTable` showed `onRowClick` firing when a row inside the portalled menu was
  clicked — the "redirected to the reservations/:id page" symptom — and not firing once
  `data-row-click-stop` was on the `PopoverContent` portal. Step 2.2's test is that experiment, and
  step 2.2's Accept asks the executor to re-run it as a negative control.
- **p2's rule table and its 13 tests compile and pass** as written (`npx tsc -b` clean,
  `vitest run` 13/13), so the Do block is known-good rather than believed-good.
- **p4's schema factory and its cap logic pass** (6/6 in a scratch harness, including the
  refine-ordering case and the exactly-8h boundary).
- **p1 + p2 + p3 + p4 applied together pass the whole gate**: 24 files, **244 tests**, up from a
  219-test baseline. The tree was then restored, so the baseline is still 219 and nothing is
  pre-applied.
- **Four negative controls were run** to prove the new tests guard their fixes rather than merely
  passing: removing the portal attribute, reverting the proof enable rule, neutering the cap
  refine, and restoring the menu's old hide/show behaviour each made the corresponding test fail.
- Two defects in the plan's own draft were found this way and fixed: the hook step removed
  `isDeletable`/`isPast` while still returning them (which `ReservationHeaderActions.tsx` reads),
  and the time-section step put the memoised schema inside `useForm`'s argument object. Two
  `Accept` greps were also corrected — they were counting matches inside doc comments.

## Halt conditions

Stop and report if any of these is true:

- `npm run gate` is red at a phase boundary.
- A phase's Do block does not match the file it names (symbol renamed, moved, or already
  containing the target change).
- `ReservationWithInspection` no longer carries `hasPhotoProof` or `status` — p2's rule table
  depends on both.
- `deleteReservationsById` / `postInspections` are no longer exported from
  `src/api/generated/requests/services.gen`.
- Completing a step requires editing anything under `src/api/generated/` (invariant 1).

## Definition of done

- `npm run gate` green on the final commit.
- All seven new `host` locale keys present in `en`, `de`, `tr`, and `sr-Latn`.
- Prep §1–§8 each traceable to a phase in the table above.
- No `hidden sm:` left on any tooltip affordance.
