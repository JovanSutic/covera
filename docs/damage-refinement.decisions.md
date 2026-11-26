# Damage claim refinement — decisions

Every choice the executor would otherwise make mid-flight. Statuses are `accepted` unless
noted. Rationale is one line; rejected alternatives appear only where someone would
otherwise re-propose them.

## Phase 1 — baseline repair

| ID | Decision | Rationale |
| -- | -------- | --------- |
| D1 | Adopt the uncommitted `src/api/generated/` regeneration as-is and **commit it before any other work**. | The tree is red because of it; it is generated output and the spec's §Data depends on it. |
| D2 | Repair the 10 failing test files by adding `photoAllowance` to their fixtures, **not** by loosening the generated type. | `IncidentItem.photoAllowance` is required by the contract; weakening it would hide the next backend field too. |
| D3 | Add `photoAllowance: { max: 4, required: 2, attached: 0, remaining: 4 },` **inline** in each failing builder, immediately before `...overrides`. No shared fixture module. | Verified: the repo has no shared test-helper convention — all 10 files are self-contained and every other field is an inline literal. A new `__fixtures__/` directory would introduce a convention the codebase does not have. |
| D4 | The default is `required: 2` because every failing builder defaults to `type: "damage"`. | Matches `PHOTO_EVIDENCE_FOR_TYPE` (damage 2 views, theft 1), so fixture data cannot contradict the helper it feeds. Overrides can change it per test. |

## Phase 2 — language and guide-page fixes (prep 1, 2, 6)

| ID | Decision | Rationale |
| -- | -------- | --------- |
| D5 | Fix issue 1 in `Header.tsx` by changing the language **before** updating the URL, so `en` (which deletes the param) falls back to the new `i18n.language` rather than the stale one. | The bug is ordering, not the missing param: `handleLanguageChange` deletes `?lang` for `en` while `currentLang`'s fallback is still the previous language. |
| D6 | Keep the "clean URL for the default language" rule — `en` still deletes `?lang`. | Changing it would alter every URL the app builds and contradict `withLang`'s documented rule. |
| D7 | Fix issue 6 by repairing the three locale files so `guide.sections.*.points` is a JSON **array**, matching `en`. | `en` has arrays and de/tr/sr-Latn have numeric-keyed objects, so `.map()` throws. This is the only array in any locale (verified), so the fix is contained. |
| D8 | Also add a defensive `guidePoints(value): string[]` helper in `src/lib/helpers/guidePoints.ts`, used by the page. | A repaired file is one `npm run i18n:translate` away from regressing; the helper makes a wrong shape render an empty list instead of crashing the page. |
| D9 | Issue 2: add a `BackLink` to `DamageClaimGuidePage` pointing at `appPaths.hostDashboard`. | The guide is reachable from the dashboard nav and from the incident/reservation pages; the dashboard is the only destination that always exists, matching `ReservationActionsBar`'s "the page it stands on may be gone" rule. |
| D10 | Label the back link with a **new** key `incidentPage.guide.backToDashboard`. | `BackLink` takes an already-translated label and the label differs per screen by design. |

## Phase 3 — message rewrites (prep 4)

| ID | Decision | Rationale |
| -- | -------- | --------- |
| D11 | The guest inspection message uses an **absolute** URL built from `window.location.origin`, not the current relative `buildPath` result. | Prep 4a: the host pastes this into a chat/email, where a relative `/inspection/<id>` is unopenable. |
| D12 | Build it with a new pure helper `absoluteUrl(path, origin)` in `src/lib/helpers/absoluteUrl.ts` rather than reading `window` inside the component. | Pure → testable without jsdom globals; the component passes `window.location.origin` in. |
| D13 | Keep `buildPath` as the path source and prefix it — do not hand-write the URL. | `buildPath` is the only href builder in the app (invariant); hand-writing would bypass `appPaths`. |
| D14 | Rewrite the claim message's `ask`/`footer` sentences into an inviting register; keep the message **untranslated** in its item lines. | Prep 4b asks for a cooperative tone; feature/46's rule that Airbnb support reads English item lines is unchanged. |
| D15 | The rewrite is copy-only in `public/locales/en/host.json` (`incidentPage.message.*`) plus the same keys in the other three locales. | `buildClaimMessage` already takes keys; no signature change is needed. |

## Phase 4 — access links (prep 5)

