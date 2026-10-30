# Reservation table extraction — decisions

Every choice the executor would otherwise make mid-flight. Approve the table in one pass, or edit
it in place; do not leave a row in `OPEN`.

**Status values:** `APPROVED` · `OPEN` (blocks execution) · `REJECTED` (kept for the record)

---

## Decisions

| ID | Decision | Rationale | Status |
| --- | --- | --- | --- |
| D1 | **`isRowDisabled` is removed from `ReservationsTable`'s `DataTable` call.** Past-date rows render undimmed and clickable. | The operator: *"let me see the row and let me click on it."* The prop does two things at once — `opacity-50` plus `pointer-events-none` — and the second is what makes a past reservation unreachable. Since `pointer-events-none` also blocks the kebab, the row's disable is redundant once the menu disables itself (D4), and the dimming contradicts "let me see the row". | APPROVED |
| D2 | **The past-date rule is added to `getProofWindowState`, as `isPast` and `isPastEnd`.** | Same reasoning as the existing invariant 9 for the window: one computation, three readers (menu, page header, and anything later). Deriving it in the components would be the second copy of the arithmetic this feature exists to avoid. | APPROVED |
| D2a | **`ProofWindowSubject` gains an optional `checkOutDatetime?: string \| null`.** | Corrected against the tree: the interface carries `alternativeCheckOutDatetime` but **not** the plain `checkOutDatetime`, so `isPastEnd` has nothing to read until it is declared. Optional and nullable so the three existing call sites — which pass `ReservationWithInspection` and `ReservationRow` (both carry it as a required string) — keep compiling untouched, and so a subject with no check-out degrades to "not past" rather than throwing. | APPROVED |
| D3 | **`isPast` (effective check-out, i.e. `alternativeCheckOutDatetime \|\| checkOutDatetime`) drives the action disabling; `isPastEnd` (plain `checkOutDatetime`) is also exposed.** | Precedence mirrors the existing `effectiveCheckInDatetime` rule — the helper's own convention. `isPastEnd` is exposed because the row-level *visual* dimming, if ever re-introduced, wants the plain value; exposing both keeps the arithmetic here rather than inviting a future caller to compute one inline. | APPROVED |
| D4 | **All four kebab items are disabled for a past reservation, including "copy guest message".** | Operator's explicit choice: *"disable all the buttons there."* | APPROVED |
| D5 | **The rule lives in `useReservationActions`, not in `ReservationActionsMenu`.** | The operator chose "both surfaces". The hook is what both the kebab and the page header already share, so one line there covers both and the two can never disagree. Each item then OR-s `isPast` into its own existing rule (D4) — the hook supplies the answer, the surfaces keep their own gates. | APPROVED |
| D6 | **Four new copy keys are added under `reservationActionsCell.tooltip`: `stayPast` (for take-proofs), `hasInspectionPast`, `copyMessagePast`, `cannotDeletePast`.** | The existing `tooltip.cannotDelete` ("Cannot delete reservations that have already started") is delete-specific and must not be reused for the other three — a take-proofs button reading "cannot delete" is worse than no tooltip. Four keys, four honest sentences, each naming the real reason. | APPROVED |
| D7 | **`ReservationsTable` becomes table-only and takes exactly `{ apartmentId, onTakeProofs }`.** `onOpenCreateReservation` is dropped from its props. | The operator: *"only the table with the api calls and other functionalities."* Keeping a create callback it can no longer render a button for would be a prop with no consumer. | APPROVED |
| D8 | **The section chrome moves inline into `IndividualApartment.tsx`, not into a new component.** | Operator's explicit choice. The page already owns `isDrawerOpen` and `activeTab`, so the create button is a one-line handler it already has (`setIsDrawerOpen(true)`); a new section component would need both threaded back as props to do the same thing. | APPROVED |
| D9 | **`isRowDisabled` stays on `DataTable`.** It becomes unused, and it stays. | It is a pre-existing optional prop (added in `c961e44`, unrelated to this feature) on a shared component. Deleting it would put `DataTable` and `component.types.ts` in the diff for no behavioural gain, and `noUnusedLocals` does not fail on an unused *interface member*. The phase names it in one `Noticed, untouched:` line. | APPROVED |
| D10 | **The typography fix is to delete the per-column overrides only; `DataTable`'s header styling is unchanged.** | Operator's choice. `DataTable` applies `column.className` to both the `<th>` and the `<td>` (lines 64 and 115), so a column setting `font-mono text-xs` drags its header into monospace — that is exactly the reported defect. Removing the overrides makes every column uniform *and* leaves the other three tables byte-identical. Restyling `<thead>` would change every table in the app for a problem that is per-column. | APPROVED |
| D11 | **`alternativeCheckOutDatetime` is left untouched, and recorded as a noticed defect.** | `ReservationTimeSection` declares the prop and renders an `<dd>` that is always empty, because `patchReservationsById` is never sent that field — so the reservation's alternative check-out can never be shown or cleared from this UI. A real bug, but a fourth feature; not one of the three changes asked for. Out of scope, named in the spec, reported in the hand-off. | APPROVED |
| D12 | **The empty state stays, and becomes plain text — no button.** | The create affordance now lives with the page's heading (D8), so repeating it inside the table's empty state would put two "new reservation" buttons on one screen. The state itself must survive: it is distinct from loading, and a table extracted for reuse must still distinguish "no rows" from "still fetching". | APPROVED |
| D13 | **All new copy is translated by running `npm run i18n:translate` (network).** | Existing localizations are genuine translations, not English fallbacks, and hand-written German/Turkish/Serbian would break that convention. The script is the repo's own; the four new keys are English-authored and machine-translated like every other key. If it fails for want of network, that is a halt condition, not a licence to leave three locales empty. | APPROVED |
| D14 | **Four phases: (1) the helper + tests, (2) the past-date rule on both surfaces, (3) the table extraction and the typography, (4) the copy + `i18n:translate`.** | Phase 1 is the only phase with pure logic, and it is what phase 2 imports — so it lands first and its test gates it. Three distinct user-visible corrections are bundled here (the past-date rule, the reusable-table split, the font uniformity); keeping each in its own phase keeps each commit one logical change, which is the skill's per-phase default. Phases 2 and 3 touch disjoint files, so their order is free. Phase 4 is copy, which the skill's rules treat as its own concern and which must run last so the run covers every key the code introduced. | APPROVED |
| D15 | **Phases 2, 3 and 4 are exempt from a test step; phase 1 is not.** | The skill's test rule: a phase with pure logic must end with its test, and a purely presentational/wiring phase may be exempted *by a decision row*. Phase 1 extends `getProofWindowState`, whose test file already exists with 9 cases — the two new fields get cases there, and it is the phase that carries every edge case (`isPastEnd`'s precedence, the corrupt-date branch). Phase 2 only OR-s `isPast` into four existing `disabled` expressions and three more on the page header, reading a value phase 1 already tests. Phase 3 moves markup and deletes className strings. Phase 4 adds copy and runs the translation script. For 2–4 the operator's click-through is the check that fits. | APPROVED |
| D16 | **The phases land on the existing `feature/47_single-reservation-page` branch, one commit per phase.** | This is a correction to work that branch has not yet merged, and it lives inside the same feature. A separate branch would produce a second PR against the first. The skill's default granularity — one commit per phase — is kept, and the `docs/` commit is separate from the code commits. | APPROVED |
| D17 | **The copy-guest-message item is restructured into an `isPast ? <disabled button> : (hasInspection && <Popover>…)` ternary, in both surfaces — not guard-widened with a `disabled` attribute.** | Found while checking the Do blocks against the tree: this repo's `PopoverTrigger` is itself a `<div onClick={toggleOpen}>` (`src/components/Popover.tsx:110-113`), so a `disabled` button *inside* one is inert — the click lands on the div and the popover opens anyway. A guard-only fix would have shipped four items that all *look* disabled while the copy item still opened, which is worse than the bug being fixed. The ternary keeps the enabled path byte-identical and renders the past path with the same classes and tooltip as the other three. | APPROVED |
| D18 | **The past-stay buttons carry `disabled:opacity-40 disabled:cursor-not-allowed` via the shared `ITEM_CLASSES` / the header button's className; the kebab trigger itself stays enabled.** | The kebab must still open for a past row — the operator asked to "open the reservation actions menu" and see the buttons disabled (D4, R2), so the trigger is not part of the gate. `ITEM_CLASSES` already carries both disabled utilities, which is why the menu's past-path button needs no new classes and the header's needs the pair added explicitly (its enabled className has neither). | APPROVED |

