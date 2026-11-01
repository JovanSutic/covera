# Inspection guide refactor — execution index

Spec: [../inspection-guide-refactor.md](../inspection-guide-refactor.md) · Decisions: [../inspection-guide-refactor.decisions.md](../inspection-guide-refactor.decisions.md) · Prep doc: [../inspection-guide-refactor-prep.md](../inspection-guide-refactor-prep.md)

## Phases

| Phase | File | Touches | Outcome | Requires |
| --- | --- | --- | --- | --- |
| 1 | [p1.md](./p1.md) | `src/lib/helpers/guideFlow.ts` (new), `src/lib/helpers/guideFlow.test.ts` (new), `public/locales/{en,de,tr,sr-Latn}/assets.json` | The flow's decisions exist as pure functions with 26 tests, and every string the feature will render exists in all four locales | — |
| 2 | [p2.md](./p2.md) | `src/components/host/guide/PhotoStripItem.tsx` (new), `src/components/host/guide/PhotoStrip.tsx` (new) | The transparency list renders: one item per shot, blank/pending or thumbnail, exactly one marked current, only captured items interactive | 1 |
| 3 | [p3.md](./p3.md) | `src/components/host/guide/useCapturedShots.ts` (new), `src/components/host/guide/ShotStepActions.tsx` (new), `src/components/host/guide/ShotStepPanel.tsx` (new) | The step's panel and its two exits render — the heading, the instruction, the type chip, the camera/preview toggle, and the Next / Go-to-current rule | 1 |
| 4 | [p4.md](./p4.md) | `src/components/host/guide/ShotStepPanel.test.tsx` (new) | The capture / retake / advance / go-to-current transitions are pinned by 9 component tests through an injected camera | 3 |
| 5 | [p5.md](./p5.md) | `src/components/host/guide/GuideReviewScreen.tsx` (new), `src/components/host/guide/InspectionGuideFlow.tsx` (new), `src/components/host/ShotsGuide.tsx` (delete), `src/pages/InspectionGuidePage.tsx` | The whole flow is composed behind the unchanged page: strip on top, step in the middle, review before submit — and the old monolith is gone | 2, 3 |
| 6 | [p6.md](./p6.md) | `src/lib/helpers/guideExit.ts` (new), `src/lib/helpers/guideExit.test.ts` (new), `src/hooks/useGuideExitGuard.ts` (new), `src/components/host/guide/LeaveGuideDialog.tsx` (new), `src/components/host/guide/InspectionGuideFlow.tsx` | Leaving a guide with unsubmitted photos asks for confirmation, in-app and on tab close | 5 |
| 7 | [p7.md](./p7.md) | `public/locales/{de,tr,sr-Latn}/assets.json`, `docs/inspection-guide-refactor*.md`, `docs/inspection-guide-refactor/00-index.md` | The 15 new keys carry real `de`/`tr`/`sr-Latn` copy, and the docs read as shipped | 1, 6 |

## Dependency rules

- A legal landing order: **1 → 2 → 3 → 4 → 5 → 6 → 7**.
- Do not start phase 2, 3 or 4 before phase 1 — all three import `guideFlow.ts`, which phase 1
  creates, and phase 2 imports `StripItem`, one of its exported types. Referencing either before phase
  1 lands is a red `tsc`.
- Do not start phase 4 before phase 3 — its test renders `ShotStepPanel` and `useCapturedShots`, both
  of which phase 3 creates.
- Do not start phase 5 before phases 2 and 3 — `InspectionGuideFlow` imports `PhotoStrip` (phase 2),
  `ShotStepPanel` and `ShotStepActions` (phase 3), and `useCapturedShots` (phase 3). It is the
  composition point, so it is last of the build-shaped phases.
- Phase 6 touches `InspectionGuideFlow.tsx`, which phase 5 creates. It does not touch `PhotoStrip`,
  `ShotStepPanel`, or the page, so it is independent of phases 2–4 and may land any time after 5.
- Phase 7's translation run depends on phase 1 having written the English keys into all four locales
  (it deletes and re-translates those subtrees), and on phase 6 having added the last keys the feature
  uses. Nothing in 7 is needed by anything.
- Inside phase 3, `useCapturedShots` (3.1) precedes its only consumer (3.3) — it is what puts the
  capture action and the derived flags on the hook the panel reads.
- Inside phase 5, the creation of `InspectionGuideFlow.tsx` (5.2) must precede the page rewiring (5.4)
  and the `ShotsGuide.tsx` deletion (5.3) — 5.4's import would be a red `tsc` without it, and 5.3
  removes the only other implementation of the same component. **5.3 and 5.4 are one atomic change**:
  between them `tsc` is red, which is why the gate runs at the phase boundary and not between them.