| ID | Decision | Rationale |
| -- | -------- | --------- |
| D16 | The transport is `query: { accessId } as never` on the generated call, wrapped in a dedicated module. | Trial-compiled: the endpoint types pin `query?: never`, and the `url:` override does **not** compile. Verified the serializer emits `?accessId=`. |
| D17 | New module `src/lib/api/specialAccess.ts` with `createSpecialAccess`, `revokeSpecialAccess`, and access-aware fetchers. Not a `ResourceDefinition` for the writes (writes are not prefetched — `incidentClaims.ts` precedent). | Follows the existing write-module convention. |
| D18 | Only `scope: "inspection_proof"` is offered in the UI. | `damage_evidence` has no endpoint that accepts it (probed); offering it mints a dead link. |
| D19 | Default `expiresInHours` is the backend's own default (12) — the UI sends no value unless the host picks one. | The schema defaults to 12 with a 1–72 range; sending a hardcoded 12 would duplicate the server's rule. |
| D20 | Query keys: `SPECIAL_ACCESS_CREATE: ["specialAccess", "create"]`. No list key — there is no list endpoint. | `QUERY_ACTIONS` is the registry; a key for a non-existent read would be dead weight. |
| D21 | The links section is `ReservationLinksSection.tsx` in `src/components/host/`, mounted on `ReservationPage` below `ReservationActionsBar`. | Prep 5 says "on the /reservations/:id page"; the bar is where that page's general actions live. |
| D22 | The created link is shown in a readonly input with a copy button — reuse `IncidentFieldLink`'s copy pattern, not `CopyMessageSection`. | It is a URL to copy, not a message block; `CopyMessageSection` renders a textarea and takes message/copy label pairs. |
| D23 | Revoking is offered for the link this session created (it holds the `accessId`); a reload forgets it. | No list endpoint exists, so a link created in a previous session cannot be shown or revoked — the same limit D50 records for cleaner tokens. |
| D24 | The new link's i18n keys live under a new `reservationPage.links.*` object. | The page's other copy is `reservationPage.*`. |

## Phase 5 — the proofs page (prep 3)

| ID | Decision | Rationale |
| -- | -------- | --------- |
| D25 | Route is top-level: `appPaths.incidentProofs = { pattern: "/incident/:incidentId/proofs", requires: ["public"], params: { incidentId: "uuid" } }`, placed in `routes/public.ts`'s `appRoutes`. | It must serve a guest link, so it cannot inherit the `host` section's `canOpenHost`; this is the shape `public.ts` already documents for the future capability guard. |
| D26 | The page enforces "host session OR valid accessId" itself and renders a refusal state otherwise. | `ACCESS_RULES` are session-derived and evaluated per rule name at build time; they cannot see a query param. The page is where the URL is readable. |
| D27 | The incident page links to it with `incidentId = claim.id`. | The claim id is what every proofs read and write needs; passing the reservation id would force the list-then-match dance the incident page already does. |
| D28 | Photo slots are per **asset item**, showing that item's before photos, its captured photos, and up to `photoAllowance.max` slots with the required views pre-labelled. | Prep 3: up to 4 photos per asset, with the defined (required) views plus additional ones. |
| D29 | The slot grid reads `photoAllowance` from the item for `max`/`required`/`remaining` and `requiredPhotoTypes(item.type)` for the labels. | Invariant 9: the page renders the vocabulary, it does not re-derive it. |
| D30 | Capture reuses `IncidentItemEvidence`'s existing `renderCapture` seam and `uploadIncidentEvidence` unchanged. | Both already exist and are tested; the new page composes them rather than reimplementing upload. |
| D31 | Guest mode on this page renders an explicit "not available yet" state, not a spinner or an error toast. | No incident endpoint accepts an accessId (probed), so a guest genuinely cannot load it; saying so is honest, and the route shape is already correct for when the backend lands. |

## Phase 6 — incident page rewiring (prep 3, host side)

| ID | Decision | Rationale |
| -- | -------- | --------- |
| D32 | Remove the per-item `IncidentItemEvidence` capture controls from `IncidentPage`; keep the before-photo display. | Prep 3: "the old page stays the same, but the photos are in view mode". |
| D33 | Add one `ActionButton` labelled with a new key `incidentPage.managePhotos` linking to the proofs route. | Prep 3 asks for exactly one "manage claim photos" affordance. |
| D34 | Do **not** delete `IncidentItemEvidence.tsx` or its test. | The proofs page (D30) consumes it; deleting it would break the new page and remove a tested unit. |
| D35 | The button is shown only when a claim exists (`claim !== null`). | Without a claim there is no incident id to pass. |

## Phase 7 — guest read access (prep 5 + feature)

