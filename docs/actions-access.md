# Actions & access — spec

What is true after this lands. Two workstreams, one plan (operator decision, 2026-11-26):

- **A — access-link frontend integration.** `covera-hono`'s `feature/53_special-access-fixes` is
  **deployed** (verified 2026-11-26 against the live API: every probe in `docs/handoff.md` §4 now
  answers its "required now" value). This workstream consumes it.
- **B — reservation/incident action gating.** The four button rules in
  `docs/reservation-actions-access.md`.

Sources: `docs/handoff.md` (A), `docs/reservation-actions-access.md` (B),
`docs/backend-blockers.md` (the backend record — now resolved, kept for the probe table).

---

## Intent

**A.** A host mints a short-lived link and sends it to someone with no account — a photographer or a
cleaner — so that person can open the inspection guide for a reservation, collect the pre-state
photos, and **submit them**. The same link holder must be able to work the claim-proofs page for a
damage claim. Today the frontend is deliberately read-only and refuses the proofs page outright,
because the backend would not accept the writes; that is no longer true.

**B.** Four buttons on the reservation and incident pages are offered at times they cannot succeed,
or withheld when they should be available. Each gets one rule, computed once and shared by every
surface that renders it.

---

## Behaviour

### A — the access link

| Route | Component | Guard | Data | States | i18n |
| --- | --- | --- | --- | --- | --- |
| `/inspection-guide/:apartmentId/:reservationId` | `InspectionGuidePage` | `canOpenHost` **or** `?accessId=` (p7) | `reservation`, `shots` (host) / access-aware reads (guest) | host: loading/error/window/ready · guest: loading/**invalid link**/ready+submit | `host` |
| `/incident/:incidentId/proofs` | `IncidentProofsPage` | `public` (unchanged) | `incident`, `reservation`, `assets`, `reservationPhotos` — all access-aware for a guest | host: loading/error/empty/ready · guest: loading/**invalid link**/ready | `host` |

The two guest surfaces share one rule: **presence of `?accessId=` selects the token path, always.**
A page holding a link never calls `withAuth()` (invariant 8). A bad token with a live session is a
403 by design, so a host visiting a `?accessId=` URL gets the guest view — the host's own view is the
param-less URL.

### B — the four buttons

All four need the apartment's **sibling reservations** (the same apartment's other stays), because
every rule is bounded by a neighbouring stay. One helper computes all of them.

| # | Button | Where | Enabled when | Disabled because |
| --- | --- | --- | --- | --- |
| 1 | Manage claim photos | `IncidentPage` | no newer stay has started **and** the claim is unfiled | `nextStayStarted` · `claimFiled` |
| 2 | Create guest inspection link | moves to `ReservationLinksSection` | reservation is `COVERED` **and** now ≤ effective check-in + 1 h | `notCovered` · `pastCheckInGrace` · `hasInspection` |
| 3 | Start claim | `ReservationIncidentSection` | now ≥ effective check-out − 1 h **and** now < next stay's check-in **and** now ≤ check-out + 30 d | `tooEarly` · `nextStayStarted` · `past30Days` |
| 4 | Grant special photo access | `ReservationLinksSection` | now ≥ previous stay's check-out − 1 h **and** now < this stay's effective check-in | `noPrecedingCheckout` · `tooEarly` · `pastCheckIn` |

Button 4 is the current "Create inspection link" — renamed, with a real explanation of what it grants.

---

## Data

Generated client, **already regenerated in the working tree** (uncommitted; `npm run api:generate`
is a network step the operator runs). New/changed surface this feature consumes:

- `accessId?: string` is a declared optional **query** parameter on all thirteen token-enabled
  routes. The `as never` cast in `src/lib/api/specialAccess.ts` is therefore obsolete.
- `getSpecialAccessByAccessId` → `SpecialAccessIntrospection` (`scope`, `apartmentId`,
  `reservationId`, `incidentItemId`, `expiresAt`); `403 SPECIAL_ACCESS_INVALID` when unusable.
- `getSpecialAccess` → `SpecialAccessList`, requires `query.reservationId` and a bearer session.
- `SpecialAccess` carries `revokedAt` / `usedAt`, so a listed grant can show its own state.
- An unusable link is `403 SPECIAL_ACCESS_INVALID`, not `500`.

**No backend change is needed.** Every blocker in `docs/backend-blockers.md` is resolved on the
deployed API (probed 2026-11-26).

---

## Invariants this feature must not break

The eight repo invariants, plus:

9. **One computation per rule.** Every enable rule and tooltip reason comes from a helper; no surface
   restates arithmetic. `getReservationActionAvailability` is the precedent.
10. **One clock per page.** `now` is captured once at render and passed down; a helper never calls
    `Date.now()`.
11. **A page holding a link never calls `withAuth()`** — it sends `Bearer undefined` for a caller
    with no account and turns a working anonymous read into a 401.
12. **`PATCH /reservations/{id}` with a token may set only `hasPhotoProof` and `status: "COVERED"`.**
    Any other field is a `400 VALIDATION_ERROR`.

---

## Out of scope

- **Any `covera-hono` change.** The backend is done and deployed.
- **`damage_evidence` links.** The scope is wired to incident evidence on the backend, but the
  frontend continues to offer only `inspection_proof` (D2).
- **Guest submission of incident evidence** on `/incident/:incidentId/proofs`. A guest there reads
  and captures; the claim's own writes stay host-only this slice (D3).
- **A list of grants across apartments.** `GET /special-access` is reservation-scoped.
- **Cleaner per-item field links** (`IncidentFieldLink`) — untouched.
- **The `?openFor=` identifier** named in `routes/public.ts:77`. Superseded by D1's `?accessId=`.

---

## Open questions

None.
