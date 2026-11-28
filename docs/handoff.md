# Special access links — frontend handoff

For the `covera` workstream. `covera-hono` changes are in
[`../special-access-links.md`](../special-access-links.md).

**Status, as of 2026-11-26:** the backend code is committed on
`feature/53_special-access-fixes` and gated green (818 tests, 38 paths) — but it is **not
deployed, and the production database is still missing migration `0015`**. So the "before" column
in §4 is what was observed on the live API, and the "required now" column is the **target, not yet
confirmed**. Re-run §4 yourself after the merge; the probe table is the feature's definition of
done.

---

## 1. Regenerate, then gate — do this first

```bash
cd covera
npm run api:generate     # a network step, operator-run: reads the deployed /openapi.json
npm run gate
```

Nothing in §2 is observable until this has run. The generated client is a build artefact;
hand-editing it is forbidden, and the uncommitted regeneration in the tree is adopted, not edited.

**This only works after the backend is deployed.** `api:generate` reads the live document, so
running it against an undeployed backend produces the old client and the `as never` casts stay.

## 2. What changed, and what each change deletes from the frontend

| Backend change | Frontend consequence |
| --- | --- |
| `accessId` is a declared optional **query** parameter on all thirteen token-enabled routes | `accessQuery = (accessId) => ({ accessId }) as never` in `src/lib/api/specialAccess.ts` can go. The `as never` cast existed only because the generated type said `query?: never`; it now types the parameter for real, and the silent-rename risk it hid goes with it. |
| `components.securitySchemes.specialAccess` is registered | The generated client knows the credential exists. It is declared, **never required** — no operation carries a `security` array, so nothing changes for session callers. |
| `GET /reservations/{id}` and `/photos` document both access 403s | The two reads the guide depends on most now have generated error types for a rejected link. |
| `GET /incidents/{id}`, `GET /assets/apartment/{apartmentId}`, `POST /incidents/{id}/items/{itemId}/upload-tokens`, `POST /incidents/{id}/items/{itemId}/evidence` accept access | `IncidentProofsPage`'s `if (accessId) return <guestUnavailable/>` branch can become a real guest mode. All four reads/writes the page makes are now open to a link. |
| `POST /apartments/{id}/photos/upload-tokens`, `/confirm` and `PATCH /reservations/{id}` accept access | The guide's submit chain stops being host-only. `InspectionGuidePage`'s "the submit belongs to the host" note and its `isGuest` early return can be reworked. |
| `GET /special-access/{accessId}` | A route guard can validate a link **before** render, for a visitor with no session. Use this instead of probing a real read and interpreting its status. |
| `GET /special-access?reservationId=…` | `ReservationLinksSection` can list and revoke links from a previous session, replacing "the link shown when the item was added". |
| An unusable link is `403 SPECIAL_ACCESS_INVALID`, not `500` | The honest "this link is invalid" state is now possible. `InspectionGuidePage`'s comment about rendering the backend's own text "because the server did not say that" is obsolete, and the page's `notFound` copy can become link-specific. |

## 3. Two rules the frontend must keep

1. **Presence of `?accessId=` selects the token path, always.** The backend never falls back to a
   session, even a valid one, and a bad token with a live session is a 403 by design. So a page
   holding a link must never call `withAuth()` — it sends `Bearer undefined` for a caller with no
   account and turns a working anonymous read into a 401 (invariant 8 in `covera`'s own spec).
2. **`PATCH /reservations/{id}` with a token may set only `hasPhotoProof` and `status: "COVERED"`.**
   Any other field — including the check-in/check-out dates the schema otherwise permits — is a
   `400 VALIDATION_ERROR`. The session path is unrestricted. The guide's submit chain sends exactly
   the two allowed fields, so nothing needs to change unless it starts sending more.

## 4. The probe table — this is the feature's definition of done

Run against `https://covera-api.josutic-sutic.workers.dev`. `$ACCESS_ID` is one minted by
`POST /special-access` for a real reservation; `$RES`, `$APARTMENT`, `$INCIDENT` are that link's
targets. `deadbeef` stands in where no real link is needed.

```bash
BASE=https://covera-api.josutic-sutic.workers.dev
RES=<a real reservation id>
HOST_JWT=<a host's bearer token>

ACCESS_ID=$(curl -s -X POST "$BASE/special-access" \
  -H "Authorization: Bearer $HOST_JWT" -H 'Content-Type: application/json' \
  -d '{"scope":"inspection_proof","reservationId":"'"$RES"'"}' \
  | sed -n 's/.*"accessId":"\([^"]*\)".*/\1/p')

curl -s -o /dev/null -w "%{http_code}\n" "$BASE/reservations/$RES?accessId=deadbeef"
curl -s -o /dev/null -w "%{http_code}\n" "$BASE/reservations/$RES?foo=bar"
curl -s -o /dev/null -w "%{http_code}\n" "$BASE/reservations/$RES?accessId=$ACCESS_ID"
curl -s -o /dev/null -w "%{http_code}\n" "$BASE/incidents/$INCIDENT?accessId=$ACCESS_ID"
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  "$BASE/apartments/$APARTMENT/photos/upload-tokens?accessId=$ACCESS_ID" \
  -H 'Content-Type: application/json' -d '{"fileTypes":["image/jpeg"]}'
curl -s -o /dev/null -w "%{http_code}\n" "$BASE/special-access/$ACCESS_ID"
curl -s -o /dev/null -w "%{http_code}\n" "$BASE/special-access?reservationId=$RES" \
  -H "Authorization: Bearer $HOST_JWT"
curl -s -o /dev/null -w "%{http_code}\n" "$BASE/field/ingest/bogustoken"
curl -s "$BASE/openapi.json" | grep -c '"accessId"'
curl -s "$BASE/openapi.json" | grep -c 'securitySchemes'
```

| Probe | Before this feature | Required now |
| --- | --- | --- |
| `GET /reservations/{id}?accessId=deadbeef` | `500` | **`403`** `SPECIAL_ACCESS_INVALID` |
| `GET /reservations/{id}?foo=bar` | `401` | **`401`** unchanged — an unrelated param must not be treated as a credential |
| `GET /reservations/{id}?accessId=$VALID` | `200` | **`200`** unchanged |
| `GET /incidents/{id}?accessId=$VALID` | `401` | **`200`** for a link covering that claim |
| `POST /apartments/{id}/photos/upload-tokens?accessId=$VALID` | `401` | **`200`** |
| `GET /special-access/$VALID` | `404` (no route) | **`200`** with the grant |
| `GET /special-access?reservationId=…` (bearer) | `404` (no route) | **`200`** with the list |
| `GET /field/ingest/bogustoken` | `500` | **`404`** `FIELD_TOKEN_INVALID` — the schema exists |
| `"accessId"` occurrences in `openapi.json` | 6, none a parameter | **20**, several under `parameters` |
| `securitySchemes` in `openapi.json` | absent | **present, containing `specialAccess`** |

The last two rows are already known from the local build (2026-11-26): `"accessId"` occurs **20**
times, **13** operations declare it as a query parameter, `securitySchemes.specialAccess` is
`{"type":"apiKey","in":"query","name":"accessId"}`, and the path count is unchanged at 38.
