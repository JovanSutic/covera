# Inspection guide upgrade — execution index

Spec: [../inspection-guide-upgrade.md](../inspection-guide-upgrade.md) · Decisions: [../inspection-guide-upgrade.decisions.md](../inspection-guide-upgrade.decisions.md) · Prep: [../inspection-guide-upgrade-prep.md](../inspection-guide-upgrade-prep.md)

Baseline verified green on 2026-11-01 at `fa3c038`: `npm run gate` → exit 0, `Test Files 28 passed (28)`,
`Tests 288 passed (288)`.

## Phases

| Phase | File | Prep § | Touches | Outcome | Requires |
| --- | --- | --- | --- | --- | --- |
| 1 | [p1.md](./p1.md) | §4 | `src/lib/helpers/tooltipPlacement.ts` (new), `src/lib/helpers/tooltipPlacement.test.ts` (new), `src/hooks/useTooltipPlacement.ts` (new), `src/components/shared/TooltipPanel.tsx` (new), `src/components/shared/InfoTooltip.tsx`, `src/components/layout/PageLayout.tsx`, `src/components/shared/ActionButton.tsx` (comment only), `src/components/host/ReservationActionsBar.tsx` (comment only) | Every tooltip is measured against the `PageLayout` box and clamped or flipped so it cannot cross it | — |
| 2 | [p2.md](./p2.md) | §2 | `src/components/shared/DescriptionTooltip.tsx` (new), `src/components/host/AssetItemCard.tsx`, `src/components/host/guide/ShotStepPanel.tsx`, `src/components/host/guide/ShotStepPanel.test.tsx`, `public/locales/*/assets.json` | The shot instruction is a tooltip beside the title instead of a paragraph, using the same component the asset card uses | 1 |
| 3 | [p3.md](./p3.md) | §1 | `src/lib/helpers/guideFlow.ts`, `src/components/host/guide/PhotoStripItem.tsx`, `src/components/host/guide/PhotoStripItem.test.tsx` (new), `public/locales/*/assets.json` | The strip shows an emerald ring on the current step and an orange ring on a captured step the host has tapped into | — |
| 4 | [p4.md](./p4.md) | §3 | `src/lib/helpers/guideFlow.ts`, `src/lib/helpers/guideFlow.test.ts`, `src/components/host/guide/InspectionGuideFlow.tsx`, `src/components/host/guide/InspectionGuideFlow.test.tsx` (new), `src/components/host/guide/ShotStepPanel.tsx` (comment only), `src/components/host/guide/ShotStepPanel.test.tsx`, `src/components/host/guide/PhotoStrip.tsx`, `src/components/host/guide/PhotoStripItem.tsx`, `public/locales/*/assets.json` | The confirmation is the (N+1)th step: the strip shows it, Next on the last photo lands on it, and "Go to current step" returns to it | 3 |
| 5 | [p5.md](./p5.md) | §5 | six files deleted, `src/hooks/useReservationActions.ts` | Nothing in the tree is unreachable from a route | 2 |

**`GuideReviewScreen.tsx` and `ShotStepActions.tsx` are touched by no phase** — D21 and D18 are both
reversed (2026-11-01). A diff that shows either file has drifted from the plan.

## Dependency rules

A legal landing order: **1 → 2 → 3 → 4**, and **5** may land at any point after 2.

- **2 needs 1** — `DescriptionTooltip` is built on `TooltipPanel`, which phase 1 creates. Building it
  first would mean writing the panel twice.
- **4 needs 3** — phase 4 replaces `stripItems` with `inspectionGuideSteps`; phase 3 is what teaches
  `StripItem` about the active ring. Reversing them means phase 3 rebases onto a renamed function.
- **1 and 3 are independent** — different files, no shared symbol. **3 can land before 1** if that is
  convenient; `PhotoStripItem` gains no dependency on the tooltip work.
- **5 needs 2** — `AssetItemCard` is the file `DescriptionTooltip` is extracted from; deleting files
  while that move is in flight would conflict. It depends on nothing else, so it lands last for a
  clean final gate rather than because of an edge.
- **Phases 1–5 do not parallelise.** Every phase ends with the same command on the same tree, and
  three of them touch `assets.json`. Two executors on this tree would produce a `gate` result neither
  could attribute.

## Invariants — check at every phase boundary

The eight repo invariants are in the spec's §"Invariants" section. Restated as checks:

