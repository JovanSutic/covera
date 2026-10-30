# Reservation table extraction

Status: DRAFT

## Intent

Three corrections to the reservations table that landed with the single-reservation-page feature.

**One.** A reservation whose stay is over must still be readable and reachable. Today the table
passes `isRowDisabled` for a past check-out, which dims the row and — through `pointer-events-none`
— makes it unclickable, so a past reservation can no longer be opened at all. The dimming and the
decision belong in different places: the row stays a row, and the *actions* that make no sense for a
finished stay are what get disabled, in the actions menu.

**Two.** `ReservationsTable` is not reusable. It carries the section chrome — a title, a
description, a "new reservation" button and a create button inside its empty state — which means it
can only ever be dropped into a page that wants exactly that heading and that button. The table
itself (columns, rows, paging, the read) is the reusable part; the chrome belongs to the page that
composes it.

**Three.** The platform-id column renders its header and its cell in a different font from the rest
of the table. `DataTable` applies a column's `className` to both its `<th>` and its `<td>`, so a
column that sets `font-mono text-xs` drags its *header* into the monospace style as well. All the
ordinary cells and headings should read as one typeface, one size, one style.

## Behaviour

| # | Surface | Component | Guard | Data (query key) | States | i18n ns |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | reservations tab of `/host/apartments/:id` | `src/components/host/ReservationsTable.tsx` | `canOpenHost` (unchanged) | `reservations` (unchanged) | unchanged | `host` |
| 2 | reservation page actions | `src/components/host/ReservationHeaderActions.tsx` | `canOpenHost` (unchanged) | none added | unchanged | `host` |
| 3 | reservation page | `src/pages/host/IndividualApartment.tsx` | `canOpenHost` (unchanged) | `reservations` (unchanged) | unchanged | `host` |

Behaviour the change must have, in words:

- A row for a reservation whose stay is over renders **undimmed and clickable**; clicking it opens
  that reservation's page like any other row.
- Opening the kebab menu on such a row shows all four actions **disabled**, each carrying a tooltip
  that says the stay is over. The menu still opens; the items do not fire.
- The reservation page's header buttons for the same reservation are disabled by the same rule, so
  the table and the page never disagree about a past reservation.
- `ReservationsTable` renders **only** the table: the read, the columns, the rows, the paging, the
  loading / empty / error states. It takes `apartmentId` and `onTakeProofs`. It renders no heading,
  no description, no create button — including inside its empty state, which becomes plain text.
- The page that uses it renders the heading, the description and the "new reservation" button, and
  that button opens the same create drawer it opens today.
- Every ordinary column in the table — header and cell — renders in the table's normal header style
  and normal cell style. No column overrides the font, size or colour of its own text.

## Data

`none`. Every read this touches already exists and is unchanged: `useReservations` →
`GET /reservations/apartment/{apartmentId}` (`QUERY_ACTIONS.RESERVATIONS_GET_BY_APARTMENT`). No new
generated request function, no `QUERY_ACTIONS` entry, no backend change, no `api:generate` run.

## Invariants this must not break

The skill's invariants, plus these feature-specific ones:

- **The past-date rule is computed in exactly one place.** `getProofWindowState` already owns "can
  this host take shots"; it gains the check-out answer the same way. The actions menu, the page
  header and any future surface read `isPast` off the helper — none re-derives it from
  `checkOutDatetime`. (Mirrors the existing invariant 9 for the proof window.)
- **No new i18n namespace.** Every key lands in `host`, beside the `reservationActionsCell.*` keys
  it sits next to.
- **`DataTable` is not modified.** The reusable part of this change is the *caller*; the shared
  table keeps its current per-column `className` contract, which the other three tables rely on.
- **`isRowDisabled` is left alone.** It is a pre-existing optional prop on `DataTable` with no
  remaining caller after this change; removing it is a change to a shared component that no part of
  this feature needs (D9).
- **The empty state is still reachable and still distinct from loading.** Dropping the button from
  it must not drop the state itself.

## Out of scope

- **The `alternativeCheckOutDatetime` field is left alone.** It is on `ReservationRow`, is never
  rendered by the table, and `ReservationTimeSection` renders it as an always-empty `<dd>`. It is a
  real defect (noticed while planning, recorded in D11) but it is not one of the three things asked
  for and is not touched here.
- **The other `font-mono text-xs` sites are left alone** — `src/components/admin/ApartmentsSection.tsx`
  and `src/components/host/ApartmentHeader.tsx`. Same drift, different screens; not part of this
  change.
- **No change to `DataTable`'s header styling.** Headers stay uppercase/small/semibold app-wide
  (D10) — this change only stops individual columns from diverging from that.
- **No change to the proof window's own arithmetic**, to the reservation page's sections, to the
  guide page, or to any mutation.
- **No new table features** — no sorting, no filtering, no column config, no reusable empty-state
  component.

## Open questions

None. Every choice is a row in [reservation-table-extraction.decisions.md](./reservation-table-extraction.decisions.md).
