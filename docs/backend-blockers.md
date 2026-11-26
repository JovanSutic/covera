# Backend contract blockers — access links

Written **2026-11-25** for `covera-hono`. Every claim below was verified against the live
contract at `https://covera-api.josutic-sutic.workers.dev/openapi.json` (the document
`covera`'s `npm run api:generate` reads) and, where marked **probed**, against the running
API on 2026-11-23.

**How to use this file:** each blocker is self-contained and maps to one backend change,
so a `covera-hono` execution plan can take one `B<n>` per phase. §"Proving the fixes" at
the end is the acceptance gate — every blocker has a probe that must change its answer.

**Why it matters now:** `covera` has shipped the host side of access links
(`POST /special-access`, revoke, the reservation-page links section) and the guest **read**
surface. The remaining frontend work — a guest who can submit proofs, a guest mode on the
claim-proofs page, and a guard that validates a link *before* the page renders — is blocked
on the items below.

---

## Summary

| ID | Kind | Blocker | Frontend work it blocks |
| -- | ---- | ------- | ----------------------- |
| **B1** | Contract doc | `?accessId=` is documented on **no** endpoint; `securitySchemes` is `{}` | Regenerating a client that knows about the credential at all |
| **B2** | Contract doc | `GET /reservations/{id}` and `/photos` honour access but document no access error | Generated error types for the two reads the guide needs most |
| **B3** | Behaviour bug | Unknown/expired `accessId` answers **500**, where the spec promises **403** | Any honest "this link is invalid" screen |
| **B4** | Capability gap | **No** `/incidents*` endpoint accepts access | Guest mode on `/incident/:incidentId/proofs` |
| **B5** | Capability gap | The three submit calls reject access | A guest submitting the proofs they collected |
| **B6** | Capability gap | `damage_evidence` is in the scope enum but opens nothing | Damage-evidence links (the theft/damage photo case) |
| **B7** | Capability gap | No endpoint validates an `accessId` on its own | A route guard that checks a link before rendering |
| **B8** | Capability gap | No list/read endpoint for grants | Showing or revoking a link after the session that made it ends |
| **B9** | Contract gap | `POST /special-access` requires only `scope` | Confidence that a minted link covers the resource it claims |

**Priority, if the list is too long:** B3 and B5 unblock the user-visible feature; B4 and B7
unblock the routing design; B1/B2 are cheap and make the rest legible; B8/B9 are quality.

---

## B1 — `?accessId=` is invisible to code generation

**Today.** `accessId` appears 6 times in the whole OpenAPI document, and never as a
parameter. Every query parameter the spec declares is `search`, `role`, `status`, `page`,
`limit`, `sortBy`, `order`, `history`, `detailed`, `emergencyOnly`, `apartmentId`,
`reservationId` — `accessId` is not among them. `components.securitySchemes` is `{}`: the
document declares no authentication mechanism at all.

**Why it blocks.** Code generation cannot emit a parameter the document does not declare.
On the frontend this forced `query: { accessId } as never` — a type cast at every call site
(`covera/src/lib/api/specialAccess.ts`) that defeats the generated types and would fail
silently if the backend ever renamed the parameter.

**What to change.** Add `accessId` as an optional `query` parameter on every endpoint that
honours it (the six in B2/B3 plus `POST /inspections`), and declare the scheme in
`securitySchemes` — an `apiKey`-in-query scheme named e.g. `specialAccess`, alongside the
existing bearer scheme.

---

## B2 — two honoured reads document no access error

**Today.** Of the reads the inspection guide needs, these document `403
SPECIAL_ACCESS_INVALID` / `SPECIAL_ACCESS_SCOPE_MISMATCH`:

| Endpoint | Documents access error |
| -------- | ---------------------- |
| `GET /apartments/{id}` | yes (403) |
| `GET /apartment-shots/apartment/{apartmentId}` | yes (403) |
| `GET /inspections/reservation/{reservationId}` | yes (403) |
| `POST /inspections` | yes (403) |
| `GET /reservations/{id}` | **no** — 403 lists only `FORBIDDEN_ROLE`, `FORBIDDEN_APARTMENT_ACCESS` |
| `GET /reservations/{id}/photos` | **no** |

Both of the last two **honour `?accessId=` (probed)**. Their 403 description is the only
statement of what a caller may expect, and it omits the access case entirely.

**Why it blocks.** These two are the reads the guide depends on most — the reservation and
its photos. Without the documented error, the generated client has no type for a rejected
link on exactly the calls a guest makes first.

**What to change.** Add `SPECIAL_ACCESS_INVALID` and `SPECIAL_ACCESS_SCOPE_MISMATCH` to the
403 description and error union of both endpoints, matching the wording already used on
`/apartments/{id}`.

---

## B3 — an invalid link answers 500 where the docs promise 403

**Today.** The spec documents, on five endpoints:

> `403 SPECIAL_ACCESS_INVALID: The access link is not valid, has expired, or has been revoked.`

**Probed 2026-11-23: an unknown or expired `accessId` answers `500 INTERNAL_SERVER_ERROR`.**
`?accessId=x` is treated as an access attempt and crashes; `?foo=bar` is not treated as one
and correctly answers `401 AUTH_TOKEN_MISSING`. So the parameter is recognized, and the
failure path is wrong.

**Why it blocks.** The frontend cannot tell a bad link from a server fault, so it cannot
show an honest message. It currently renders the backend's own text rather than claiming the
link is invalid — a workaround for this bug, not a design.

**What to change.** Resolve an unusable `accessId` to the documented `403
SPECIAL_ACCESS_INVALID`, distinct from a genuine server error. This is the highest-value
item on the list: it is a documented behaviour the implementation does not honour.

---

## B4 — no incident endpoint accepts access

**Today.** Every `/incidents*` operation — list, get, patch, delete, items, evidence,
upload-tokens, reissue-token, confirm-airbnb-filing — documents **no** access error, and none
honours `?accessId=` (probed).

**Why it blocks.** The claim-proofs page at `/incident/:incidentId/proofs` currently renders
a "not available yet" refusal for a link-holder, because no read it needs can succeed. The
route shape and the refusal state are already built and shipped; only the backend is absent.

**What to change.** Accept `?accessId=` on the reads the page needs — `GET
/incidents/{id}`, `GET /assets/apartment/{apartmentId}`, `GET /reservations/{id}` (already
done), `GET /reservations/{id}/photos` (already done) — and on the evidence writes, if a
guest is also to attach photos. Scope-check against `reservationId` / `apartmentId` as the
existing reads do, and return `SPECIAL_ACCESS_SCOPE_MISMATCH` when the link does not cover
the claim.

---

## B5 — the submit path rejects access

**Today.** `POST /apartments/{id}/photos/upload-tokens`, `POST /apartments/{id}/photos/confirm`
and `PATCH /reservations/{id}` all reject an access link (probed) and document no access
error.

Note the inconsistency this exposes: **`POST /inspections` does accept access (probed and
documented)** while the photo path does not. If that asymmetry is intentional it should be
documented; if not, that is the bug.

**Why it blocks.** This is the feature's original intent — a photographer or cleaner collects
the pre-state proofs *and submits them*. The frontend guide is deliberately read-only for a
link-holder because offering the submit control would offer a button that cannot succeed.

**What to change.** Accept `?accessId=` on the three calls, scope-checked like the reads. If
guest submission is *not* wanted, say so explicitly in the spec and remove the ambiguity —
the frontend's read-only choice then becomes permanent by design rather than a workaround.

---

## B6 — `damage_evidence` opens nothing

**Today.** `AccessScope` is `'inspection_proof' | 'damage_evidence'`, and
`POST /special-access` accepts either. **No endpoint accepts a `damage_evidence` link**, so a
grant minted with it opens nothing.

**Why it blocks.** The frontend offers only `inspection_proof`, deliberately: offering the
second scope would mint a dead link.

**What to change.** Either wire the scope to the incident-evidence endpoints (it is the natural
fit for the B4 work and probably belongs in the same change), or remove it from the enum and
reject it at create time. Leaving it accepted-but-inert is the one option that guarantees a
minted link that does nothing.

---

## B7 — no way to validate a link on its own

**Today.** There is no `GET /special-access/{accessId}`, and no validate/verify operation
anywhere in the 48 operations. The only operations on the resource are `POST /special-access`
(create) and `DELETE /special-access/{accessId}` (revoke).

**Why it blocks.** The frontend wants a route guard that checks a link **before** the page
renders, so an anonymous visitor with a bad link gets a proper refusal instead of a page that
loads and then fails. Without an introspection endpoint a guard has two options, both worse:
test parameter *presence* only (proves nothing), or fire a real read and interpret its
status — which works, but only because of one specific read, and inherits B3's 500.

**What to change.** A `GET /special-access/{accessId}` returning the grant's scope, target
ids and `expiresAt` for a valid link, and `403 SPECIAL_ACCESS_INVALID` otherwise. This also
partly answers B8.

**Open question for the backend to decide, not the frontend:** should this endpoint be
anonymous (the `accessId` is the credential) or bearer-only (a host inspecting a link)? If
anonymous, it must not leak more than the link already grants.

---

## B8 — a grant cannot be listed or read back

**Today.** No list endpoint and no read endpoint. `SpecialAccess` carries `revokedAt` and
`usedAt`, so the data exists — it is simply not reachable.

**Why it blocks.** A host who reloads the reservation page loses the link they just created
and cannot revoke it. The frontend shows a revoke control only for the link its own session
minted; everything else is invisible. That is a real operational gap for someone issuing
temporary access to several cleaners across several apartments.

**What to change.** `GET /special-access?reservationId=…` (or apartment-scoped) listing
grants with `scope`, `expiresAt`, `revokedAt`, `usedAt`, host-authorized. This lets the frontend
replace "the link shown when the item was added" with an actual list and a working revoke.

---

## B9 — create requires only `scope`

**Today.** `CreateSpecialAccess.required` is `["scope"]`. `reservationId` and
`incidentItemId` are optional, and `SpecialAccess.reservationId` / `incidentItemId` are
`nullable` in the response.

So the document permits `POST /special-access { "scope": "inspection_proof" }` — a link that
covers no reservation. A runtime `400 VALIDATION_ERROR` may well catch it, but the contract
does not express the rule, so a client cannot rely on it and a generated validator cannot
enforce it.

**What to change.** Express the per-scope requirement in the schema — for
`inspection_proof`, `reservationId` is required; for the incident scope, `incidentItemId` —
using a discriminated union, or document plainly that the rule is runtime-only.

---

## Proving the fixes

Run against a deployed backend. `ACCESS_ID` is one you minted; `RES_ID` and `APARTMENT_ID`
are that link's targets.

**Every "today" value below was observed on 2026-11-25**, against the deployed API, with a
well-formed but unknown id (`deadbeef`) where a real link is not needed. They are the
baseline the fix must move.

```bash
BASE=https://covera-api.josutic-sutic.workers.dev

# B3 — the headline fix. Today: 500. Required: 403 SPECIAL_ACCESS_INVALID.
curl -s -o /dev/null -w "unknown accessId -> %{http_code}\n" \
  "$BASE/reservations/$RES_ID?accessId=deadbeef"

# B3 — the control: an unrelated param must stay 401 AUTH_TOKEN_MISSING, not 403.
curl -s -o /dev/null -w "unrelated param -> %{http_code}\n" \
  "$BASE/reservations/$RES_ID?foo=bar"

# B3/B5 — a valid link still reads.
curl -s -o /dev/null -w "valid link read -> %{http_code}\n" \
  "$BASE/reservations/$RES_ID?accessId=$ACCESS_ID"

# B4 — today: 401. Required: 200 for a link scoped to this claim.
curl -s -o /dev/null -w "incident read via access -> %{http_code}\n" \
  "$BASE/incidents/$INCIDENT_ID?accessId=$ACCESS_ID"

# B5 — today: 401. Required: 201 when guest submission is wanted.
curl -s -o /dev/null -w "upload-tokens via access -> %{http_code}\n" \
  -X POST "$BASE/apartments/$APARTMENT_ID/photos/upload-tokens?accessId=$ACCESS_ID" \
  -H 'Content-Type: application/json' -d '{"fileTypes":["image/jpeg"]}'

# B7 — today: 404 (no such route). Required: 200 with the grant, 403 when invalid.
curl -s -o /dev/null -w "introspect -> %{http_code}\n" \
  "$BASE/special-access/$ACCESS_ID"

# B1/B2 — static: the parameter and the error must appear in the document.
curl -s "$BASE/openapi.json" | grep -c '"accessId"'      # today: 6, all schema/path
curl -s "$BASE/openapi.json" | grep -c 'securitySchemes' # present but {}
```

Baseline observed 2026-11-25 (unknown id `deadbeef` standing in for a real link where one was
not needed):

| Probe | Today |
| ----- | ----- |
| `GET /reservations/{id}?accessId=deadbeef` | **500** (must become 403) |
| `GET /reservations/{id}?foo=bar` | 401 ✓ (must stay 401) |
| `GET /incidents/{id}?accessId=deadbeef` | 401 (must become 200) |
| `POST /apartments/{id}/photos/upload-tokens?accessId=deadbeef` | 401 (must become 201) |
| `GET /special-access/deadbeef` | **404** (route does not exist) |
| `accessId` occurrences in `openapi.json` | 6, all schema or path — none a parameter |

**After any backend change, `covera` must re-run `npm run api:generate`** (a network step,
operator-run) and then `npm run gate`. A change that is not regenerated is invisible to the
frontend and will be planned as if it never happened.

---

## Not blockers — do not change these

Recorded so the backend does not over-build. Each is working as the frontend needs:

- **`inspection_proof` links do not permit proof submission today.** Intentional until B5 is
  decided; the frontend's read-only guest guide is the correct response.
- **`POST /inspections` accepting access is not a bug.** It is probed and documented, and it
  is the asymmetry with the photo path (B5) that needs the explanation.
- **Revoking by `accessId` only, with no list (B8), is not itself wrong** — it is the missing
  list that costs the host, not the revoke shape.
- **The three submit endpoints rejecting access is not a security hole.** Access links are
  scoped to reads by design; B5 is a feature request, not a vulnerability report.

---

## Related

- `docs/incident-follow-up/blocked.md` — the same kind of record for a different feature:
  per-item photo caps, the repair/replace proposal fields, and a missing lower bound on
  `POST /incidents`. Two separate backend workstreams; keep them separate.
- `docs/damage-refinement.md` §Behaviour — the frontend spec whose defects 1 and 2 are B3
  and B2 here.
