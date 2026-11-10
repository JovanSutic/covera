# Incident claims (damage / theft)

Status: APPROVED

## Intent

After a guest checks out, a cleaner may find an asset damaged or missing. Today the host has nowhere
to record that inside Covera, so the claim lives in their head and their phone camera roll, and it
drifts off Airbnb's procedure — the window closes, or the resolution-centre request is filed wrong,
or with nothing behind it.

This feature gives the host a place to open a **claim** against a reservation, list the affected
assets as **items** (one asset each, labelled damage or theft), and collect **photo evidence** per
item — from the host, or from the cleaner on a **link that needs no account**. It then hands the host
everything they need to file the claim in Airbnb's Resolution Center: the figures, copy-ready text
for the request box, and a link straight there. Airbnb's clocks are surfaced rather than described:
the 24 hours the guest has to respond once the claim is filed, and the deadline for escalating to
AirCover.

The point is not to be a form. It is to close the gaps where a host drifts off the defined Airbnb
procedure, and to make them confident the paperwork is right.

## Behaviour

`Route` is the URL as the user sees it. `Guard` names the rule from `src/lib/router/access.ts`.

| # | Route | Component | Guard | Data (query key) | States | i18n ns |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `/host/apartments/:id/reservations/:reservationId` | `ReservationIncidentSection` | `canOpenHost` | `INCIDENTS_GET_BY_APARTMENT` | loading / no incident yet / incident open / incident filed | `host` |
| 2 | `/host/apartments/:id/reservations/:reservationId/incident` | `IncidentPage` | `canOpenHost` | `RESERVATIONS_GET_ID`, `ASSETS_GET_BY_APARTMENT`, `INCIDENTS_GET_BY_APARTMENT`, `INCIDENTS_GET_ID` | loading / not found / no incident (create) / draft / ready to file / submitted | `host` |
| 3 | same | `IncidentItemList` + `AddIncidentItemForm` | same | `INCIDENTS_GET_ID` | no items (empty) / items with tokens / items with evidence / item error | `host` |
| 4 | same | `ClaimFilingPanel` | same | `INCIDENTS_GET_ID` | ready to file / filing pending / filed + 24 h countdown / emergency banner | `host` |
| 5 | `/field/incident/:token` | `FieldIncidentPage` | `public` (the token is the credential) | `FIELD_INGEST_GET_BY_TOKEN` | loading / link unusable / capture each required type / submitting / done / framing reference absent | `guest` |

Rows 2–4 are one page with three sections; they are separate rows because they have separate
states, not separate URLs.

States in full:

- **Row 1** — *no incident yet*: an explanatory card and an "Open a claim" button. *Incident open*:
  a status chip, the item count, the placeholder total, and an "Open claim" button. *Filed*: the
  same, plus the guest-response deadline.
- **Row 2** — *no incident*: the create form (the backend enforces one incident per reservation, so
  this state means "create", not "choose"). *Not found*: unknown reservation id, or one this host
  cannot read — one branch, because they are the same thing to a host (a link that does not work).
  *Draft*: items are editable and the filing panel is closed. *Ready to file*: the filing panel
  opens. *Submitted*: the item section becomes read-only and the countdown starts.
- **Row 3** — *empty*: the asset picker with no rows yet. *With tokens*: each item shows its status
  and a copy-link control. *With evidence*: each item shows its evidence count and can still take
  more photos while its token is live.
- **Row 4** — *emergency*: when `isEmergencyMode` is true, a red banner is pinned above the panel.
  *Countdown*: hours and minutes to `guestResponseDeadlineAt`, and days to
  `aircoverEscalationDeadlineAt`.
- **Row 5** — *link unusable*: unknown, expired and already-used tokens all render the same screen —
  the backend answers `404 FIELD_TOKEN_INVALID` for all three deliberately, so the UI must not
  distinguish them either.

## Data

New `QUERY_ACTIONS` entries in `src/lib/api/queryKeys.ts`:

| Entry | Value | Used by |
| --- | --- | --- |
| `INCIDENTS_GET_BY_APARTMENT` | `["incidents", "getByApartment"]` | rows 1, 2 |
| `INCIDENTS_GET_ID` | `["incidents", "getId"]` | rows 2, 3, 4 |
| `FIELD_INGEST_GET_BY_TOKEN` | `["fieldIngest", "getByToken"]` | row 5 |

New query modules, each exporting a hook whose name matches its resource (`manifest.ts` enforces
this by object identity at import):

| Module | Hook | Resource | Request function |
| --- | --- | --- | --- |
| `src/lib/api/queries/incidents.ts` | `useIncidents` | `incidents` | `getIncidents` |
| `src/lib/api/queries/incident.ts` | `useIncident` | `incident` | `getIncidentsById` |
| `src/lib/api/queries/fieldIngest.ts` | `useFieldIngest` | `fieldIngest` | `getFieldIngestByToken` |