---

## Checklist — close every one of these before approval

**Shape**
- [x] Route path, and which ecosystem it belongs to — **no route change.** The reservations tab of `/host/apartments/:id` stays where it is; `host` ecosystem. n/a
- [x] Component location — `ReservationsTable` stays at `src/components/host/ReservationsTable.tsx` (a reusable host-scoped piece); the chrome goes inline in `src/pages/host/IndividualApartment.tsx` (D8); the new logic goes in `src/lib/helpers/proofWindow.ts`, which already exists.
- [x] Server state vs local state — **unchanged.** The table keeps `page`/`limit` in `useState` and the read in `useReservations`; the page keeps `activeTab`/`isDrawerOpen`. Nothing moves between them.
- [x] `QUERY_ACTIONS` key — **reused**: `RESERVATIONS_GET_BY_APARTMENT`. No new entry.

**API**
- [x] Which generated request function is called — `getReservationsApartmentByApartmentId`, via the existing `useReservations` hook. Unchanged.
- [x] Does the backend already expose it? — **yes.** No contract change; no phase-1 hard stop.
- [x] Does `npm run api:generate` need re-running? — **no.** `src/api/generated/` is not touched by any phase.
- [x] Auth — `withAuth()`, via the existing hook and the existing mutations. Unchanged.

