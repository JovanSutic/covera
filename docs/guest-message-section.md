# Guest message section

## Intent

The incident page's **Request text** section is the pattern the host asked for: the message is
shown in full, a copy control sits beneath it, and the surrounding section carries the guidance.
The reservation page currently offers the same guest-inspection message through a button and a
popover in the actions bar. The host wants the section instead — visible in place, with the message
and a copy control, and a hint below the text explaining where and how to send it.

The section is extracted as a shared component so the reservation page and the incident page render
the same thing. The incident page keeps its "Request text" wording and its Resolution Center link;
the reservation page gets "Guest message" wording and a booking-platform hint.

## Behaviour

| Route | Component | Guard | Data | States | i18n namespace |
| --- | --- | --- | --- | --- | --- |
| `/host/apartments/:id/reservations/:reservationId` | `ReservationPage` renders `CopyMessageSection` | `canOpenHost` | `reservation.inspection.id` (no new request) | hidden when the reservation has no inspection; visible with message, copy control and hint when it does | `host` |
| `/host/apartments/:id/reservations/:reservationId/incident` | `ClaimFilingPanel` renders `CopyMessageSection` | `canOpenHost` | the already-read incident | always visible with the request text and Resolution Center link | `host` |

The reservation page's actions bar loses its **Copy guest message** button and popover. The
reservations table's kebab menu keeps its copy popover — that surface is out of scope.

## Data

- `ReservationWithInspection.inspection.id` → `buildPath(appPaths.inspection, { id })`.
- `guestInspectionMessage.messageTemplate` with `{ guestName, guestInspectionUrl }`.
- No new API call and no contract change.

## Invariants this feature must not break

1. `src/api/generated/` is generated — never hand-edited.
2. No hardcoded user-facing strings — every label, hint and title goes through `t()`.
3. The guest message stays the existing `guestInspectionMessage.messageTemplate` key in all four locales.
4. The reservations table's copy popover is untouched.
5. The incident page's request text wording, link and copy behaviour are unchanged.
6. Query keys, network calls and mutations are not touched by this feature.
7. The route tables are not changed — no new route.

## Out of scope

- The reservations table's kebab-menu popover.
- Any change to the incident page's wording or link.
- Any new route, page or backend contract.
- The guest's own `/inspection/:id` page.
- Any new copy beyond the section title and the hint.

## Open questions

None.
