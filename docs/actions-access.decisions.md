# Actions & access — decisions

Every choice the executor would otherwise make mid-flight. Approve the table in one pass, or edit it
in place; do not leave a row in `OPEN`.

**Status values:** `APPROVED` · `OPEN` (blocks execution) · `REJECTED` (kept for the record)

---

## Decisions

### A — access-link integration

| ID | Decision | Rationale | Status |
| --- | --- | --- | --- |
| D1 | The guard is a new `accessParam` field on a route, admitting a visitor when the named query parameter is **present**. It is evaluated in `makeLoader` (admission), `guardPasses` (preload) and `createAppRouter`'s preloader loop. | `ACCESS_RULES` read the session alone and are precomputed into a synchronous results map; a URL parameter is not session state, so it must be evaluated where the URL already exists. Presence only — the API judges validity per request. | APPROVED |
| D2 | Only `inspection_proof` is ever offered by the UI. `damage_evidence` stays unoffered. | The backend now wires the scope to incident evidence, but a guest submitting incident evidence is out of scope this slice (D3); offering it would mint a link whose flow does not exist yet. | APPROVED |
| D3 | Guests **submit** on the guide page (photos), but only **read and capture** on the proofs page — no claim writes for a guest. | The guide's submit chain is the feature's original intent (B5) and is now open. The proofs page's writes are item/evidence writes whose guest semantics the backend has not defined. | APPROVED |
| D4 | The guide page's guest branch keeps its own `isGuest` split; it does **not** become one unified flow. | The host path reads through authed hooks and the guest through access-aware ones; unifying them would mean threading `accessId` through every hook for no gain. | APPROVED |
| D5 | An unusable link renders a **link-specific** refusal (`inspectionGuidePage.invalidLink.*`), replacing the "could not be read" copy. | The backend now answers `403 SPECIAL_ACCESS_INVALID`, so the page can honestly say the link is invalid instead of hedging. | APPROVED |
| D6 | `ReservationLinksSection` lists grants from `GET /special-access?reservationId=…` and revokes any of them, replacing the session-only `useState` link. | B8: a host who reloads loses the link they just minted and cannot revoke it. The list endpoint now exists. | APPROVED |
| D7 | The list is read with `withAuth()` and keyed `SPECIAL_ACCESS_LIST`; the create/revoke mutations invalidate it. | It is a host-authorized read. A new `QUERY_ACTIONS` entry is required — the registry's comment saying no list key can exist is now stale and is corrected in the same step. | APPROVED |
| D8 | The introspection endpoint is used by the **route guard** only — one `GET /special-access/{accessId}` before render — not by the pages. | A guard that checks before render is what B7 was for. The pages still authorize per request through their own reads; a second in-page check would be a second source of truth. | APPROVED |
| D9 | The guard tests parameter **presence**; it does not call the introspection endpoint. | The guard runs in a loader, which must stay synchronous and request-free for the preload path. Validity is the API's answer, delivered per request. The introspection endpoint exists for a *future* dedicated pre-render check and is consumed by D8's wiring only if it can be done without a request in the loader. | APPROVED |
| D10 | `src/lib/api/specialAccess.ts` drops the `as never` cast and gains access-aware writers for the submit chain. | The regenerated client types `accessId` for real (trial-compiled 2026-11-26: `tsc -b` exit 0 without the cast). | APPROVED |
| D11 | The guest submit chain uses `publicApi()`, never `withAuth()`. | Invariant 11: `withAuth()` sends `Bearer undefined` for a caller with no account and turns a working anonymous write into a 401. | APPROVED |
| D12 | The guest submit sends exactly `hasPhotoProof: true` and `status: "COVERED"` on the `PATCH`. | Invariant 12: any other field is a `400 VALIDATION_ERROR` on the token path. | APPROVED |

### B — action gating