**Auth and routing**
- [x] Guard that runs — `canOpenHost`, inherited from the `host` section. Unchanged. n/a
- [x] Every role that may reach the screen — **`host` only.** `canOpenHost` returns false for `admin`
      (`src/lib/router/access.test.ts:55-58`). Unchanged.
- [x] Whether it is deliberately public — **it is not.** n/a
- [x] Whether the route is lazy-imported — `routes/host.ts` already lazy-imports `IndividualApartment`; no router file is touched by this feature. n/a

**States** — one row per state the screen can be in
- [x] Loading — the table's existing spinner branch; untouched.
- [x] Empty — **survives, minus the button** (D12). Header, description text, no action.
- [x] Error — the table's existing error banner; untouched.
- [x] Success — the table renders; a past-date row now renders undimmed and clickable (D1).
- [x] Optimistic vs pessimistic — **unchanged.** Delete and create-inspection stay pessimistic with their existing invalidation in `useReservationActions`; this feature changes only their *disabled* state.

**Copy and i18n**
- [x] Namespace — `host`, existing. No new namespace, no new files.
- [x] Key names decided now — yes: `reservationActionsCell.tooltip.{stayPast,hasInspectionPast,copyMessagePast,cannotDeletePast}` (D6). The heading/description/create-button keys already exist (`apartmentReservationsManager.*`) and are reused verbatim.
- [x] Is translated copy ready for `de`, `tr`, `sr-Latn` — no, machine-translated by `npm run i18n:translate` (D13).

**Forms** — n/a. No form is added or changed; the create drawer and its form are untouched.

**Evidence**
- [x] Does this phase have testable logic? — **phase 1 does**: the two new fields on `getProofWindowState`. Tests are required and are phase 1's acceptance.
- [x] If no, the one-line reason it is exempt — **phase 2** OR-s one already-tested field into existing `disabled` expressions with no new branch logic; **phase 3** is markup movement plus className deletion; **phase 4** is copy and a translation run. D15.
- [x] Where tests live — `src/lib/helpers/proofWindow.test.ts`, beside the module, extending the existing suite.

**Process**
- [x] Commit granularity — one per phase, on the existing branch (D16). Docs commit separate.
- [x] Does this need a doc update — this feature's own three files, plus the parent plan's definition of done is unaffected. No update to `single-reservation-page/00-index.md`: that plan is complete and this is a follow-on correction.
- [x] Does anything here change a shared component other features use? — **`DataTable` is deliberately NOT changed** (D9, D10). `getProofWindowState` is extended additively (two new return fields, no signature change, no existing behaviour altered), and it has three existing callers. Both points go in the PR.

---

## Rejected alternatives

| ID | Alternative | Why rejected |
| --- | --- | --- |
| R1 | Keep `isRowDisabled` and instead pass a rule that dims the row but leaves it clickable (drop only `pointer-events-none`). | Still changes `DataTable`, a shared component, to serve one caller — and the dimming still contradicts "let me see the row", which was the operator's actual complaint. |
| R2 | Disable the kebab *trigger* itself for a past row, rather than the items inside it. | The operator asked to disable "all the buttons" *in* the menu, and a dead trigger gives no reason. Opening the menu to four disabled items with tooltips is what explains why. |
| R3 | Reuse `tooltip.cannotDelete` for all four items. | It says "cannot delete". A take-proofs item carrying that text is a new bug, not a shortcut. |
| R4 | Extract the section chrome into a new `ReservationsSection` component so `ReservationsTable` stays a pure table *and* the page stays thin. | Rejected by the operator in favour of inline. Worth recording because the name collision is a trap: a NEW `ReservationsSection` would be a different file from the one deleted in phase 4 of the previous feature, both plausible in a diff. |
| R5 | Derive the past-date flag with a local `isPastDate` helper in each consumer. | That is precisely the duplicated arithmetic this feature exists to prevent, and it is the shape the previous feature had to delete when it lifted `ReservationActionsCell`'s window maths into `getProofWindowState`. |
| R6 | Fix the platform-id header by giving `DataTable` a separate `headerClassName`. | Solves the symptom by widening a shared component's contract, when the cause is a column overriding its own typography at all. The override is what should go (D10). |
| R7 | Change `DataTable`'s `<thead>` to match body text, app-wide. | Offered and declined by the operator: it alters every table in the app (admin users, admin apartments, host apartments) for a defect that is per-column. |

