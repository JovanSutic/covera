# Blocked — issues 1 and 11

Two items from `../incident-follow-up.md` are **not** in this plan. Neither can be built against the
container-wide contract as it stands on 2026-11-18, and a phase that cannot be verified is worse than no
phase (D1, D30). This file records what has to change in `covera-hono` first, and what the frontend work
becomes once it has.

Source read for every claim below:
`covera-hono/src/modules/incidents/{incidents.service.ts,incidents.route.ts,incidents.schema.ts}` and
`covera/src/api/generated/requests/types.gen.ts`.

## Issue 1 — mandatory + additional photos, max 4 per asset

**What the contract has today**

- `IncidentEvidence.evidenceType` is a closed union of seven photo/document types
  (`damage_photo_wide`, `damage_photo_closeup`, `theft_empty_space_photo`, plus four document types).
- There is no type for a photo that is not one of the required views, so "additional photos" has no
  place to live.
- The only cap is `MAX_EVIDENCE_PER_ITEM = 20` in `incidents.service.ts`, applied to *all* evidence,
  photos and documents together. There is no per-item photo cap, and certainly no cap of four.
- `requiredPhotoTypes(item.type)` returns the two damage views or the one theft view. That part is
  already right and does not change.

**What `covera-hono` must add**

1. `evidenceType` gains **`additional_damage_photo`**, accepted for both `damage` and `theft` items —
   `allowedEvidenceTypes` and the OpenAPI enum in `incidents.schema.ts` both change.
2. A new constant and check in `incidents.service.ts`:

   ```
   MAX_PHOTOS_PER_ITEM = 4
   ```

   enforced on the **active** photo count in the same place `MAX_EVIDENCE_PER_ITEM` is enforced
   today: attach and re-attach refuse with a named error code when the write would exceed four. A
   soft-deleted photo must not count, or a host who deletes a bad shot is locked out of retaking it.
3. `GET /incidents/{id}` returns the new type as-is; no response-shape change is needed, because
   `evidence` is already a list.
4. A migration-free change if `evidence_type` is a text column with an application-level union — confirm
   that before writing the phase; if it is a Postgres enum type, the migration adds the value.

**Frontend follow-up once merged**

- `incidentEvidence.ts`: extend `EvidenceType`, `PHOTO_EVIDENCE_TYPES` and `evidenceLabelKey`
  (one label key per locale).
- `requiredPhotoTypes` stays the source of "what is mandatory"; a new
  `additionalPhotoSlots(item)` returns `MAX_PHOTOS_PER_ITEM - activePhotoCount(item, "photo")` so the
  evidence panel can offer exactly the free slots.
- `IncidentItemEvidence`: one extra capture control, shown only while a slot is free.
- Client-side count is a courtesy; the server's refusal is the rule.

## Issue 11 — repair/replace proposal with documents

**What the contract has today**

- `IncidentItem` carries `estimatedPlaceholderValueCents` and nothing else about money.
- `UpdateIncidentItem` accepts `{ type?, estimatedPlaceholderValueCents? }`.
- There is no resolution (`repair` / `replace`), no replacement value, no lost-business figure, no
  proposal message, and no per-document cap — the four document types are accepted without limit
  beyond `MAX_EVIDENCE_PER_ITEM`.

**What `covera-hono` must add**

1. `incident_items` gains:

   | Column | Type | Meaning |
   | --- | --- | --- |
   | `resolution` | `'repair' \| 'replace' \| null` | which path the host is proposing |
   | `replacement_value_cents` | `integer \| null` | the new-equivalent figure, when `replace` |
   | `lost_business_cents` | `integer \| null` | a cancelled stay, when there was one |
   | `resolution_notes` | `text \| null` | the host's explanation of why this path |

2. `UpdateIncidentItem` and the `PATCH /incidents/{id}/items/{itemId}` handler accept all four, written
   only while `isClaimEditable` — the same gate that already protects the value.
3. `MAX_PROPOSAL_DOCUMENTS = 2` per item, enforced on attach for the four document types together, with
   the same active-row rule as the photo cap.
4. `recalcPlaceholderTotal` / `recomputeItemStatus` decide whether a proposal counts toward readiness.
   The plan makes no assumption here; the follow-up phase reads whatever rule the backend adopts.
5. The generated client must be regenerated for the frontend (`npm run api:generate` — network step,
   operator run). Nothing in this plan calls it.

**Frontend follow-up once merged**

- A proposal block per item inside "What you are asking for": resolution choice, replacement value
  (only when `replace`), lost business, the notes field, and two document slots.
- Needs its own decisions (where the block lives, how it renders once the claim is filed, whether the
  total includes lost business) — do **not** retrofit it into phase 3's editor without a plan.

## Also recorded, not fixed here

Issue 10 is fixed **client-side only** (D20, phase 6). `POST /incidents` still has no lower bound: the
server refuses a claim 14 days after the effective check-out and after the next guest's check-in, but it
accepts one mid-stay. A `POST /incidents` check against `effectiveCheckOut` is the honest fix and belongs
in the same contract change as the two above.