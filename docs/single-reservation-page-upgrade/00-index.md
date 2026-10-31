# Single reservation page — upgrade — execution plan

**Spec:** [`../single-reservation-page-upgrade.md`](../single-reservation-page-upgrade.md)
**Decisions:** [`../single-reservation-page-upgrade.decisions.md`](../single-reservation-page-upgrade.decisions.md)
**Prep (the asks):** [`../single-reservation-page/upgrade-prep.md`](../single-reservation-page/upgrade-prep.md)

Read this file **once**, at the start. Then read only the phase file you are about to execute.

**Baseline:** `6d4034e Feature/47 single reservation page (#36)` on
`feature/47_reservation-page-upgrade`. The previous plan's six phases are merged, so this is a
follow-up pass over shipped code — not a re-plan, and with no backend dependency.

---

## Phase table

| Phase | File | Touches | Outcome | Needs |
| --- | --- | --- | --- | --- |
| 1 | `p1.md` | `src/components/shared/{InfoTooltip,ActionButton,ConfirmButton,BackLink,SectionCard}.tsx` (new); `src/components/host/ApartmentHeader.tsx`; `src/pages/InspectionGuidePage.tsx` | The shared design system exists, and the two headers that share a back link render through it | — |
| 2 | `p2.md` | `src/lib/helpers/proofSummary.ts` (+ test); `public/locales/*/host.json`; `src/lib/api/queries/inspection.ts`; `src/components/guest/RoomPhotoItem.tsx`; `src/pages/InspectionGuidePage.tsx`; `src/hooks/useReservationActions.ts`; `src/lib/__checks__/localeParity.test.ts` (new) | Every fact the UI describes is now computed once and proven by a test; the four missing `de`/`tr`/`sr-Latn` keys are repaired | 1 |
| 3 | `p3.md` | `src/components/host/ReservationHeader.tsx` (new); `src/components/host/ReservationActionsBar.tsx` (new) | The page's header and its action bar exist, unrendered | 2 |
| 4 | `p4.md` | `src/components/host/ReservationProofSection.tsx`; `src/components/host/ReservationPhotoGallery.tsx`; `src/components/host/ReservationTimeSection.tsx` | The Proof section holds still, opens a dialog, and reports the count; all three sections share one shell | 1, 2 |
| 5 | `p5.md` | `src/components/host/ReservationActionsMenu.tsx`; `src/components/host/ReservationsTable.tsx`; `src/pages/host/IndividualApartment.tsx`; `src/components/forms/CreateReservationForm.tsx` | The table's menu is one clickable row per action, headed `Actions`, with only copy + delete; a created reservation navigates to its page | 1, 2 |
| 6 | `p6.md` | `src/pages/host/ReservationPage.tsx`; `src/pages/host/ReservationPage.test.tsx` (new) | The page assembles into header → actions → Proof → Time → Other, with one page-level test | 1–5 |

Phases 3, 4 and 5 are independent of each other and all depend on 1 and 2. Execute them in the
numbered order anyway: 3 and 4 both land components the page mounts in 6, and reading them in
order keeps one mental model rather than three.

### Why each dependency

- **2 needs 1** — phase 2's `RoomPhotoItem` change and its copy are only meaningful once
  `SectionCard` and `ActionButton` exist to render them; and the header refactor in 1.7 is what
  the guide page's step 2.7 builds on. Split this way, a red gate after phase 2 is a red gate in
  a helper, not in a layout.
- **3 needs 2** — the header and the bar render `reservationPage.actions.*`, which phase 2 adds to
  all four locales. Rendering them first would render raw keys.
- **4 needs 1 and 2** — it uses `SectionCard` and `ActionButton` (1), and consumes
  `summarizeShotProofs`, `proofStatusCopy`, the `enabled` parameter and `mode="host"` (2).
- **5 needs 1 and 2** — `ConfirmButton` (1) and the `columns.actions` key (2).
- **6 needs 1–5** — it is the only phase that changes what a user sees, and it can only do that
  once every piece it assembles exists.

---

## Invariants — check after **every** phase

From the skill's global list, plus this feature's own:

1. `src/api/generated/` is generated. **Never hand-edit it**, and never run `npm run api:generate`
   (its output is unreviewable and it needs a live backend).
2. No hardcoded user-facing strings. Every key exists in `en`, `de`, `tr` and `sr-Latn` —
   `src/lib/__checks__/localeParity.test.ts` is the check, added in phase 2.
3. No secret in a `VITE_`-prefixed env var.
4. Routes live in `src/lib/router/routes/*.ts`. **This feature adds none**, so this is a
   no-regression check only.
5. Query keys come from `QUERY_ACTIONS` — no string literals at a call site.
6. Network calls go through `withAuth()` / `publicApi()`. `fetchInspection`'s deliberate anonymity
   is unchanged.
7. Mutations invalidate what they changed.
8. Forms validate with a zod schema through `@hookform/resolvers`. **No new schema** in this pass.
9. **`getProofWindowState` is the only computation of "can this host take shots"**, and on the
   reservation page it is called in exactly one place — the page — with the answer passed down as
   a prop.
