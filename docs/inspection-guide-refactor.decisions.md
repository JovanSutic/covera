# Inspection guide refactor — decisions

Every choice the executor would otherwise make mid-flight. Approve the table in one pass, or edit it
in place; do not leave a row in `OPEN`.

**Status values:** `APPROVED` · `OPEN` (blocks execution) · `REJECTED` (kept for the record)

---

## Decisions

| ID | Decision | Rationale | Status |
| --- | --- | --- | --- |
| D1 | The flow's state machine lives in a new pure module `src/lib/helpers/guideFlow.ts`, beside `proofWindow.ts`, and is the only place the flow's questions are answered: `advanceAfterCapture`, `goToCurrentStep`, `stripItems`, `isFlowComplete`, `canSelectStripItem`, `nextPendingIndex`, `clampIndex`. | `proofWindow.ts` is this repo's precedent for "the arithmetic, defined once, with a test". The prep doc's §Technical asks for reusable logic split from markup; a pure module is the strongest form of that and the only part of this feature a test can pin cheaply. | APPROVED |
| D2 | The cursor moves **only** on an explicit **Next**, never on capture. | Prep §2 names the sequence explicitly and lists "retake the photo or move to the next step (actions available)" as the step's two exits. Auto-advance-on-capture would remove the retake-on-the-spot affordance the prep doc assumes. | APPROVED |
| D3 | After a capture the host stays on the captured step with the camera closed, showing the photo large, **Retake photo**, and **Next**. On the last step the forward action is a disabled "Next" replaced by a hint that the review screen is reachable. | Same clause as D2. The step's Accept is the photo appearing in the main panel *and* in the strip before any navigation, which is what prep §2 bullet 4 asks for. | APPROVED |
| D4 | There is **no Previous** button in the flow. Navigation backwards is the strip; the only forward action from a viewed step is **Go to current step**. | Prep §1: "Only the photo components with the photo, steps that are done are clickable" and §2: "you need to have action of move to current step and not move to the next step". A Previous button would be a second, weaker way to do what the strip does, and contradicts "you will not be able to click on anything in that list [except captured]". | APPROVED |
| D5 | **Next** is enabled only when the current step carries a photo. While the camera is open it is disabled. | The prep doc's flow has no way to skip a photo, and `submitInspectionPhotos` refuses to submit a partially-captured set anyway. Leaving Next enabled on a pending step would let the host walk past uncaptured photos into a state the review screen then contradicts. | APPROVED |
| D6 | The strip lives in `src/components/host/guide/` — a new directory beside `ShotsGuide.tsx`, holding all six new components. `ShotsGuide.tsx` is deleted at the end of phase 4. | The six pieces are one feature's private parts; a directory keeps them out of the shared `host/` namespace where `InlineCamera` and friends are imported from elsewhere. Nothing else imports `ShotsGuide` (verified), so deleting it is safe and leaves no dead file. | APPROVED |
| D7 | Files: `InspectionGuideFlow.tsx` (orchestrator, exported as `InspectionGuideFlow`), `PhotoStrip.tsx`, `PhotoStripItem.tsx`, `ShotStepPanel.tsx`, `ShotStepActions.tsx`, `GuideReviewScreen.tsx`, `LeaveGuideDialog.tsx`. | One responsibility per file, as the prep doc's §Technical asks. Names say what they are, so a dev reads the directory listing and knows the feature. | APPROVED |
| D8 | `InspectionGuidePage.tsx` keeps everything it has now — the two queries, the window gate, the mutation, the toasts, the invalidation, the back link — and renders `<InspectionGuideFlow>` in place of `<ApartmentShotGuide>`. The page's props to the flow are `{ initialShots, isSubmitting, onSubmit }` plus `{ onLeaveBlocked }`-free: the flow asks for confirmation itself. | The page's current shape is already reviewed and correct (its own comments cite decisions D2/D8/D17/D28). This feature is the component tree below it, not the page. Keeping the page's diff to one import and one JSX line keeps the phase reviewable. | APPROVED |
| D9 | Navigation blocking uses **`useBlocker`** from `react-router` (verified present in v7.8.2's exports and typed `useBlocker(shouldBlock: boolean \| BlockerFunction): Blocker`). The flow blocks when: any step is captured **and** the flow is not submitting. `blocker.state === "blocked"` renders `LeaveGuideDialog`; its confirm calls `blocker.proceed()`, its cancel calls `blocker.reset()`. No-op module import guard: `useBlocker` is called unconditionally (never conditionally), so the hook order is safe. | Operator decision E1: "in-app navigation away asks for confirmation". `useBlocker` is the data-router API for exactly this and works under both `createBrowserRouter` (the app) and `createMemoryRouter` (tests). `beforeunload` alone covers only tab close, which is why it is kept as well and not replaced. | APPROVED |
| D10 | The existing `beforeunload` handler is **kept**, broadened from `isSubmitting` to `isSubmitting \|\| anyCaptured`, and moved into a `useGuideExitGuard(canLeave: boolean)` hook in `src/hooks/useGuideExitGuard.ts`. The hook owns both `useBlocker` and the `beforeunload` listener. | The prep doc's §3 "security measure" is explicitly light, and the two guards cover different exits: `useBlocker` cannot see a tab close or a manual URL edit, `beforeunload` cannot see an in-app link. Splitting them from the flow keeps `InspectionGuideFlow` free of `useEffect`. | APPROVED |
| D11 | While `isSubmitting` the guard is **off** — `canLeave` is false-but-inert: the flow sets `canLeave = true` when `isSubmitting`, because the upload owns the screen behind a full-screen overlay and trapping the host in it would be a bug, not a protection. | The current code's `beforeunload` fires *during* upload, which is the one exit that must be warned about mid-flight — so `isSubmitting` keeps its `beforeunload` warning (D10) but does **not** get a `useBlocker` confirmation (the overlay already prevents the click). Stated explicitly so the executor does not have to guess which way the two guards point. | APPROVED |
| D12 | The leave confirmation is a `ConfirmButton`-shaped inline dialog, not `Modal`: a new `LeaveGuideDialog.tsx` rendering a fixed overlay with a title, body, **Leave** and **Stay** buttons. It reuses the app's existing overlay classes from `ShotsGuide`'s uploading modal verbatim. | `Modal.tsx` closes on backdrop click and on Escape, both of which would silently discard the confirmation — the opposite of the intent. A two-button dialog that requires an explicit answer is the correct primitive here, and matching the existing overlay markup keeps the look consistent. | APPROVED |
| D13 | The strip is pinned with `sticky` inside the flow's own container, at `top-12` (`h-12` is the header's height, verified in `Header.tsx`), `z-30` (under the header's `z-40`), with an opaque background and `-mx-4 px-4` bleed so items scroll under the page edge while the bar stays opaque. | The header is `sticky top-0 z-40 h-12`. Hanging the strip at `top-12` is the smallest change that keeps it "always in the view" (prep §1) without touching `Shell.tsx` or `Header.tsx` — which the out-of-scope list forbids. | APPROVED |
| D14 | The strip is **hidden** while the inline camera view is open, and shown in every other flow state including the review screen. | Prep §1: "This list should be visible in every step ... (only not when the user enters his native device camera)". The prep doc says "native device camera"; this app's camera affordance is the inline `InlineCamera` panel, which is what the user occupies while choosing the file, so that is the state it is hidden in. Stated explicitly because the two readings differ. | APPROVED |
| D15 | The review screen replaces **the step panel only** — the strip, the page title, and the back link stay above it. | The review screen's own copy tells the host to check the strip; hiding the strip on that screen would contradict the sentence telling them to look at it. | APPROVED |
| D16 | The step's *forward* button label is `assets:shotGuide.actions.next` while another pending step exists, and the flow-complete state is a separate render (the review screen), so there is no "last step" special case in `ShotStepActions`. | Removes the `isLastStep` branch that currently picks between Next and Finish & Save. The review screen is the single submit surface, which is what prep §3 asks for ("Last screen before the submit"). | APPROVED |
| D17 | The new copy is: `assets:shotGuide.strip.ariaLabel`, `.pendingItem`, `.capturedItem`, `.currentItem`; `assets:shotGuide.actions.goToCurrent`, `.takePhotoFirst`; `assets:shotGuide.review.title`, `.description`, `.checklist`, `.submit`; `assets:shotGuide.leave.title`, `.description`, `.confirm`, `.cancel` — 15 keys, all extending the existing `shotGuide` tree. **Phase 1 writes the English text into all four locales** (not `en` only), so invariant 2 holds at every phase boundary and no raw key can ever render. Phase 6 then deletes those subtrees from `de`/`tr`/`sr-Latn` and runs `npm run i18n:translate` to replace them with real translations. | All of it is user-facing, so all of it goes through `t()` with a key in all four locales (invariant 2). `assets` is the namespace `ApartmentShotGuide` already uses for `shotGuide.*`. English-in-all-four first, translate second, because `i18n:translate` only fills **missing** keys (verified) — a key present with English text is left alone, so the delete step is what makes phase 7 do anything at all. | APPROVED |
| D18 | Nothing under `src/components/guest/` is reused. The strip item is new. | `RoomPhotoItem` renders a `ShotWithAssets` (with `images[]` and `assets[]`) inside a gradient `Card` with a timestamp and an asset checklist — none of which a 64×64 strip thumbnail has or wants. Forcing a `mode="strip"` into it would be a third mode on a component two other surfaces depend on. | APPROVED |
| D19 | The strip item's thumbnail is the object URL `URL.createObjectURL(rawFile)` created at capture, rendered through the existing `capturedImageUrl`. No new URL plumbing, no revocation. | `InlineCamera` already creates that URL and `CapturedApartmentShot.capturedImageUrl` already carries it; the main panel already renders it. Adding a second URL source would be a second truth about the same photo. Not revoking matches the existing code's behaviour and keeps the diff to the strip. | APPROVED |
| D20 | The cursor starts at the **first pending** step, not at 0, and `viewedIndex` starts equal to it. | A host returning to a partly-done guide (the page passes `initialShots`, which can carry captures) should land where the work is, not on a done photo. On a fresh guide the first pending step *is* 0, so the prep doc's "you start the guide and you are on the very start" holds. | APPROVED |
| D21 | Tapping a captured strip item sets `viewedIndex` only. It does **not** move the cursor. | Prep §1: "the current step will still mark where we stopped the sequential moving forward". The two are separate state for exactly this reason. | APPROVED |
| D22 | `InspectionGuidePage`'s props to the flow stay `{ initialShots, isSubmitting, onSubmit }`. No new prop, no callback up. | The page needs no knowledge of the cursor or the viewed index; keeping the boundary where it is means phase 5's page diff is the import line and the JSX tag, and the flow is testable without the page's queries. | APPROVED |
| D23 | The obsolete `shotGuide.actions.finishAndSave` key is **kept** in all four locales for one release; the new review screen uses `shotGuide.review.submit`. | Deleting a key is a one-line change with a runtime failure mode (a stale chunk asking for it renders the raw key) and zero benefit. `shotGuide.actions.previous` is likewise kept though no component reads it any more. Flagged here so a reviewer does not read them as leftovers. | APPROVED |
| D24 | 7 phases. p1 = the pure model + its test + the 15 English keys in all four locales. p2 = `PhotoStrip` + `PhotoStripItem`. p3 = `useCapturedShots`, `ShotStepPanel`, `ShotStepActions`. p4 = the capture-layer component test. p5 = `GuideReviewScreen`, `InspectionGuideFlow`, the page rewiring, delete `ShotsGuide.tsx`. p6 = the exit guard. p7 = the translation run + doc close-out. | Each boundary leaves a tree that compiles, passes its tests, and is a coherent piece of the feature. p1–p4 are additive (new files only); p5 is the single swap point where the old component is deleted and the page changes; p6 is independent of every other phase and may land any time after p5; p7 is an operator step needing network. Seven rather than six because the capture-layer test is 260 lines of plan on its own and the skill caps a phase file at ~400 lines. | APPROVED |
| D24b | **`InspectionGuideFlow` accepts an injectable camera via the optional `renderCamera` prop** (`(onCapture, onCancel) => ReactNode`, defaulting to the real `InlineCamera`). Phase 4's test uses it to inject a stub. | Not a test seam bolted on: prep §2's sequence puts the native camera outside the app, so the boundary between "the app's step" and "the device's camera" is a real architectural seam, and this prop is where it is drawn. Without it, phase 4's test would have to drive a `<input type="file">`, which jsdom supports poorly and which would test the browser rather than the flow. It also keeps `InlineCamera` unmodified, per out-of-scope. Declared here so it is a decided design, not a seam somebody finds later and calls a hack. | APPROVED |
| D25 | **Tests required in phases 1, 4 and 6. Phases 2, 3, 5 and 7 are exempt.** | Phase 1 is pure logic (`guideFlow.ts`) — the skill's test rule makes it mandatory, and it is where every flow edge case lives. Phase 3 introduces the feature's only **stateful** logic — an accumulator that grows across captures, plus a cursor that must not move on capture — and phase 4 is the test that pins it, because a static read cannot verify either. Phase 6 is pure logic plus a hook's condition, and is the part of prep §3 a click-through cannot exhaust. Phase 2 is markup over phase 1's tested decisions; phase 3 is the panel those decisions drive, tested in phase 4; phase 5 is composition; phase 7 is a network translation run plus a doc. This row is the opt-out the skill requires. | APPROVED |
| D26 | Commit granularity: **one commit per phase, made by the operator.** Docs (`docs/inspection-guide-refactor*.md`, `docs/inspection-guide-refactor/`) land in their own commit before phase 1. The executor never commits. | Skill Stage 7's division of labour, and the operator's explicit instruction that each phase be committable by hand. | APPROVED |
| D27 | `InspectionGuideFlow`'s root element is **not** given a `data-testid`; the strip and its items are (`guide-photo-strip`, `guide-strip-item` with `aria-current` and `aria-disabled`). | A phase-6 test would need to block a navigation, which needs a real data router; the flow's own test coverage is the helper's, so a testid on the orchestrator would be scaffolding with no reader. The two strip testids exist because `PhotoStrip`/`PhotoStripItem` are the components a future test would mount. **This repo has no `data-testid` anywhere today** (verified: `grep -rn "data-testid" src/` → nothing), so both testids are new convention and are called out in the PR. | APPROVED |

### Amendments (phase 8, 2026-11-01)

`D14` and `D24b` shipped a defect the operator found by clicking through: the panel's first render was
`InlineCamera`, an in-app camera *view* whose only purpose was to offer the file input the panel's own
open-camera button could offer directly. `D14` and `D24b` are **amended** below, not reversed — the
strip's visibility rule and the injected-camera seam both survive, narrowed as stated.

| ID | Decision | Rationale | Status |
| --- | --- | --- | --- |
| D29 | **`ShotStepPanel` is the flow's only step view.** It renders the preview area and the camera control together, always. `isCameraOpen`, `onOpenCamera` and `onCameraCancel` are **removed** from its props, and `InspectionGuideFlow` holds no camera state. | The host passed through an in-app screen whose sole content was a button the panel already had, and the panel's own open-camera control re-entered it — two stacked affordances for one action. Prep §2's sequence has no in-app camera view in it: the step, then the native camera. Removing the state removes the redundant render rather than papering over it. | APPROVED |
| D30 | **The injected camera is a trigger, not a view.** `renderCamera` narrows to `(onCapture) => ReactNode`; `ShotStepPanel`'s own default is the real control — a `<label>` wrapping an `<input type="file" accept="image/*" capture="environment">`, the same mechanism `InlineCamera.openCameraButton` used. The prop has no default in `InspectionGuideFlow` (it is passed straight through); the panel supplies the real one. | Amends **D24b**: the seam still exists for the same reason (prep §2 puts the native camera outside the app, and jsdom has no `URL.createObjectURL`), but what crosses it is the control rather than a screen. `InlineCamera` is left unmodified and, after phase 8, unimported — deleting it is a separate decision nobody has made. | APPROVED |
| D31 | **The strip is visible in every flow state** — `D14` is amended. The `showStrip = !isCameraOpen` condition is deleted and `PhotoStrip` renders unconditionally. | D14 hid the strip "while the inline camera view is open", choosing the inline panel as the reading of prep §1's "native device camera". With D29 there is no in-app camera view to be inside, so the condition has no state left to read. Prep §1's stronger claim — the list is "always in the view" — now holds without exception. | APPROVED |
| D32 | The strip's scroll row carries `p-1` and its wrapper carries `py-1`. | The current item's ring is a box-shadow painted 3px outside its box (`ring-2` + `ring-offset-1`), and `overflow-x-auto` clips its own scrollport — so the padding must sit on the row, inside the clip. Padding on the wrapper cannot release a clip applied by its descendant, which is why the original `py-2`/`pb-1` pair cut the ring. The wrapper's `py-1` keeps the bar's height unchanged. | APPROVED |
| D33 | Phase 4's test keeps **9 cases**, four of them reworked: no `retake`/`openCamera` helpers (the injected stub replaces the labelled control, so `shotGuide.camera.*` is not in that DOM), `stub-cancel` deleted, and the "camera is open, therefore X is absent" premise inverted. | The old premise — "opens on the camera" — *was* the defect D29 fixes, so those cases asserted the bug as the contract. The four kept cases read only the heading, the counter, `Next` and `Go to current step`, none of which changed. Deleting the two label-based helpers follows phase 4's own precedent (its `openCamera` helper was already dead by construction). | APPROVED |
| D34 | Step 5.3's `ShotsGuide.tsx` deletion is executed here, in phase 8.5. | The step was specified in phase 5's plan and never run: the file was still tracked at `f941e1d` with **no importer** since step 5.4 rewired the page, and `00-index.md`'s definition-of-done requires it gone. It is part of this amendment because it is `InlineCamera`'s last importer — leaving it would leave D30's now-unused component looking live. | APPROVED |

---

## Rejected alternatives

| ID | Alternative | Why rejected |
| --- | --- | --- |
| R1 | Keep the step name at the top of the screen and add the strip below the camera | The prep doc puts the strip on the top of the screen and the whole point is that the strip must survive on a small viewport; a strip below the camera pushes the camera's own control off-screen. The headline moves into `ShotStepPanel` (D7), which is where the step's own content belongs. |
| R2 | Reuse `RoomPhotoItem` with a `mode="strip"` | A third mode on a component two other surfaces import, for a 64×64 thumbnail that shares none of its markup (D18). |
| R3 | A Previous/Next pair as the primary navigation, strip as a progress indicator only | Prep §1 makes only captured items clickable and §2 names the back-from-a-viewed-step action as "go to current step", not "next" (D4). Also two overlapping navigation models is the readability problem the §Technical section asks to avoid. |
| R4 | Put the flow's state in the URL (`?step=3`) | The page's route declaration prefetches from path params only and the prep doc scopes the change to the page and its children; a search-param cursor would also make every capture a history entry, so browser Back would rewind step by step instead of leaving the guide — the opposite of prep §3. |
| R5 | `Modal.tsx` for the leave confirmation | Closes on backdrop click and Escape, which discards the confirmation silently (D12). |
| R6 | Auto-advance the cursor on capture (the current behaviour) | Removes the retake-on-the-spot step the prep doc's sequence ends with (D2, D3). |
| R7 | A single `InspectionGuideFlow.tsx` holding strip + panel + review inline, with sub-components in the same file | The prep doc's §Technical section asks for exactly the opposite in so many words. |
| R8 | Add a `GUIDE_FLOW_*` entry to `QUERY_ACTIONS` | The flow makes no request of its own; both reads belong to the page and are already prefetched (invariant 5 is satisfied by adding nothing). |

---

## Facts verified while writing this (with the command that verified them)

| Fact | Verified by | Result |
| --- | --- | --- |
| Baseline gate is green | `npm run gate` | exit 0; **24 files, 246 tests**, 0 failing |
| `ApartmentShotGuide` has exactly one importer | `grep -rn "ShotsGuide\|ApartmentShotGuide" src/` | only `src/pages/InspectionGuidePage.tsx:9,163` |
| The route, path and guard already exist and are unchanged | `grep -rn "inspectionGuide" src/lib/router/` | `paths.ts:76`, `routes/public.ts:65` — `requires: "canOpenHost"`, prefetches `reservation` + `shots` |
| `QUERY_ACTIONS` has both keys the feature reads | `cat src/lib/api/queryKeys.ts` | `RESERVATIONS_GET_ID`, `APARTMENT_SHOTS_GET_BY_APARTMENT` both present; no new key needed |
| The generated client exports the three request fns `submitInspectionPhotos` uses | `cat src/lib/api/submitPhotoProofs.ts` | unchanged by this feature; no `api:generate` needed |
| `useBlocker` exists and is exported by the installed react-router | `grep -n "useBlocker" node_modules/react-router/dist/development/index.d.ts` | `declare function useBlocker(shouldBlock: boolean \| BlockerFunction): Blocker;` (v7 line 870) |
| `useBlocker` works under a memory router too | read of `node_modules/react-router/dist/development/chunk-QFMPRPBF.mjs:6195–6205` | it reads `router.blockers` from `useDataRouterContext`, which `MemoryRouter` does not provide — **tests must use `createMemoryRouter` + `RouterProvider`, not `MemoryRouter`** |
| The header is `h-12`, `sticky top-0`, `z-40` | `grep -n "sticky" src/components/Header.tsx` | `Header.tsx:68` — the strip's `top-12`/`z-30` hang off this |
| `inlineCamera.*` copy exists in all four locales | `node -e` over `public/locales/*/host.json` | `en`, `de`, `tr`, `sr-Latn` all carry `title`, `description`, `cancelButton`, `openCameraButton` |
| `shotGuide.*` exists in all four locales with the same six children | `node -e` over `public/locales/*/assets.json` | identical key set in all four; the new keys extend this tree |
| `i18n:translate` fills missing keys only, preserving existing ones | read of `scripts/translate-locales.ts` | it diffs `en` against the target, translates only `missingKeys`, and leaves present keys untouched — so the phase-6 run is additive and idempotent |
| No `data-testid` exists in `src/` today | `grep -rn "data-testid" src/` | no matches — D27's two testids are new convention |
| Tests may not use `MemoryRouter` for the blocker | see the `useBlocker` row above | an in-app blocker test needs `createMemoryRouter`; `ReservationPage.test.tsx` uses `MemoryRouter` because it never blocks |
| Existing test style is `vi.hoisted` + module-boundary mocks with `importOriginal` | read of `src/pages/host/ReservationPage.test.tsx:1–50` | the phase-1 helper test needs none of that (pure module); the phase-5 test needs the router pattern only |

---

## Checklist — close every one of these before approval

**Shape**
- [x] Route path: unchanged (`/inspection-guide/:apartmentId/:reservationId`, `appPaths.inspectionGuide`) — n/a, no route work
- [x] Component location: `src/components/host/guide/` for the six flow components (D6, D7); `src/hooks/` for the guard hook (D10); `src/lib/helpers/` for the model (D1)
- [x] Server state vs local state: all reads stay in react-query on the page (unchanged); the cursor, `viewedIndex`, and `isCameraOpen` are `useState` inside `InspectionGuideFlow`; the captured photos are `useState<CapturedApartmentShot[]>` seeded from `initialShots`, exactly as today (D8, D22)
- [x] `QUERY_ACTIONS` key: none added, none changed (R8)

**API**
- [x] Generated request functions: `postApartmentsByIdPhotosUploadTokens`, `postApartmentsByIdPhotosConfirm`, `patchReservationsById` — all inside `submitInspectionPhotos`, all unchanged
- [x] Backend already exposes everything: **yes**, operator-confirmed (no `covera-hono` change)
- [x] `api:generate` re-run needed before execution: **no**
- [x] Auth: `withAuth()`, inside `submitInspectionPhotos` — unchanged

**Auth and routing**
- [x] Guard: `canOpenHost`, inherited from the existing route entry — unchanged
- [x] Roles that may reach it: `host` (via `canOpenHost`); no other role
- [x] Deliberately public: no
- [x] Lazy-imported: already is (`routes/public.ts:65`) — unchanged

**States** — one row per state the screen can be in
- [x] Loading: the page's existing spinner branch — unchanged
- [x] Empty: `shots.length === 0` → the existing `shotGuide.noShots` panel, no strip (spec §Behaviour row 2)
- [x] Error: the page's existing `notFound` and `unavailable` branches — unchanged
- [x] Success: the flow, in its four sub-states (all-pending, partly-captured, all-captured → review, viewing-a-captured-step)
- [x] Optimistic vs pessimistic: pessimistic, unchanged — the mutation fires on Submit from the review screen and the uploading overlay is the pending state; invalidation is the existing three keys

**Copy and i18n**
- [x] Namespace: `assets` (extends `shotGuide.*`); `host` is untouched
- [x] Key names decided now: **yes** — D17 lists every one; no copy is pending
- [x] Translated copy: `en` written in phase 1, the other three produced by `npm run i18n:translate` in phase 6 (operator-run, needs network)

**Forms** — n/a, the feature has none

**Evidence**
- [x] Testable logic: **yes**, in phases 1 and 5 → tests required there
- [x] Exempt: phases 2, 3, 4, 6 — reason in D25
- [x] Test location: beside the module (`src/lib/helpers/guideFlow.test.ts`, `src/lib/helpers/guideExit.test.ts`)

**Process**
- [x] Commit granularity: one per phase, by the operator; docs separate (D26)
- [x] Doc update: this file, the spec, and `docs/inspection-guide-refactor/` — committed before phase 1
- [x] Shared components changed: **`ShotsGuide.tsx` is deleted** (D6) — one importer, called out in the PR. `InlineCamera`, `Modal`, `PageLayout`, `BackLink`, `ConfirmButton` are all unmodified and unused-by-diff