- **No router file is touched.** No path, route entry, guard, or lazy import changes.
- **No generated file is touched.** No `api:generate` run, no hard stop.
- **No shared component is modified.** `InlineCamera`, `Modal`, `PageLayout`, `BackLink`, `ConfirmButton`,
  `Typography`, `Header`, `Shell` are read-only for this feature.

## Invariants — check at every phase boundary

1. `src/api/generated/` is not hand-edited; regenerate with `npm run api:generate` instead.
2. No hardcoded user-facing strings — every key exists in `en`, `de`, `tr`, and `sr-Latn`.
3. No secret in a `VITE_` env var; everything so prefixed ships to the browser.
4. Routes live in `src/lib/router/routes/*.ts` as `page: () => import(...)` entries; authenticated
   branches carry a rule name. **This feature moves no route.**
5. Query keys come from `QUERY_ACTIONS`; no string literals at call sites. This feature adds no key.
6. Network calls go through `withAuth()` / `publicApi()`.
7. Mutations invalidate the keys they changed. The submit mutation's three invalidations are unchanged.
8. Forms validate with a zod schema through `@hookform/resolvers`. This feature has no form.
9. **Feature-specific: the flow's decisions live in `src/lib/helpers/guideFlow.ts`.** No component in
   `src/components/host/guide/` derives "is this step captured", "which step is next", "may this strip
   item be tapped", or "should leaving warn" on its own. A surface that needs a variant extends the
   helper and its test.
10. **Feature-specific: `PhotoStrip` and `PhotoStripItem` are presentational.** They take a `StripItem[]`
   and an `onSelect(index)`, hold no state, and compute no reachability.
11. **Feature-specific: `submitInspectionPhotos`, `getProofWindowState`, everything under `src/lib/api/`,
    everything under `src/lib/router/`, and `src/api/generated/` are unmodified.** `git diff --stat`
    names none of them at any phase boundary.
12. **Feature-specific: a pending strip item is not a `<button>`.** `PhotoStripItem` renders a `<button>`
    only for captured items — verified by `grep -c "<button" src/components/host/guide/PhotoStripItem.tsx`
    → `1`, inside the captured branch.
13. **Feature-specific: `InspectionGuideFlow` renders no business logic inline.** It owns the cursor and
    `viewedIndex`, calls the helper, and passes results down.
14. **Feature-specific: the header, shell and layout are not touched.** The strip hangs off the existing
    `sticky top-0 z-40 h-12` header (`Header.tsx:68`) at `top-12`/`z-30` (D13). `git diff --stat` names
    neither `Header.tsx` nor `Shell.tsx`.

## Execution protocol