---

## Facts verified while writing this (with the command that verified them)

| Fact | Verified by | Result |
| --- | --- | --- |
| `isRowDisabled`'s only caller is this table | `grep -rn "isRowDisabled" src/` | 4 hits: 3 in `DataTable.tsx` (declaration, destructure, call), 1 in `ReservationsTable.tsx:204`. This table is the sole caller. |
| `isRowDisabled` predates this feature | `git log -S "isRowDisabled" -- src/components/DataTable.tsx` | Added in `c961e44` ("feat(44)"), unrelated to the reservation-page work. |
| `ReservationsTable` has one caller | `grep -rn "ReservationsTable" src/` | One import and one usage, both in `IndividualApartment.tsx` (lines 19, 248). |
| The page already owns the create-drawer state | `IndividualApartment.tsx` | `isDrawerOpen` in `useState`, `Drawer` rendered with `CreateReservationForm`; the create button's handler is one line. |
| `DataTable` applies `column.className` to header and cell | `DataTable.tsx` lines 64, 115 | Both `<th>` and `<td>` append `column.className` — the mechanism of the reported font mismatch. |
| Platform-id column's overrides | `ReservationsTable.tsx` `columns` | `className: "font-mono text-xs text-gray-500 dark:text-gray-400"`. Guest email cell sets `text-xs text-gray-500` inline. |
| `ProofWindowSubject` carries the check-outs this needs | `grep -n "checkOutDatetime" src/lib/helpers/proofWindow.ts` | **`alternativeCheckOutDatetime` only — the plain `checkOutDatetime` is ABSENT.** Caught while writing p1; `ProofWindowSubject` must be widened (D2a). |
| The four kebab items and their current gates | `ReservationActionsMenu.tsx` | take-proofs: `!window.canTakeShots`; create: `hasInspection`; delete: `!isDeletable`; copy: rendered only when `hasInspection`. |
| The page header shares the same hook | `ReservationHeaderActions.tsx` | Calls `useReservationActions` with `apartmentId`, `inspectionId`, `onDeleted`. |
| No key named for a past stay exists | `node -e` over `public/locales/en/host.json` | `reservationActionsCell.tooltip` has **10** keys; the only past-related one is `cannotDelete`, which is delete-specific. Four new keys required. |
| `alternativeCheckOutDatetime` is never sent | `grep -rn "alternativeCheckOutDatetime" src/` | Written only in `ReservationTimeSection.tsx:116`'s read of form values; `patchReservationsById`'s body omits it. Confirms D11's defect. |
| `i18n:translate` is the repo's translation path | `package.json`, `scripts/translate-locales.ts` | `@vitalets/google-translate-api` over `en` → `de`/`tr`/`sr-Latn`; needs network. |
| Gate is green on the baseline | `npm run gate` | exit 0; tsc + eslint + 180 tests in 19 files. |
| `PopoverTrigger` is the click target, not the button inside it | `src/components/Popover.tsx:110-113` | `<div ref={triggerRef} onClick={toggleOpen} …>` — `disabled` on a child `<button>` does not stop the popover opening. Caught while checking p2's Do blocks against the tree; D17. |
| The kebab has four items with four different current gates, and one of them is render-guarded | `src/components/host/ReservationActionsMenu.tsx` | take-proofs `!window.canTakeShots`; create `hasInspection`; delete `!isDeletable`; copy is wrapped in `{hasInspection && …}`, so it is absent rather than disabled when there is no inspection. |
| The header's copy button carries the same `PopoverTrigger` shape | `src/components/host/ReservationHeaderActions.tsx:75-96` | Same structure as the menu's, including the comment about the inner button having no handler. D17 applies to both surfaces. |
