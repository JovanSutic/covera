# Damage claim refinement — spec

**Branch:** `feature/54_damage-claim-refinement`
**Prep doc:** `docs/damage-refinement-prep.md` (the six changes + the access-link feature)

This spec says what is true after the feature lands. It is the only document a reviewer
needs to read.

---

## Intent

A host finishing a damage claim needs three things the app does not give them today: the
claim's photos must move off the claim page onto a page built for handling them, the
messages the host sends must be correct and human, and a host who cannot be on site must
be able to hand a temporary link to a photographer or cleaner who has no account.

Alongside those, two language defects make the app unusable in the non-English locales —
the header cannot switch back to English, and the damage-claim guide page crashes in every
language except English. A missing back button strands a host on that guide page.

---

## Behaviour

### The six prep changes

| # | Route | Component | Guard | Data | States | i18n ns |
| - | ----- | --------- | ----- | ---- | ------ | ------- |
| 1 | any | `Header.tsx` (edit) | — | — | lang select round-trips en ⇄ other; `?lang` and `i18n` never disagree | `general` |
| 2 | `/host/damage-claim-guide` | `DamageClaimGuidePage.tsx` (edit) | `canOpenHost` | none | adds a `BackLink` aligned with the app's other back links | `host` |
| 3 | `/host/apartments/:id/reservations/:reservationId/incident/proofs` | `IncidentProofsPage.tsx` (new) | `canOpenHost` (host) + `?accessId=` (guest stub) | `incident`, `assets`, `incidents`, `reservationPhotos` | loading / notFound / no-claim / per-asset slots / before-photos / empty | `host` |
| 4a | `/host/apartments/:id/reservations/:reservationId` | `ReservationPage.tsx` (edit) | `canOpenHost` | existing | guest message carries a **full** URL from `window.location.origin` | `host` |
| 4b | incident page | `claimMessage.ts` (edit) | — | — | claim message rewritten to an inviting register | `host` |
| 5 | `/host/apartments/:id/reservations/:reservationId` | `ReservationLinksSection.tsx` (new) | `canOpenHost` | — | idle / creating / created (copyable link) / revoking / revoked / error | `host` |
| 6 | `/host/damage-claim-guide` | `DamageClaimGuidePage.tsx` (edit) + 3 locale files | `canOpenHost` | none | renders in all four locales without throwing | `host` |

### Issue 5 — the access link, as actually supported by the backend

**Verified by probing the live API on 2026-11-23.** The transport is a query parameter:
`?accessId=<32-hex>`. A request with `?accessId=x` is handled as an access attempt (500 on
an unknown id); a request with `?foo=bar` is not (401 `AUTH_TOKEN_MISSING`).

| Endpoint | Honours `?accessId=` |
| -------- | -------------------- |
| `GET /apartments/{id}` | yes |
| `GET /apartment-shots/apartment/{apartmentId}` | yes |
| `GET /inspections/reservation/{reservationId}` | yes |
| `GET /reservations/{id}` | yes |
| `GET /reservations/{id}/photos` | yes |
| `POST /inspections` | yes |
| every `/incidents*` endpoint | **no** |
| `POST /apartments/{id}/photos/upload-tokens` | **no** |
| `POST /apartments/{id}/photos/confirm` | **no** |
| `PATCH /reservations/{id}` | **no** |

Consequences, and they are the shape of this feature:

- A guest link opens the **inspectionGuide read surface only** — the reservation, the
  apartment's shots, and the before photos. It cannot submit the proof (the three submit
  endpoints reject access), so the guide's submit control is not offered to a guest.
- `/incident/proofs` **cannot be used by a guest at all** — no incident endpoint accepts an
  access link. The route accepts `?accessId=` so the URL shape is stable and the guest mode
  renders its own "not available yet" state, but the page is host-only in practice.
- Only `scope: "inspection_proof"` is offered. `damage_evidence` is in the API enum but no
  endpoint accepts it, so generating one would mint a link that opens nothing.

**Backend defects found and recorded (not fixed here):**
1. An **unknown/expired** accessId answers `500 INTERNAL_SERVER_ERROR`, not the documented
   `403 SPECIAL_ACCESS_INVALID`. A bad link therefore looks like a server crash.
2. The OpenAPI document does not list the accessId query parameter on any endpoint, and its
   error descriptions omit `GET /reservations/{id}` and `GET /reservations/{id}/photos`,
   which do honour it.

---

## Data

The generated client already carries the contract (uncommitted regeneration in the tree):

- `postSpecialAccess({ body: { scope, reservationId?, incidentItemId?, expiresInHours? } })`
  → `201 CreateSpecialAccessResponse` = `{ access: SpecialAccess }`
- `deleteSpecialAccessByAccessId({ path: { accessId } })` → `200 RevokeSpecialAccessResponse`
- `SpecialAccess`: `{ id, accessId, scope, apartmentId, reservationId, incidentItemId,
  expiresAt, revokedAt, usedAt, createdAt }`
- `AccessScope`: `'inspection_proof' | 'damage_evidence'`
- `PhotoAllowance`: `{ max, required, attached, remaining }` — now a **required** field on
  `IncidentItem`, `IncidentItemWithToken` and `FieldIngest`.

**No contract change is needed.** No new endpoint is required for phases 1–6.

---

## Invariants this feature must not break

1. `src/api/generated/` is generated — never hand-edit. The uncommitted regeneration is
   adopted, not edited.
2. No hardcoded user-facing strings; every key exists in all four locales.
3. Routes live in the route tables; `src/App.tsx` mounts the router only.
4. Query keys come from `QUERY_ACTIONS`; no string literals at call sites.
5. Network calls go through `withAuth()` / `publicApi()`.
6. Mutations invalidate what they changed.
7. Forms validate with a zod schema through `@hookform/resolvers`.
8. **Feature-specific:** the accessId query parameter is the ONLY anonymous credential on
   the guide's read path, and a page that has one must never call `withAuth()` — it would
   send `Bearer undefined` and turn a working read into a 401 (`fieldIncident.ts` precedent).

---

## Out of scope

- Any backend change. The five defects and gaps above are recorded, not fixed.
- Guest **submission** of inspection proofs (blocked on the backend).
- A working guest mode on `/incident/proofs` (blocked on the backend).
- `damage_evidence` scope links (no endpoint accepts them).
- Documents as incident evidence (unchanged from feature/46).
- The `PhotoAllowance` UI — phase 1 adopts the type; surfacing `max`/`remaining` as a
  counter is not asked for by the prep doc.
- Email delivery of any link. The host copies the URL and sends it themselves.

---

## Open questions

None.