| ID | Decision | Rationale |
| -- | -------- | --------- |
| D36 | Add access-aware fetchers for the three reads the guide needs: `GET /reservations/{id}`, `GET /apartment-shots/apartment/{apartmentId}`, `GET /reservations/{id}/photos` — all access-enabled (probed). | These are the only reads the guest path can actually perform. |
| D37 | These fetchers use `publicApi()`, never `withAuth()`. | Invariant 8: `withAuth()` sends `Bearer undefined` for an anonymous caller and turns a working read into a 401 (`fieldIncident.ts` precedent). |
| D38 | `InspectionGuidePage` flips to `requires: "public"` and branches: host session → existing authed reads and the submit control; accessId → guest reads, **read-only** (no submit control). | The submit path (`photos/upload-tokens`, `photos/confirm`, `PATCH /reservations`) rejects access (probed), so offering it to a guest would offer a control that cannot succeed. |
| D39 | The guest guide shows the reservation, the shots and the before photos, and a new key `inspectionGuidePage.guest.readOnly` explaining that submission is done by the host. | Prep 5's photographer use case is "collect the pre state proofs"; until the backend accepts their submit, telling them what to do with the photos is the honest state. |
| D40 | A guest hitting `/incident/:incidentId/proofs` with a valid-shaped accessId gets D31's state; with no accessId at all, the ordinary 404/refusal. | Two different situations, two different screens — the `fieldIncident` D23 principle. |
| D41 | Add a test opt-out row: **no** test is required for the route-table edits, the `Header` ordering change, or the copy-only locale changes. | Presentational/wiring only. The pure helpers (`guidePoints`, `absoluteUrl`, `absoluteUrl`'s caller) each carry a test step. |

## Cross-cutting

| ID | Decision | Rationale |
| -- | -------- | --------- |
| D42 | Every new user-facing string is added to all four locales in the same phase that renders it. | `localeParity.test.ts` only asserts `en ⊆ other`, so a missing key degrades to a raw key silently; the gate would not catch it. |
| D43 | New locale keys are authored by hand in `en` and copied to de/tr/sr-Latn with real translations in the same commit — `npm run i18n:translate` is **not** run. | The script writes arrays as numeric-keyed objects, which is the issue-6 defect (D7). Running it would re-break the guide page. |
| D44 | `npm run gate` after every step; one commit per phase. | No husky, no CI — the gate is the only check and it is silent when red. |
| D45 | The five backend defects/gaps in the spec's §Behaviour are recorded in the PR description and **not** worked around in code. | Prep's general rule: report, do not silently compensate for a server that disagrees with its own docs. |

## Trial-compile results (facts, not arguments)

The skill requires an uncertain decision to be **trial-compiled** rather than argued. Both
were, in the tree, and then reverted. These are measurements, not predictions.

| Trial | What was run | Result |
| ----- | ------------ | ------ |
| T1 | `query: { accessId } as never` on `getReservationsById` / `getApartmentShotsApartmentByApartmentId` / `getReservationsByIdPhotos`, spread over `publicApi()` (D16, D36) | **Compiles.** Zero new `tsc -b` errors. |
| T2 | `url: "/reservations/{id}?accessId=…"` on the same call | **Fails**: `TS2353` — `'url' does not exist in type 'Options<…>'`. This is why D16 uses the cast. |
| T3 | Serializer behaviour | `createQuerySerializer` iterates any object it is handed and emits `?accessId=…`; it does not consult the declared type. The cast is therefore both compile-safe and runtime-correct. |
| T4 | Both new route declarations (`appPaths.incidentProofs` + the `incident/:incidentId/proofs` node; `inspectionGuide` flipped to `public`) against the real tree | **All pass**: `tree.test.ts` 5/5 (the exact `requires`-match assertions), `prefetchCoverage.test.ts` 8/8, `router.behaviour.test.ts` 11/11, `routes.test.ts` 7/7, `bundleBudget.test.ts` 2/2. Zero new type errors. |

T4 also settled a concern raised while writing p7: flipping `inspectionGuide` to `public` does
**not** break `prefetchCoverage.test.ts`, so its `data` declarations stay as they are (p7's
step 7.3 note is therefore a noticed inefficiency, not a coverage failure).

## Rejected alternatives

- **`url: "/reservations/{id}?accessId=…"` on the generated call** — rejected: trial-compiled, `TS2353` (`url` is not assignable in `Options`).
- **A new `ACCESS_RULES` entry for the access link** — rejected: rules are evaluated per rule name from session state and cannot read the URL; the check belongs in the page (D26).
- **`damage_evidence` scope in the UI** — rejected: no endpoint accepts it (probed); it would mint a link that opens nothing.
- **Deleting `IncidentItemEvidence`** — rejected: the proofs page reuses it (D34).
- **`npm run i18n:translate` to fill the new keys** — rejected: it is the cause of the issue-6 defect (D43).