| ID | Decision | Rationale | Status |
| --- | --- | --- | --- |
| D13 | One new helper `src/lib/helpers/actionWindows.ts` computes all four rules; every surface reads it. | Invariant 9. The four rules share the same inputs (this stay, its siblings, `now`), so one function with one signature keeps them from drifting. | APPROVED |
| D14 | The sibling reservations come from `useReservations({ apartmentId, limit: SIBLING_LIMIT })`, passed into the helper as a plain array. The helper stays pure — it takes the list, not a hook. **Verified 2026-11-26: neither the reservation route nor the incident route declares `reservations` today** (`grep -n 'resource: "reservations"' src/lib/router/routes/*.ts` → only `host.ts:33`, on `apartments/:id`). So both routes gain the declaration and both pages gain the hook call. | The neighbour rules need the same apartment's other stays, and no surface currently reads them. The helper must stay pure so it is testable without a query client. | APPROVED |
| D26 | `SIBLING_LIMIT = 100` (the API's documented maximum), and the helper documents that a neighbour beyond the 100 most recent stays by check-in is not found. | The list is paginated and the existing `useReservations` hardcodes `order: "desc"`; changing that order would change cache identity shared with the reservations table. 100 is the API's own ceiling and covers years of stays for one apartment. | APPROVED |
| D15 | "Next stay" = the sibling with the smallest effective check-in strictly after this stay's effective check-out. "Previous stay" = the sibling with the largest effective check-out strictly before this stay's effective check-in. | The docs describe neighbours in time, not list order. `alternativeCheckIn/Out` wins when set, matching `proofWindow.ts`'s existing precedence. | APPROVED |
| D16 | The claim-photos button's "claim filed" test is `guestResponseDeadlineAt !== null`. | `confirmAirbnbFiling` sets that field in the same write that files the claim, so its existence IS the fact — the same rule `ReservationIncidentSection` already uses. | APPROVED |
| D17 | Button 2 (guest inspection link) **moves** into `ReservationLinksSection` and is removed from `ReservationActionsBar`. | The doc requires it to be in the Access links section. Leaving it in both places would be two controls for one action. | APPROVED |
| D18 | Button 4 is renamed to "Grant special photo access" with new explanation copy; it stays in `ReservationLinksSection` beside button 2. | The doc asks for the rename and better copy. Two access-link actions in one section is the natural home. | APPROVED |
| D19 | Buttons 2 and 4 both mint `inspection_proof` grants; they differ only in their enable window and copy. | Both produce the same kind of link; the difference the doc describes is *when* each may be issued, not what it grants. | APPROVED |
| D20 | Button 3's 30-day bound uses `checkOutDatetime + 30 days` computed in the helper, **not** `aircoverEscalationDeadlineAt`. | The doc states the rule as "30 days after the checkout". The incident's own deadline is a backend-set field that only exists once a claim does — it cannot gate the button that creates the claim. | APPROVED |
| D21 | Button 3's lower bound is `effective check-out − 1 hour`. | The doc: "enabled only after 1 hour before the checkout". | APPROVED |
| D22 | The existing `canOpenClaimAt` is **kept** and gains the new bounds, rather than being replaced. | It is already the single answer to "may a claim be opened" and is consumed by two surfaces; widening it in place keeps one rule. | APPROVED |
| D23 | Buttons 1 and 3 are disabled with a **tooltip reason**, not hidden. | The repo's established pattern (`ReservationActionsMenu` renders disabled rows, prep §7). Hiding would leave the host wondering where the control went. | APPROVED |
| D24 | The four new rule reasons get i18n keys under the existing `reservationPage.actions.tooltip.*` and `incidentPage.*` subtrees. | Reuses the established key shape; no new namespace. | APPROVED |
| D25 | The reservation page passes `now` and the sibling list into `ReservationIncidentSection`; the section does not read its own clock. | Invariant 10 — the page already captures one `now` for the proof window. | APPROVED |

---

## Checklist

**Shape**
- [x] Route paths — unchanged. No new route, no new param. The guard is a field on two existing routes.
- [x] Route table — `src/lib/router/routes/public.ts` (both guarded routes are top-level there).
- [x] Capability — `canOpenHost` retained on `inspectionGuide`; `accessParam: "accessId"` added. `incidentProofs` keeps `requires: "public"` (D26 below).
- [x] New path param — none. `params.ts` and `paths.ts` are untouched.
- [x] Component location — helpers in `src/lib/helpers/`, no new components except edits to existing ones.
- [x] Server state vs local — sibling reservations in react-query (already prefetched); the minted-link state stays `useState` for the "just created" affordance.
- [x] `QUERY_ACTIONS` — **add** `SPECIAL_ACCESS_LIST`; reuse `SPECIAL_ACCESS_CREATE` for invalidation.

**API**
- [x] Request functions — `getSpecialAccess`, `getSpecialAccessByAccessId`, `postApartmentsByIdPhotosUploadTokens`, `postApartmentsByIdPhotosConfirm`, `patchReservationsById`, `getIncidentsById`, `getAssetsApartmentByApartmentId`.
- [x] Backend exposes them — **yes, deployed** (probed 2026-11-26).
- [x] `npm run api:generate` — **already run**; the regenerated client is in the working tree, uncommitted. Phase 1 adopts it.
- [x] Auth — host reads `withAuth()`; guest reads/writes `publicApi()` (D11).
- [x] Unverifiable phases — **none.** The backend is live, so every acceptance criterion can be a real request or `npm run gate`.

**Auth and routing**
- [x] Capabilities reaching the screens — `canOpenHost` (host), `public` (proofs page), and the new `accessParam` for an anonymous link holder.
- [x] Deliberately public — `incidentProofs` stays `public` (its page owns the decision); documented in the route comment.

**States** — per screen
- [x] Loading — both guest branches already have one; kept.
- [x] Empty — proofs page's "no items" card; the links list's "no links yet" state is **new** (D6).
- [x] Error — guest: `invalidLink` (D5); host: existing branches. Links list: an error row.
- [x] Success — unchanged.
- [x] Optimistic vs pessimistic — all mutations pessimistic; create/revoke invalidate `SPECIAL_ACCESS_LIST`.

**Copy and i18n**
- [x] Namespace — `host` for everything; no new namespace.
- [x] Key names — decided in the phase files, listed per step.
- [x] Translations — `en` written by hand; `de`/`tr`/`sr-Latn` by the same hand-written pass. **`npm run i18n:translate` must NOT be run** — it corrupts array-valued keys (see the memory record).

**Forms** — n/a. No new form.

**Evidence**
- [x] Testable logic — `actionWindows.ts` (pure), the guard's admission function (pure), the access-aware fetchers. All get tests.
- [x] Exempt — the pure-copy and pure-wiring steps, named in their phase file.
- [x] Location — `*.test.ts` beside the module.

**Process**
- [x] Commit granularity — one per phase; docs separate.
- [x] Doc update — `docs/handoff.md` §2's "what each change deletes" is consumed and can be marked done at the end.
- [x] Shared components changed — `ReservationActionsBar`, `ReservationLinksSection`, `ReservationIncidentSection`, `IncidentPage`, both guest pages. Called out in the PR.

---

## Rejected alternatives

| ID | Alternative | Why rejected |
| --- | --- | --- |
| R1 | Give both guarded routes `requires: "public"` (feature/54's D25/D38). | Rejected by the operator on 2026-11-25: a route that is host-only normally and opens only with a param is not the same as a public route. An anonymous visitor with no param must be refused by the router. |
| R2 | Have the guard call `GET /special-access/{accessId}` to validate before admitting. | The loader must stay synchronous and request-free — the preload path runs it on hover. Validity is the API's per-request answer. |
| R3 | Compute the four rules inline in each component. | Invariant 9. The repo has already paid for this mistake once (`ReservationActionsCell` vs the bar). |
| R4 | Add a `reservations` fetch inside the helper's consumers. | The list is already prefetched by the route; a second read is a second cache entry and a second request. |
| R5 | Use `aircoverEscalationDeadlineAt` for button 3's 30-day bound. | It only exists once a claim exists, so it cannot gate the button that creates the claim. |

---

## Facts verified while writing this

| Fact | Verified by | Result |
| --- | --- | --- |
| Backend is deployed with all fixes | `curl $BASE/openapi.json \| grep -c '"accessId"'` | **20** (was 6); `securitySchemes` present with `specialAccess` |
| B3 fixed — bad link is 403 | `curl -o /dev/null -w "%{http_code}" "$BASE/reservations/$RES?accessId=deadbeef"` | **403** (was 500) |
| B3 control — unrelated param | same with `?foo=bar` | **401** (unchanged) |
| B4 fixed — incidents accept access | `curl "$BASE/incidents/$INC?accessId=deadbeef"` | **403** (recognized; was 401) |
| B5 fixed — submit accepts access | `curl -X POST "$BASE/apartments/$APT/photos/upload-tokens?accessId=deadbeef"` | **403** (recognized; was 401) |
| B7 fixed — introspection exists | `curl "$BASE/special-access/deadbeef"` | **403** (was 404) |
| B8 fixed — list exists | `curl "$BASE/special-access?reservationId=$RES"` | **401** without bearer (route exists; was 404) |
| `as never` cast is obsolete | trial-compiled `specialAccess.ts` without it → `npx tsc -b` | **exit 0** |
| Guest submit path compiles | trial-compiled a `publicApi()` + `query:{accessId}` submit → `tsc -b` | **exit 0** |
| **The guard's admission edit is still refused** | attempted the `makeLoader` edit | **DENIED `[Security Weaken]`** — see D1's phase note |
| Generated client exports the new fns | `grep -n "getSpecialAccess" src/api/generated/requests/sdk.gen.ts` | `getSpecialAccess`, `getSpecialAccessByAccessId` present |
| `QUERY_ACTIONS` has no list key | `grep -n "SPECIAL_ACCESS" src/lib/api/queryKeys.ts` | only `SPECIAL_ACCESS_CREATE` |
| Baseline gate is green | `npm run gate` | **51 files / 549 tests**, exit 0 |
| `canOpenPublicOnly` does not exist | `grep -n "canOpenPublicOnly" src/lib/router/access.ts` | no match — the rule set is `public`, `isAnonymous`, `canUseApp`, `canOpenAdmin`, `canOpenHost` |
| `tree.test.ts` couples `appPaths` to the tree | read `src/lib/router/__checks__/tree.test.ts` | `requires` and `params` must match exactly — a guard field is **not** compared, so D1 does not break it |

### Plan defects found while executing phase 1 (2026-11-26)

Both are the same class as the ones recorded in
`plan-accept-may-be-internally-inconsistent`: an `Accept` bullet counting a substring that the
step's own `Do` block makes unavoidable.

| Step | Defect | Resolution |
| --- | --- | --- |
| 1.2 | `grep -c "as never"` → `0` is unsatisfiable: the step tells the executor to write a comment containing the words "as never". | The load-bearing check is that no **code** line carries the cast — `grep -n "as never" … \| grep -v "^\s*[0-9]*:\s*\*"` → no output. Corrected in `p1.md`. |
| 1.3 | `grep -c "publicApi("` → `5` forgot the three pre-existing guest reads. | The real count is 8 raw / 6 code. Corrected in `p1.md`. |

Phase 1's other Accept bullets were exact: `accessId` → 20, `accessQuery` → 4,
`await withAuth(` → 3, `tsc -b` → 0, and the gate landed on the predicted **52 files / 554 tests**.
