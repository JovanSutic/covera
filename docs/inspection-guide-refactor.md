# Inspection guide refactor

Status: DRAFT

Source of truth for intent: [./inspection-guide-refactor-prep.md](./inspection-guide-refactor-prep.md) (the operator's prep doc).
This spec says what is true *after* this lands.

## Intent

The photo-proof guide is used one-handed on a phone, by a host standing in a room. Today it shows
exactly one step and nothing about the steps around it, so the host cannot see how much is left,
cannot look back at a photo they already took, and cannot tell where they are in the sequence.

The refactor makes the guide a **multi-step flow with a persistent photo strip**: every photo the
apartment requires is a small item in a horizontal list pinned above the main panel, blank until
taken. The strip is always visible (except while the native camera is open), always shows which
step is current, and lets the host jump back to any photo already taken — to look at it large and
retake it — with one tap on "go to current step" to return.

`ApartmentShotGuide` is 250 lines in one file. It is split into small named pieces with one
responsibility each: the pure flow model, the strip, one strip item, one step panel, the step
actions, the pre-submit review screen, and a thin orchestrator that composes them.

## Behaviour

One route, unchanged. The feature is entirely inside the component tree the route renders.

| # | Route | Component | Guard | Data | States | i18n ns |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `/inspection-guide/:apartmentId/:reservationId` | `InspectionGuidePage` → `InspectionGuideFlow` | `canOpenHost` | `RESERVATIONS_GET_ID` (reservation), `APARTMENT_SHOTS_GET_BY_APARTMENT` (shots) — both unchanged, both already prefetched by the route declaration | loading / notFound / unavailable / **flow** | `host`, `assets` |
| 2 | (same route, flow state) | photo strip | — | from `shots` + flow state, no request | all-pending / partly-captured / all-captured / empty (`shots.length === 0` → the existing `shotGuide.noShots` panel, no strip) | `assets` |
| 3 | (same route, flow state) | step panel | — | no request | camera closed / camera open / no photo yet / photo captured | `assets` |
| 4 | (same route, flow state) | review screen | — | no request | shown only when every step carries a photo and the host is not reviewing an earlier step; submit pending → the existing uploading overlay | `assets` |
| 5 | (same route, exit attempt) | leave-confirm dialog | — | no request | shown on a blocked in-app navigation; not shown while submitting (upload owns the screen) | `assets` |

### The three aspects of the prep doc, as behaviour

1. **Photo strip.** Horizontal, scrollable, pinned under the header in every flow state. One item per
   shot, in the order the shots arrive. A step with no photo renders a blank item; a step with a photo
   renders the thumbnail. Exactly one item is *current* — the step sequential progress stopped at —
   and carries a highlighted border. **Only captured items are interactive**; a pending item is not a
   button and cannot be focused or activated. Tapping a captured item shows that step in the main
   panel, where the photo is rendered large and **Retake photo** is available; the forward action there
   is **Go to current step**, never Next.
2. **Sequential advance.** There is one cursor. It starts at step 0 and only ever moves to the next
   *pending* step. Capturing does not move it: after the native camera returns, the host sees the photo
   in the main panel and in the strip, and chooses **Retake photo** or **Next**. The flow is complete
   when every step carries a photo; only then does the review screen appear.
3. **Review before submit.** When the flow is complete the main panel is replaced by a review screen —
   text only, telling the host that all photos are collected and to check the strip before submitting.
   The submit button lives there and nowhere else. While any photo is captured and not yet submitted,
   leaving the flow by in-app navigation asks for confirmation.

## Data

`none`. Every request already exists and is already prefetched by the route declaration:

- `useReservation(reservationId)` — `RESERVATIONS_GET_ID`
- `useShots(apartmentId)` — `APARTMENT_SHOTS_GET_BY_APARTMENT`
- `submitInspectionPhotos()` in `src/lib/api/submitPhotoProofs.ts` — the same three generated
  requests, `withAuth()`-authed, unchanged.

No new `QUERY_ACTIONS` entry. No `npm run api:generate`. No change to `covera-hono`. The backend
already exposes everything this needs (operator-confirmed in kickoff).

## Invariants this must not break

Skill invariants 1–9 apply. Feature-specific:

10. **The flow's decisions are computed in `src/lib/helpers/guideFlow.ts`.** No component derives
    "is this step captured", "which step is next", "may this strip item be tapped", or "should leaving
    warn" by itself. A surface that needs a variant extends the helper and its test.
11. **The strip is presentational.** `PhotoStrip` and `PhotoStripItem` receive a `StripItem[]` and an
    `onSelect(index)`; they compute no reachability and hold no state.
12. **`submitInspectionPhotos`, `getProofWindowState`, `src/lib/api/`, `src/lib/router/`, and
    `src/api/generated/` are not modified.** `git diff --stat` names none of them.
13. **A pending strip item is not a `<button>`.** It cannot be tabbed to or activated, in any state.
14. **`InspectionGuideFlow` renders no business logic inline.** It owns `useState` for the cursor and
    the viewed index, calls the helper, and passes results down.

## Out of scope

- No new route, no change to `appPaths.inspectionGuide`, no router file touched.
- No API, contract, or `src/api/generated/` change.
- No change to `ReservationPage`, `ReservationProofSection`, or any reservation surface.
- No change to the upload itself (`submitInspectionPhotos` and its three requests stay byte-identical).
- No change to the guest-side surfaces (`InspectionPage`, `RoomFlowList`, `RoomPhotoItem`).
- No history traps, no disabled browser chrome, no `history.pushState` interception. The exit guard is
  a confirmation, not a lock (operator decision E1).
- No reordering or filtering of shots — the strip renders them in the order the API returns.
- No offline persistence, no drafts across reloads.

## Open questions

None. Every choice is closed in [./inspection-guide-refactor.decisions.md](./inspection-guide-refactor.decisions.md).