```
You are executing a pre-written plan, one phase at a time. Do not design, redesign, or improve it.

SOURCES
- docs/inspection-guide-refactor/00-index.md — read ONCE at the start (dependencies, invariants, halt conditions).
- docs/inspection-guide-refactor/p<N>.md — read ONLY the phase file you are about to execute.
- docs/inspection-guide-refactor.decisions.md — read ONCE. If a decision is missing, HALT; do not decide it.

SCOPE
- Execute phases 1–7 in order. Stop at the phase boundary.

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

- **Executor:** edits, runs `npm run gate` per step, never commits.
- **Operator:** runs the gate at each phase boundary and makes **one commit per phase** (D26). Phase 6's
  `npm run i18n:translate` is an operator step — it needs network access to Google Translate.
  In `covera` nothing enforces this: no husky hook, no CI, so the gate is the only thing catching a
  regression. **Run it at every phase boundary.**
- Clear context at phase boundaries, not mid-phase.
- Tier the model per step: cheap for transcription. Reserve the strong model for phase 1 (the state
  machine's edge cases), phase 3's test, and the final review.

## Test plan for this feature

- **Phase 1, step 1.2** — `src/lib/helpers/guideFlow.test.ts`. 26 cases over the nine exports:
  `isCaptured` on a pending step, an undefined shot and an empty URL; `capturedCount`;
  `nextPendingIndex` finding the first pending step strictly after the cursor, skipping captured steps,
  returning `null` when none remains, and never looking backwards; `initialCursorIndex` on a fresh, a
  resumed, an all-captured and an empty guide; `advanceCursor` moving forward, skipping out-of-order
  captures, staying put instead of wrapping, and no-op on an empty guide; `selectStep` refusing a
  pending step and an out-of-range index; `isViewingEarlierStep`; `isFlowComplete` false while any step
  is blank and false on an empty guide; and `stripItems` carrying every step in order with exactly one
  current, the preview URL only where there is one, and nothing for an empty guide.
- **Phase 4, step 4.1** — `src/components/host/guide/ShotStepPanel.test.tsx`. 9 cases over the
  stateful transitions, through a `Harness` that holds the same state the phase-6 orchestrator will and
  calls the same helpers: the camera opens on entry with `Next` disabled, capture closes it and shows
  the photo large with the retake control, capture does **not** move the cursor, `Next` advances and
  reopens the camera, retake reopens the camera without incrementing the counter, **Go to current step**
  replaces `Next` only while viewing an earlier captured step, returning restores `Next`, a pending step
  shows no retake control, and the last pending step shows no `Next` and the take-the-photo hint.
- **Phase 6, step 6.2** — `src/lib/helpers/guideExit.test.ts`. 4 cases: `canLeaveGuide` true when
  nothing is captured, false as soon as one photo is, false on a complete-but-unsubmitted set, true
  while submitting (D11), and true on a guide with no steps.
- **Phases 2, 3, 5 and 7 are exempt (D25)** — markup composition over phase 1's tested decisions, the
  panel those decisions drive (tested in phase 4), composition of phases 2–3, and a network
  translation run plus a doc.
- This repo's gate has **no `--passWithNoTests`** — the baseline is **24 files / 246 tests**, so no gate
  promotion is part of this feature. The three new test files take it to **27 files / 285 tests**
  (246 + 26 in phase 1 + 9 in phase 4 + 4 in phase 6).

## Halt conditions

- Gate red and one honest fix attempt does not clear it
- The plan contradicts the code in a way that changes observable behaviour
- A step needs a file outside its Touch list
- A decision the plan does not cover changes observable behaviour
- A step needs a translation key that exists in no locale file
- The generated client does not export the request function a step assumes
- `npm run i18n:translate` fails (it needs network access to Google Translate) and leaves the new keys
  missing from `de`, `tr`, or `sr-Latn`
- **`ApartmentShotGuide` turns out to have an importer besides `InspectionGuidePage.tsx`** — phase 5
  deletes it. `grep -rn "ShotsGuide\|ApartmentShotGuide" src/` must keep returning only
  `InspectionGuidePage.tsx` until step 5.2 lands.
- **`useBlocker` throws in a test** because the test rendered under `MemoryRouter` rather than
  `createMemoryRouter` + `RouterProvider` (verified: `useBlocker` reads `router.blockers` from the
  data-router context, which `MemoryRouter` does not provide). Phase 6 adds no test that mounts the
  orchestrator, so this fires only if a later phase adds one — it is recorded because the repo's one
  existing page test uses `MemoryRouter` and a copy of that pattern would hit it.

Report raw output, file and symbol, the options, and a recommendation. Do not proceed past it.

## Definition of done

- [ ] `npm run gate` green on the feature branch, with **27 test files** passing and 0 failing
- [ ] Every phase with testable logic landed its test (1, 4, 6); phases 2, 3, 5, 7 carry D25's exemption
- [ ] Every decision in `inspection-guide-refactor.decisions.md` is `APPROVED` and reflected in the code
- [ ] The 15 new `assets:shotGuide.*` keys carry real `de`, `tr`, `sr-Latn` copy, not English
- [ ] No hand-edits under `src/api/generated/`; no router file, page path, or guard touched
- [ ] `ShotsGuide.tsx` is deleted and nothing imports it: `grep -rn "ShotsGuide" src/` → no matches
- [ ] `git diff --stat` names neither `submitPhotoProofs.ts`, `proofWindow.ts`, `Header.tsx`, `Shell.tsx`,
      `InlineCamera.tsx`, `Modal.tsx`, nor anything under `src/lib/api/` or `src/lib/router/`
- [ ] Docs commit (`docs/inspection-guide-refactor*`, `docs/inspection-guide-refactor/`) is separate from
      every code commit
- [ ] Operator has clicked through the flow on a phone-width viewport: the strip shows every step blank
      on entry → capture photo 1 → it appears in the strip and large in the panel with the camera closed
      → **Next** is the only forward action and is disabled before a capture → capture 2 → tap item 1 in
      the strip → it renders large with **Retake photo** and **Go to current step** and **no Next** →
      return to current → capture the last one → the review screen replaces the panel with the strip
      still visible above it → **Submit** uploads, shows the overlay, and lands on the reservation →
      entering the guide again on a fresh reservation and tapping the back link with a photo captured
      asks for confirmation