10. **`summarizeShotProofs` is the only computation of the photo count and the last capture time.**
11. **Every action button on the reservation surface renders through `ActionButton`.** A raw
    `<button>` with bespoke colour classes in `ReservationActionsBar` or `ReservationProofSection`
    is the regression this pass exists to prevent.
12. **Delete renders through `ConfirmButton`** on both surfaces. The confirmation step is never
    inlined again.

The gate is the other invariant check: `npm run gate` must be green at every phase boundary.

---

## Test plan

| Phase | Test step | Why |
| --- | --- | --- |
| 1 | none | Purely additive primitives plus two refactors onto one of them (D24) |
| 2 | `proofSummary.test.ts` (16), `localeParity.test.ts` (13) | Pure logic: two functions with a precedence table, plus the repo's highest-value structural check |
| 3 | none | Two presentational components nothing renders yet (D24) |
| 4 | none | Markup and prop wiring; no new branch a unit test could pin (D24) |
| 5 | none | A menu extraction and one navigation call (D24) |
| 6 | `ReservationPage.test.tsx` (5) | Composition: three sections in order, and the two proof-control states the prep is about |

The opt-outs are D24 in the decisions file, exercised deliberately rather than by silence.

---

## Execution protocol

Hand this block to the executor with `<feature>` = `single-reservation-page-upgrade`.

```
You are executing a pre-written plan, one phase at a time. Do not design, redesign, or improve it.

SOURCES
- docs/single-reservation-page-upgrade/00-index.md — read ONCE at the start (dependencies, invariants, halt conditions).
- docs/single-reservation-page-upgrade/p<N>.md — read ONLY the phase file you are about to execute.
- docs/single-reservation-page-upgrade.decisions.md — read ONCE. If a decision is missing, HALT; do not decide it.

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

### Division of labour

- **The executor** edits and runs `npm run gate` per step. It does **not** commit.
- **The operator** runs the gate at the phase boundary and makes **one commit per phase** (D29).
  Docs commits are separate from code commits.
- Clear context at phase boundaries, not mid-phase.
- Tier the model: most steps are literal reproduction gated by a compile. Reserve the strong model
  for phase 2's two helpers, phase 6's assembly, and the final review.

---

## Halt conditions

Beyond the protocol block's list, this plan has three of its own:

1. **`npm run i18n:translate` fails in step 2.4.** It needs network access to Google Translate.
   HALT — do not hand-write the German, Turkish or Serbian strings (R10). The parity test in step
   2.9 cannot pass until this succeeds, so there is no partial path.
2. **The baseline is not at locale parity.** Step 2.9 tests the `host` namespace across all four
   locales, and the baseline is **missing four keys** in `de`, `tr` and `sr-Latn` (D26). If step
   2.4 has not run, step 2.9 is red for a reason that has nothing to do with this pass. Run 2.4
   before 2.9, in that order.
3. **`prefetchCoverage.test.ts` fails after phase 6.** The page reads `useApartmentsHost`, which is
   covered by the `host` section's declaration. If the coverage check disagrees, HALT and report —
   do not add an `INTERACTION_GATED_HOOKS` exemption (R8), which would convert a correct
   declaration into a permanently unverified one.

---

## Definition of done

- `npm run gate` is green: `tsc -b`, `eslint . --quiet`, `vitest run` with no failures.
- All five prep topics are satisfied:

  | Prep | Where it lands |
  | --- | --- |
  | §1 Table and actions | Phase 5 (`Actions` header, a one-button-per-row menu of copy + delete, `ConfirmButton` shared with the page) and phase 1 (`ConfirmButton` extracted from `AssetItemCard`) |
  | §2 Create reservation | Phase 5 step 5.4 — navigate on success, no success toast |
  | §3 Page layout | Phase 1 (`BackLink`, `SectionCard`), phase 3 (`ReservationHeader`, `ReservationActionsBar`), phase 6 (the assembled page: header → actions → Proof → Time → Other) |
  | §4 Proof section | Phase 4 (both controls always present, a dialog, the count and last capture, the status explanation) and phase 2 (`RoomPhotoItem mode`, the eager read) |
  | §5 Component reusability | Phase 1 — `ActionButton`, `ConfirmButton`, `InfoTooltip`, `BackLink`, `SectionCard` |

- Every new key exists in all four locales, proven by `localeParity.test.ts` rather than asserted.
- The two behaviours the prep is actually about are provable by test, not by eye:
  a control that is present-but-disabled rather than hidden (`ReservationPage.test.tsx`), and a
  count that updates on return from the capture flow (phase 2 step 2.7's invalidation).
- Docs (this directory, the spec, the decisions) are committed separately from the code.

**Not** part of done: applying the new primitives to any page outside the reservation surface.
The primitives are built app-wide, but this pass converts only the reservation table, the
reservation page, and the two headers that share the back link.
