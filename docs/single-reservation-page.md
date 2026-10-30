# Single reservation page

Status: DRAFT

## Intent

A host has one page that holds everything about a reservation: who the guest is, the dates and the
alternative dates they can still edit, the proof status with the actions that belong to it, and the
remaining low-importance data. Today that data is spread across a row's inline icon buttons in the
reservations table, and the proof-taking flow is a modal living inside `IndividualApartment`, a page
that already holds assets, shots running costs, a studio, two drawers and a reservation manager.

Two things are true after this lands. A host clicks a reservation row and lands on a page about that
reservation. A host who takes proofs lands on `/inspection-guide/...`, a page of its own, instead of
a dialog stacked on a page that has nothing to do with it.

The second one is really a placement change. The prep asks for a home where this flow can later be
opened to someone who is not a host, under a guard that is not the role guard. That guard is out of
scope; where the page sits in the tree is not, because the wrong placement makes the guard
impossible to add cleanly later.

## Behaviour

| # | Route | Component | Guard | Data (query key) | States | i18n ns |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `/host/apartments/:id/reservations/:reservationId` | `src/pages/host/ReservationPage.tsx` | `canOpenHost` | `reservation` | loading / error / not-found / success · photos collapsed / loading / empty / loaded · edit-idle / editing / saving / save-error | `host` |
| 2 | `/inspection-guide/:apartmentId/:reservationId` | `src/pages/InspectionGuidePage.tsx` | `canOpenHost` (capability guard later — D8) | `reservation`, `shots` | loading / error / window-closed / already-covered / capturing / uploading / success | `host`, `assets` |
| 3 | `/host/apartments/:id` (reservations tab) | `src/components/host/ReservationsTable.tsx` | `canOpenHost` (unchanged) | `reservations` (unchanged) | unchanged + row-click affordance | `host` |

Behaviour the pages must have, in words:

- Clicking anywhere in a reservations table row that is not the actions cell opens that reservation's page.
- The row's final cell is a kebab (vertical ellipsis) button that opens a menu holding the four
  actions the inline icons hold today: take proofs, create guest inspection, copy the guest message,
  delete. Each keeps its current enabled/disabled rule and tooltip.
- The reservation page shows four sections: **Guest** (read-only), **Time** (check-in/check-out
  fixed; the alternative dates editable while the reservation has not started), **Proof** (status
  chip plus actions), **Other** (low-importance data).
- The proof section's primary action depends on state: **not covered and inside the window** → a
  button to the guide page; **covered** → a collapsed control that loads and shows the coverage
  photos only when opened; **window closed or expired** → the action disabled with the reason.
- The page header carries the two general actions — delete, and the guest message — as buttons
  rather than icons.
- The guide page renders the same capture flow the dialog renders today, one-shot per shot, with the
  same upload-progress and completion behaviour, and refuses to open when the window is closed or
  proofs already exist.

## Data

**The backend does not expose a single reservation.** `GET /reservations/apartment/{apartmentId}`
is the only read (`covera-hono` `src/modules/reservations/reservations.route.ts`), and it is
paginated — a direct link to a reservation that is not on the loaded page cannot be served from it.
**The first phase of this plan is therefore a contract change in `covera-hono`.**

| Need | Source | Status |
| --- | --- | --- |
| One reservation with its inspection | `GET /reservations/{id}` → `ReservationWithInspection` | **new — phase 1** |
| Guest inspection for a reservation | `GET /inspections/reservation/{reservationId}` | exists (`getInspectionsReservationByReservationId`), not used by this feature |
| Coverage photos (shots + assets + images) | `GET /inspections/{id}?detailed=true` | exists — `useInspection` / `inspectionResource`, reused as-is |
| Apartment shot definitions | `GET /apartment-shots/apartment/{apartmentId}` | exists — `useShots` / `shotsResource` |
| Update the alternative dates | `PATCH /reservations/{id}` | exists — `patchReservationsById` |
| Delete | `DELETE /reservations/{id}` | exists — `deleteReservationsById` |
| Create the guest inspection link | `POST /inspections` | exists — `postInspections` |
| Upload + confirm + mark covered | `postApartmentsByIdPhotosUploadTokens`, `postApartmentsByIdPhotosConfirm`, `patchReservationsById` | exists, unchanged — `submitInspectionPhotos` |

New frontend entries: `QUERY_ACTIONS.RESERVATIONS_GET_ID`; query module
`src/lib/api/queries/reservation.ts` exporting `useReservation` + `reservationResource`, registered
in `QUERY_RESOURCES` and `QUERY_HOOKS`' module map.

`npm run api:generate` must run after phase 1 is deployed, before any phase-2+ step that names
`getReservationsById`.

## Invariants this must not break

The skill's invariants, plus these feature-specific ones:

- **No hand-edits under `src/api/generated/`.** `getReservationsById` arrives by regeneration only.
- **Query keys come from `QUERY_ACTIONS`.** `RESERVATIONS_GET_ID` is a new registry entry; the
  reservation page, the guide page and every invalidation site use its key builder
  (`reservationQueryKey`), never a literal.
- **Every new page declares its data on its route.** `prefetchCoverage.test.ts` fails the gate when a
  page reads a query hook its route does not declare. The guide page declares `reservation` and
  `shots`; the reservation page declares `reservation` and one `inspection` entry that resolves to
  `null` (the lazy photo read — D10).
- **The proof window is computed in exactly one place.** `getProofWindowState` is the only
  computation of "can this host take shots"; the table menu, the reservation page and the guide page
  all call it. Duplicating the arithmetic is the bug this feature must not introduce.
- **Alternative dates are editable only before the effective check-in.** The effective check-in is
  the alternative when one is set — the same precedence the delete rule already uses.
- **The guest inspection URL stays anonymous.** `/inspection/:id` and `getInspectionsById` are
  deliberately session-less; this feature does not add auth to either.
- **Photos are not fetched on page load.** The detailed inspection request starts only when the host
  opens the photo control.

## Out of scope

- **The capability guard for the guide page, and the share-link UI that mints the identifier.** Phase
  3 places the route at top level with `canOpenHost` so that guard can replace one line later. No
  token, no `?openFor=`, no share button, no non-host role is built here.
- **Any change to the guest-facing inspection handover** (`/inspection/:id`, `InspectionPage`).
- **Any change to the backend's inspection or upload contract** beyond the one new reservation read.
- **A guest dashboard, admin access to the reservation page, or a reservation edit form beyond the
  alternative dates.** Room location, shot definitions, the studio, assets, and the create-reservation
  form are untouched.
- **Photos of a reservation that has an inspection but no uploaded images** — that renders the empty
  state, not a new flow.
- **Retrying a partially-failed upload.** `submitInspectionPhotos` keeps its current all-or-nothing
  behaviour.
- **A new i18n namespace.** Everything lands in `host`, reusing `assets.shotGuide.*`.

## Open questions

None. Every choice is a row in [single-reservation-page.decisions.md](./single-reservation-page.decisions.md).
