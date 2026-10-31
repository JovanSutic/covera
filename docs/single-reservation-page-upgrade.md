# Single reservation page — upgrade

Status: DRAFT

Source of truth for the asks: [./single-reservation-page/upgrade-prep.md](./single-reservation-page/upgrade-prep.md).
This document says what is **true after this lands**. The prep says what was wrong.

## Intent

The single reservation page shipped, and then it was used. Five things came back from that use:
the reservation table's action menu is confusing and duplicates work the page already does; the
page's back link and header do not match the apartment page next to it; the proof section hides
and shows its own controls instead of holding still; the photos a host just captured are not
visible when they return from the capture flow; and the delete pattern that already exists on
`AssetItemCard` was reinvented here instead of shared.

This pass fixes all five, and pays down the pattern debt underneath them by extracting the
primitives the app kept re-writing: a configurable action button, a delete-with-confirmation
button, a tap-safe info tooltip, a back link, and a section card.

It is a **frontend-only** change. Every endpoint it needs already exists and is already used by
the page.

## Behaviour

| # | Route | Component | Guard | Data (query key) | States | i18n ns |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `/host/apartments/:id` (reservations tab) | `ReservationsTable` → `ReservationActionsMenu` | `canOpenHost` | `useReservations` → `QUERY_ACTIONS.RESERVATIONS_GET_BY_APARTMENT` | loading / empty / error / success | `host` |
| 2 | `/host/apartments/:id` (drawer) | `CreateReservationForm` | `canOpenHost` | `postReservations` → invalidates `RESERVATIONS_GET_BY_APARTMENT` | idle / submitting / error / **redirect** | `host` |
| 3 | `/host/apartments/:id/reservations/:reservationId` | `ReservationPage` + `ReservationHeader` + `ReservationActionsBar` | `canOpenHost` | `useReservation` → `RESERVATIONS_GET_ID`; `useApartmentsHost` → `apartmentsHost` | loading / not-found / success | `host` |
| 4 | `/host/apartments/:id/reservations/:reservationId` | `ReservationProofSection` | `canOpenHost` | `useInspection` → `INSPECTION_GET_BY_ID` (**eager**) | loading / no-inspection / no-photos / photos / error | `host` |
| 5 | `/inspection-guide/:apartmentId/:reservationId` | `InspectionGuidePage` | `canOpenHost` | `useReservation`, `useShots` | unchanged, except invalidation | `host` |

### What each route must make true

1. **Table.** The last column is headed *Actions* and right-aligned. Its menu holds exactly two
   entries — copy guest message and delete. Each entry is a single clickable row: icon and label
   highlight together when enabled, and read as non-interactive (`cursor-not-allowed`, no hover)
   when disabled. No icon is rendered twice in one row.
2. **Create.** A successful create navigates to
   `/host/apartments/:apartmentId/reservations/:id`. No success toast on that path. The failure
   toast stays.
3. **Page.** Below the header sits an actions block, then Proof, Time, Other — in that order. The
   header carries the guest's name, the guest's email, the check-in date and time, and the
   apartment's name and address, plus the same back link the apartment page uses.
4. **Proof.** The section always renders both controls, in the same position, on every visit: take
   photo proofs (disabled when the window is not open) and check out the photo proofs (disabled
   when no photos exist). It states the status, explains it in one line, and reports how many
   photos there are and when the last one was captured. *Check out the photo proofs* opens a
   dialog containing the photos, grouped by room.
5. **Return.** Submitting photos in the guide flow invalidates the inspection read, so the
   reservation page shows the new count and an enabled photo control on arrival — no reload, no
   stale count.

## Data

No new endpoint, no `covera-hono` change, no `npm run api:generate`.

| Need | Existing surface | Already used by |
| --- | --- | --- |
| The reservation | `getReservationsById` → `ReservationWithInspection` | `useReservation` |
| The apartment's name and address | `getApartmentsHostMe` → `ApartmentWithLocation[]` | `useApartmentsHost` (section-level prefetch) |
| The photos, their count, and their last capture time | `getInspectionsById` (`?detailed=true`) → `DetailedInspection.shots[].images[]` | `useInspection` |
| Delete | `deleteReservationsById` | `useReservationActions` |
| Create a guest inspection | `postInspections` | `useReservationActions` |
| Create a reservation | `postReservations` | `CreateReservationForm` |

`QUERY_ACTIONS` gains **no** entry. The photo count and timestamp are derived from
`INSPECTION_GET_BY_ID`, the key the read and its invalidation already share.

`ReservationWithInspection` carries no apartment name/address and no photo count — the header read
comes from `apartmentsHost`, which the `host` section route already prefetches, and the count comes
from `summarizeShotProofs` over the inspection's shots (decisions D14, D17).

## Invariants this must not break

- No hardcoded user-facing strings — every key exists in `en`, `de`, `tr`, and `sr-Latn`
- No secret in a `VITE_` env var
- Query keys come from `QUERY_ACTIONS`
- Network calls go through `withAuth()` / `publicApi()` — the one anonymous call
  (`fetchInspection`) stays anonymous
- Mutations invalidate the keys they changed
- Forms validate with a zod schema resolved through `@hookform/resolvers`
- Routes live in `src/lib/router/routes/*.ts` as `page: () => import(...)` entries built by
  `defineRoutes`; every authenticated branch carries a rule name from `ACCESS_RULES`.
  **This feature adds no route.**
- `src/api/generated/` is not hand-edited
- Feature-specific: **every action button on the reservation page renders through one primitive**
  (`ActionButton`). A raw `<button>` with bespoke colour classes in `ReservationActionsBar` or
  `ReservationProofSection` is the regression this pass exists to prevent.
- Feature-specific: **delete renders through `ConfirmButton`** on both surfaces. The
  confirmation step is never inlined again.
- Feature-specific: **`getProofWindowState` stays the only computation of "can this host take
  shots"** (inherited from the previous plan's invariant 9). The proof section reads its answer; it
  does not re-derive it.
- Feature-specific: **`summarizeShotProofs` is the only computation of photo count and last
  capture time.**

## Out of scope

- Any `covera-hono` change. The photo count and last-capture time are derived client-side.
- New routes, new route params, and new `QUERY_RESOURCES` entries.
- Reworking `src/components/formItems/Button.tsx`. It stays the forms' submit primitive, including
  the Save/Cancel pair inside the Time section's edit form.
- `src/components/FormPage.tsx`, `FlagContentForm`, `ShotStudioModal`, `InlineCamera`,
  `GuestInspectionMessage`, `Modal`, `Popover`, `Drawer`, `Card` — consumed, not modified (except
  where a step names them).
- The `/inspection/:id` guest view beyond the `RoomPhotoItem` `mode` prop.
- Applying `ActionButton`/`SectionCard` to pages outside the reservation surface. The primitives
  are built to be app-wide, but this pass converts only the reservation table, the reservation
  page, and the two headers that share the back link.
- Pagination, sorting, filtering, or column changes on the reservations table beyond the Actions
  header.
- Backend status semantics. `DISPUTED`, `RESOLVED`, `CLOSED` get explanatory copy; they get no new
  actions.

## Open questions

Empty. Every choice is in [./single-reservation-page-upgrade.decisions.md](./single-reservation-page-upgrade.decisions.md).