Write path (no query resource — these are called from mutations, never prefetched):

| Call | Function | Auth |
| --- | --- | --- |
| create the claim | `postIncidents` | `withAuth()` |
| add an item | `postIncidentsByIdItems` | `withAuth()` |
| re-mint an item's field link | `postIncidentsByIdItemsByItemIdReissueToken` | `withAuth()` |
| mint evidence upload URLs | `postIncidentsByIdItemsByItemIdUploadTokens` | `withAuth()` |
| attach uploaded evidence | `postIncidentsByIdItemsByItemIdEvidence` | `withAuth()` |
| set the payout asked for | `patchIncidentsById` | `withAuth()` |
| confirm the Airbnb filing | `postIncidentsByIdConfirmAirbnbFiling` | `withAuth()` |
| field portal: read the item | `getFieldIngestByToken` | **anonymous** |
| field portal: mint upload URLs | `postFieldIngestByTokenUploadTokens` | **anonymous** |
| field portal: submit photos | `postFieldIngestByTokenSubmit` | **anonymous** |

The generated client and its types are already regenerated in the working tree (the incident
surface is `src/api/generated/requests/*.gen.ts`, modified but uncommitted). **No contract change is
needed for this feature** — every call above exists today.

Two facts about this surface the implementation must respect, both verified against
`covera-hono/src/modules/incidents/`:

- **There is no incident-by-reservation endpoint.** `GET /incidents` requires `apartmentId` and
  returns a paginated list, so both host surfaces resolve "the incident for this reservation" by
  reading the apartment's list and matching `reservationId`.
- **`GET /field/ingest/{token}` returns `404 FIELD_TOKEN_INVALID` for an unknown token, an expired
  one, and an already-used one alike.** That is deliberate anti-oracle behaviour; the UI must not
  try to tell them apart.

## Invariants this must not break

Link to the Invariants section of the kickoff skill; the feature-specific ones in **bold**.

- `src/api/generated/` is never hand-edited
- No hardcoded user-facing strings — every key exists in `en`, `de`, `tr`, and `sr-Latn`
- Query keys come from `QUERY_ACTIONS`
- Network calls go through `withAuth()` / `publicApi()`
- Mutations invalidate the keys they changed
- No secret in a `VITE_` env var
- **Nothing in the field portal calls `withAuth()`.** The cleaner has no session; `withAuth()` would
  attach `Bearer undefined`. All three field calls are anonymous, in the module and in the portal.
- **Every "what can I do next" answer comes from one helper, not from a component comparing status
  strings.** The reservation section, the claim page and the field portal must not each decide
  whether an item is still collectable.
- **The field portal never writes an evidence type the item's type does not require.** The backend
  validates each submitted `evidenceType` against `requiredPhotoTypes(item.type)`; the portal offers
  exactly that set and nothing else.
- **`src/lib/router/__checks__/` assertions are not relaxed to make a phase pass.** Three of them
  pin literal file→resource lists; a change there is drift, not a fix.

## Out of scope

The executor must not infer any of these.

- **Documents.** The AirCover document vault (receipts, retail quotes, handyman invoices, police
  reports) and the 30-day escalation window's upload matrix. The blueprint's row 5 is not built.
  The generated `upload-tokens` and `evidence` calls accept documents, but no surface here sends
  `kind: "document"`.
- **Statuses with no writer.** `documents_pending`, `escalated_to_aircover`, `resolved` and
  `unfeasible` exist in the generated union but no backend route sets them. The UI **renders** them
  correctly if they arrive; it never offers a transition into them.
- **The ghost-overlay camera is built as a FRAMING REFERENCE, not a viewfinder.** Blueprint View B
  asks for the previous stay's photo at `opacity: 0.4` over the live camera. The backend does supply
  an asset-scoped baseline (`FieldIngest.baselinePhotos` — signed 5-minute URLs of the most recent
  earlier stay's `checkin_state` photos for *this asset*, `[]` when there are none), so the data
  exists. What is not built is **real-time video**: no `getUserMedia`, no `<canvas>`, no MediaStream.
  The baseline renders as a dimmed still behind the capture preview, to frame the shot against. The
  capture path is unchanged — the native camera picker every other photo flow in this app uses.
- **Real-time video.** The native camera picker is the capture path; no `getUserMedia`, no canvas.
- **A new i18n namespace.** Host copy goes in `host.json`, field-portal copy in `guest.json`.
- **Machine translation.** New English strings are written verbatim into all four locale files
  (decision D11), not passed through `npm run i18n:translate`.
- **Editing the incident's reservation, or moving an item between incidents.**
- **A cleaner-facing index of their links, or any cleaner identity.** The portal is
  zero-authentication by design; it knows only the token in the URL.

## Open questions

**Empty.** Every open question was moved to [`incident-claims.decisions.md`](./incident-claims.decisions.md)
with a recommendation, and none is left `OPEN`.