1. `git status --porcelain src/api/generated/` → **empty**. Never hand-edit it.
2. Every new key exists in all four of `public/locales/{en,de,tr,sr-Latn}/assets.json`. Phase 3 adds
   `strip.activeItem`; phase 4 adds `strip.confirmItem` and `strip.confirmTitle`; phase 2 adds
   `instructions.trigger` and `instructions.empty`. **Do not trust `npm run gate` for this** —
   `localeParity.test.ts` only asserts `en ⊆ <locale>` and only at the top level of each namespace
   (decisions D22, fact 6). Verify all four files by hand, with the `node -e` one-liner each phase
   file gives you.
3. No new `VITE_`-prefixed variable. This feature adds none.
4. Routes live in `src/lib/router/routes/*.ts`; `src/App.tsx` mounts the router only. **No phase here
   touches a route.**
5. Query keys come from `QUERY_ACTIONS`. No phase here adds or changes one.
6. Network calls go through `withAuth()` / `publicApi()`. No phase here adds one.
7. No mutation is added, so nothing new needs invalidating.
8. **Feature-specific.** `src/lib/helpers/guideFlow.ts` is the only place that decides where the host
   is in the flow. `PhotoStrip`, `PhotoStripItem`, `ShotStepActions`, `ShotStepPanel` and
   `GuideReviewScreen` compare nothing themselves — they render what the helper returned. Phase 4 is
   the phase most likely to break this; its `Do` blocks are the ones to reproduce verbatim.
9. **Feature-specific.** `cursorIndex === shots.length` is the confirmation step, and it is the only
   index for which `shots[cursorIndex]` is `undefined`. `InspectionGuideFlow` must branch on the
   cursor **before** dereferencing `shots[viewedIndex]`.
10. **Feature-specific.** No phase renames or re-shapes an existing `guideFlow.ts` export except
    `stripItems`, which phase 4 replaces by decision D17. `advanceCursor`, `isCaptured`,
    `capturedCount`, `initialCursorIndex`, `isFlowComplete`, `isViewingEarlierStep` and `nextPendingIndex`
    keep their signatures and their tests.

## Execution protocol

