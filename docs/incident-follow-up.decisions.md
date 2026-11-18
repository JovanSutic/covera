# Incident follow-up — decisions

Every choice the executor would otherwise make mid-flight. No row is `OPEN`.

**Status values:** `APPROVED` · `OPEN` (blocks execution) · `REJECTED` (kept for the record)

Feature slug: `incident-follow-up`. Plan directory: `docs/incident-follow-up/`.
Intent source: `docs/incident-follow-up.md` (the operator's issue list).

---

## A. Scope

| ID | Decision | Rationale | Status |
| --- | --- | --- | --- |
| D1 | Executable scope is issues **2, 3, 4, 5, 6, 7, 9, 10**. Issue **8** is disregarded (operator, 2026-11-18). Issues **1** and **11** are blocked on a `covera-hono` contract change and are specified in `blocked.md`, not planned as phases. | Backend inspection on 2026-11-18: there is no "additional photo" evidence type and no per-item photo cap other than `MAX_EVIDENCE_PER_ITEM = 20`; there is no resolution/replacement/lost-business field and no proposal message or per-type document cap. A frontend phase against those would be unverifiable. | APPROVED |
| D2 | Plan lives in `docs/incident-follow-up/`; decisions in this file. The operator's `docs/incident-follow-up.md` is not modified. | The issue list is the intent source, not the spec. | APPROVED |
| D3 | **One commit per phase, made by the operator.** The executor edits and runs the gate and never commits. | The operator's standing instruction ("phases committed manually"), same as feature/46 D39. This repo has no hook and no CI. | APPROVED |
| D4 | The guide page route is `/host/damage-claim-guide`, `requires: ["canOpenHost"]`, `params: {}`, a sibling in `routes/host.ts`, crumb `incidentPage.guide.title`. | Sibling for the same reason as `incidentClaim`: `IndividualApartment.tsx` has no `<Outlet />`, so a nested route renders nothing while passing every check. The crumb key goes in `host.json`, where `incidentPage.title` already lives. | APPROVED |

## B. Photos

| ID | Decision | Rationale | Status |
| --- | --- | --- | --- |
| D5 | Extract the zoom modal from `src/components/shared/ExpendableImage.tsx` into `src/components/shared/ImageZoomOverlay.tsx`; both `ExpandableImage` and the incident thumbnails use it. | Issue 2 asks exactly this. Rejected: rendering thumbnails through `ExpandableImage` — it forces an `aspect-16/9` box, a hover overlay and a fallback card, none of which suit a 64 px square with a delete button. Rejected: a second copy of the modal. | APPROVED |
| D6 | Before photos come from the existing `useReservationPhotos(reservationId)` read, filtered to active `checkin_state` images of shots whose `assets` include the item's asset. | The data exists today (`ShotWithAssets.images[].type`), the query module exists, and the resource is already registered. No new endpoint, no new `QUERY_ACTIONS` entry. | APPROVED |
| D7 | The before-photo strip sits directly above the damage-photo strip inside each item row, uses the same 64 px thumbnail, has **no** delete control, and opens the same zoom overlay. | Issue 3: "same format as the photo of the damage but they can't have the delete button". | APPROVED |
| D8 | The incident route declaration in `src/lib/router/routes/host.ts` gains `{ resource: "reservationPhotos", params: () => null }`. `prefetchCoverage.test.ts` is not edited. | `IncidentPage` will call `useReservationPhotos`, and `findCoverageGaps` compares `hooksUsedBy` against the route chain. A red check means the declaration is wrong, not the assertion. | APPROVED |

## C. Money

| ID | Decision | Rationale | Status |
| --- | --- | --- | --- |
| D9 | Per-asset price is `IncidentItem.estimatedPlaceholderValueCents`, written through `PATCH /incidents/{id}/items/{itemId}`. New wrapper `setIncidentItemValue(incidentId, itemId, cents)` in `src/lib/api/incidentClaims.ts`. | The field and the route exist, and the route is gated by `isClaimEditable`, which is the "until the claim was sent" rule. | APPROVED |
| D10 | The per-asset editor **replaces** the single "Amount to request" input in `ClaimFilingPanel`. The total stays on screen, read-only, as the sum of item values. This UI stops writing `finalPayoutRequestedCents`. | Issue 4 asks for a list mirroring the assets. `claimTotals` keeps honouring an older `finalPayoutRequestedCents` if one arrived; nothing here deletes it. | APPROVED |
| D11 | A value is valid only when it parses and is **> 0**. Empty or `0` is invalid: red border, inline message, save disabled. New pure helper `parsePositiveCentsFromInput(value: string): number \| null` in `claimMoney.ts`. | Issue 4: "Default number is 0, but also that number is invalid". `parseCentsFromInput` accepts 0, so the new rule needs its own named helper rather than an inline `> 0` at three call sites. | APPROVED |
| D12 | Editing is allowed only while `isIncidentEditable(incident)`. After filing the inputs are read-only and the save control is absent. | Mirrors the backend gate; offering an action that cannot succeed is the bug this prevents. | APPROVED |
| D13 | Save is **per item**: one `PATCH` per row, with that row's own pending state. | There is no batch route, and one failing row must not block the others. | APPROVED |

## D. Request text

| ID | Decision | Rationale | Status |
| --- | --- | --- | --- |
| D14 | `buildClaimMessage` gains the stay dates, a lead-in naming the stay, an assets lead-in, a friendly ask to settle, and a note that before/after photos are attached. `header`, `itemLine` and `totalLine` keep their current shape. | Issue 5 lists exactly these parts. | APPROVED |
| D15 | Dates are formatted by a new pure helper `formatStayRange(checkIn, checkOut, locale)` in `claimMessage.ts` using `Intl.DateTimeFormat`; the locale is the active `i18n.language`. | `locale` is a parameter so the helper is testable and the message follows the UI language. | APPROVED |
| D16 | New message keys are `incidentPage.message.intro`, `.assetsIntro` and `.ask`. The existing `.footer` is re-worded to the before/after photo note rather than adding a fifth key. | Fewer keys, and `.footer` already renders in the one place the note belongs. | APPROVED |
| D17 | `ClaimFilingPanel` gains `checkInDatetime` and `checkOutDatetime` props; `IncidentPage` passes them from the reservation. | The panel already receives the guest and apartment names; the dates belong beside them. | APPROVED |

## E. Guidance and gating

| ID | Decision | Rationale | Status |
| --- | --- | --- | --- |
| D18 | The guide is a **static page**: no query hook, no `data:` declaration. Five sections — immediate steps, photos, costs and documents, deadlines, Airbnb Resolution Center. | Issue 9 asks for structured information, not live data. A static page keeps the route off the prefetch-coverage surface. | APPROVED |
| D19 | The guide link appears in `ReservationIncidentSection` in **every** state (error, loading, no claim, has claim), as a secondary text link, and on `IncidentPage` beside the filing panel. | Issue 9: "In the damage claim section on the reservations/:id page, we need to have some link". A host needs it before a claim exists — that is when the immediate-response steps matter. | APPROVED |
| D20 | Claim creation is gated **client-side** on the effective check-out. Before checkout both CTAs are disabled with an explanatory line. No backend change. | The backend enforces the upper bounds (14 days after checkout, before the next check-in) but not "stay is over". `Reservation.checkOutDatetime` and `alternativeCheckOutDatetime` are already loaded on both surfaces. The server-side lower bound is recorded in `blocked.md` as a gap, not fixed here. | APPROVED |
| D21 | The gate is a pure helper `canOpenClaimAt(checkOutDatetime, alternativeCheckOutDatetime, now)` in `claimDeadline.ts`. | Same file and shape as `getClaimDeadlineState`; `now` is a parameter so the boundary is testable. | APPROVED |

## F. Language

| ID | Decision | Rationale | Status |
| --- | --- | --- | --- |
| D22 | New strings are added to `en`, `de`, `tr` and `sr-Latn` in the same phase that renders them, with English values in all four. p7 replaces the English values for incident copy with real translations. | Parity holds at every phase boundary; translation is a content pass, not a per-component task. | APPROVED |
| D23 | Issue 6's root cause is that `incidentPage.*` (and `reservationPage.incident.*`) hold **identical English values** in all four locales. p7 deletes those blocks from `de`, `tr` and `sr-Latn`, then runs `npm run i18n:translate`, which only fills missing keys. | The script skips keys that already exist, so clearing is required; without it the language switch stays a no-op. | APPROVED |
| D24 | Issue 7 is a pure `withLang(path, lang)` in `src/lib/router/lang.ts`, applied in `AccessLink` and at the remaining direct `Link`/`buildPath` sites. `en` is omitted from the URL. | `AccessLink` is the app's only guarded link, so one change covers navigation; the omissions match `Header`'s existing "keep URL clean for the default" rule. | APPROVED |
| D25 | `Header` falls back to the persisted `i18n.language` when no `?lang` is present, instead of hard-coding `en`. | Today a reload without the parameter forcibly resets the UI to English, which is the second half of issue 7. | APPROVED |

## G. Process

| ID | Decision | Rationale | Status |
| --- | --- | --- | --- |
| D26 | Test steps: p1, p2, p3, p4 and p6 each end with one. p5 is route wiring plus static copy and p7 is locale data — both exempt, recorded here. | The kickoff rule: pure logic gets a test step; presentational/wiring may opt out only through a decision row. | APPROVED |
| D27 | No file under `src/api/generated/` is touched; no new `QUERY_ACTIONS` entry; no new `VITE_` variable. | Every call this plan makes already exists in the generated client. | APPROVED |
| D28 | Every new key lands in all four locale files in the same phase. | `localeParity.test.ts` asserts `en ⊆ locale` and will catch a miss. | APPROVED |
| D29 | `npm run gate` is the only acceptance command. `npm run build` is never used. | `build`'s `prebuild` runs `api:generate`, which fetches the network. | APPROVED |
| D30 | This plan contains no `covera-hono` phase. `blocked.md` names the exact contract changes for issues 1 and 11, so they can be planned separately once merged. | Phases must be verifiable; a phase against an endpoint that does not exist is not. | APPROVED |