```
You are executing a pre-written plan, one phase at a time. Do not design, redesign, or improve it.

SOURCES
- docs/inspection-guide-upgrade/00-index.md — read ONCE at the start (dependencies, invariants, halt conditions).
- docs/inspection-guide-upgrade/p<N>.md — read ONLY the phase file you are about to execute.
- docs/inspection-guide-upgrade.decisions.md — read ONCE. If a decision is missing, HALT; do not decide it.

SCOPE
- Execute phases 1–5 in order. Stop at the phase boundary.

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
- **Operator:** runs `npm run gate` at each phase boundary and makes **one commit per phase** (D39).
  Docs commits are separate from code commits (D40). Nothing enforces this — this repo has no husky
  hook and no CI, so the gate is the only thing catching a regression. Run it.
- Clear context at phase boundaries, not mid-phase.
- Tier the model: **phase 1 and phase 4 are decision-heavy** (geometry, and the cursor's second index)
  — use the strong model. **Phases 2, 3 and 5 are mostly verbatim transcription gated by a compile** —
  a cheap model handles them. Phase 3's step 3.3 is the one exception inside a cheap phase: it pins a
  predicate that was got wrong once already, so read its `Do` rather than paraphrasing it.

### Batching, and the one place it is not allowed

Phase 4 is the only phase where two steps must not be grouped: step 4.4's `Accept` (the flow renders
the confirmation) has to be observed before step 4.5 changes the panel's prop, because both failures
surface as the same `tsc` error.

Everywhere else, group freely and say which steps you grouped.

## Test plan for this feature

Five test files touched, two created:

| Phase | Test file | Covers |
| --- | --- | --- |
| 1 | `src/lib/helpers/tooltipPlacement.test.ts` (new) | every branch of `computeTooltipPlacement`: fits below, flips above, flips alignment left → right, clamps to the host's left edge when wider than the host, clamps vertically, prefers the requested side when both fit |
| 2 | `src/components/host/guide/ShotStepPanel.test.tsx` (edited) | the instruction trigger exists and is labelled; the paragraph is gone; the empty-instruction fallback |
| 3 | `src/components/host/guide/PhotoStripItem.test.tsx` (new) | the four ring states as classes on the rendered item, plus D2's ordering rule when an item is somehow both |
| 4 | `src/lib/helpers/guideFlow.test.ts` (edited) | `inspectionGuideSteps` emits N+1 items, the last being the confirmation; `isActive` on every combination of cursor × viewed; `selectStep` on the confirmation; `stepCount`/`confirmationIndex`/`confirmationProgress`; `advanceCursor` unchanged |
| 4 | `src/components/host/guide/InspectionGuideFlow.test.tsx` (new) | Next on the last photo lands on the confirmation; the confirmation tile carries the current ring; tapping a photo from the confirmation shows Go to current, and it returns; no item but the viewed one is active |
| 4 | `src/components/host/guide/ShotStepPanel.test.tsx` (edited) | the last photo step offers Next (the previous assertion, inverted, because prep §3 changes the behaviour) |

**`guideFlow.test.ts` is edited by phase 4 only.** Phase 3 changes `guideFlow.ts` by adding one field
with the constant value `false`, which no assertion in the file can distinguish — so phase 3 has no
edit there and its test file is new beside the component. An executor that finds itself editing
`guideFlow.test.ts` in phase 3 has drifted.

**Phases exempt from a test step:** none. Phase 5 is the only phase with no new test file, and it
needs none — its whole content is a deletion, and its proof is that the gate is still green with the
same test count and six files gone. That exemption is **not** a decision row because it is not a test
opt-out: `p5.md` step 5.3 runs the full suite and asserts the count is unchanged.

**Phase 1's component half is deliberately untested** (decision D33): `useTooltipPlacement` measures
via `getBoundingClientRect`, which jsdom reports as all zeros, so a test of it would assert that zero
equals zero. Only the placement rule — the part that can be wrong — is tested.

## Halt conditions

- `npm run gate` red and one honest fix attempt does not clear it
- The plan contradicts the code in a way that changes observable behaviour
- A step needs a file outside its Touch list
- A decision the plan does not cover changes observable behaviour
- A step needs a translation key that exists in no locale file
- The generated client does not export a request function a step assumes (no step here assumes one)
- **A phase's own test step fails in a way the phase's `Do` block does not explain.** Only **phase 4**
  changes behaviour an existing test asserts on — two assertions, both named in `p4.md` steps 4.2 and
  4.6, and both are inversions prep §3 requires. An executor that finds a *third* failing test, in any
  phase, is looking at a rule this plan did not model — stop and report it rather than adjusting the
  test.
- An executor that finds itself writing `shots.length + 1` outside `guideFlow.ts`. That literal in one
  place is the design (D17); in two places it is the bug the design exists to prevent.
- An executor that finds itself editing `guideFlow.test.ts` during **phase 3**. Phase 3 adds one field
  whose value is the constant `false`; nothing in that file could tell. That edit belongs to phase 4.

## Definition of done

- [ ] `npm run gate` green on the feature branch, `Test Files 31 passed (31)` / `Tests 300+ passed`
- [ ] Prep §1–§5 each observably resolved, walked in a browser at phase 4's end (the checklist in
      `p4.md`'s final step) and again at phase 2's end for §2
- [ ] Every new i18n key present in `en`, `de`, `tr` and `sr-Latn` — checked per-file, not by the gate
- [ ] No hand-edits under `src/api/generated/` (`git status --porcelain src/api/generated/` → empty)
- [ ] Six files deleted, and `grep -rn "InlineCamera\|ReservationHeaderActions\|LocaleSwitcher" src`
      finds comments only
- [ ] **`GuideReviewScreen.tsx` and `ShotStepActions.tsx` are unmodified** — D21 and D18 are reversed,
      so a diff there is drift
- [ ] One commit per phase; the docs commit is separate (operator)
- [ ] The PR records three deviations: the locale strings are written in English rather than machine
      translated (D41), `ShotStepPanel`'s `takePhotoFirst` branch is now unreachable and untested
      (D16), and D1/D18/D21 were corrected during planning after trial implementation against the real
      tree (facts 17–20)

## Changed during planning — read this before executing

The plan was validated by trial-implementing phases 3 and 4 against the real tree on 2026-11-01, then
reverting. Three decisions were wrong and are corrected in `decisions.md`; the facts that caught them
are rows 17–20 of its "Facts verified" table.

- **D1** — `isActive` was `isCaptured(shot) && index !== cursorIndex`, which lights up *every* finished
  photo at once. It is now `index === viewedIndex` (with a redundant `isCaptured` guard), and
  `inspectionGuideSteps` takes a third parameter for it (D1b). Caught by the integration test in
  `p4.md` step 4.7.
- **D18** — **reversed.** Renaming the panel's `hasNextStep` to `isOnLastPhotoStep` would have made the
  last photo step render no Next at all, putting the confirmation out of reach — destroying prep §3.
  No prop is renamed by any phase.
- **D21** — **reversed.** Rewriting `GuideReviewScreen` to add a back link was scope I introduced; prep
  §3 does not ask for it, and the soundness argument is already satisfied by its `onSubmit` closure.

**Consequence for the executor:** phases 1, 3 and 4 together produce `Test Files 30 passed (30)` /
`Tests 316 passed (316)` on this tree (fact 20). That number is evidence the phases compose, **not** a
licence to apply more than one phase — the gate per phase, and one commit per phase, are unchanged.
