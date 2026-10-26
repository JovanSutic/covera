# Asset type change — decisions

Every choice the executor would otherwise make mid-flight. Approve the table in one pass, or edit it
in place; do not leave a row in `OPEN`.

**Status values:** `APPROVED` · `OPEN` (blocks execution) · `REJECTED` (kept for the record)

---

## Decisions

| ID | Decision | Rationale | Status |
| --- | --- | --- | --- |
| D1 | On host surfaces the asset's displayed identity is `asset.asset_type.code` and its category is `asset.asset_type.category`. Direct property access — no optional chaining, no `?? asset.name` fallback. | The generated `Asset.asset_type` is a required field, and `assetTypeId` is required too, so every asset has a type. A fallback would hide a contract break instead of failing loudly. | APPROVED |
| D2 | `RoomPhotoItem.tsx` and `FlagContentForm.tsx` keep reading the flat `asset.name` / `asset.category`. They are **not** switched to the type code. | Operator's call at the time. `ShotWithAssets.assets` and `InspectionFlag.assets` are inline object types with no `asset_type`, so TypeScript forbids the access. Because creation now writes `name = assetType.code`, these two surfaces already show the code for every asset created from this change onward; pre-existing assets keep their old free-text name until edited. Follow-up (not this feature): embed `asset_type` in both payloads backend-side, then switch these two files. | REJECTED — superseded by D23 |
| D3 | The form's `name` text input and its `category` select are both replaced by one `assetTypeId` select. Category is no longer a form field at all — it appears only as the option's `subLabel`. | Operator's requirement: pick the type, see the category under it. Two fields would let the host submit a category inconsistent with the type. | APPROVED |
| D4 | On submit: `name = selectedType.code`, `category = selectedType.category`, `assetTypeId = selectedType.id`. | `CreateAsset` still requires `name` and `category`. Deriving both from the chosen type keeps the backend contract untouched and makes the two fields impossible to contradict the type. | APPROVED |
| D5 | The `approximateValue` input is removed and `approximateValueCents` is **omitted** from the POST body entirely (not sent as `null`). | `CreateAsset.approximateValueCents` is optional; omitting it leaves whatever the backend default is rather than forcing a null. The field is out of scope per the spec. | APPROVED |
| D6 | `ageBracket` and `valueTier` are **optional** selects. Empty selection submits `null`. | They are nullable in both `Asset` and `CreateAsset`, and they replace an optional field, so requiring them would block a host who does not know a fixture's age. | APPROVED |
| D7 | `CreateAssetForm` fetches the catalogue itself with its own `useQuery`, keyed `QUERY_ACTIONS.ASSET_TYPES_GET_ALL`. The list is *not* fetched in `IndividualApartment.tsx` and passed down as a prop. | Keeps the drawer self-contained and keeps `IndividualApartment` from growing a third query it does not render. The catalogue is global and cache-shared, so a second consumer later costs nothing. | APPROVED |
| D8 | `SelectOption` in `src/types/component.types.ts` gains `subLabel?: string`. The form does not import `RichOption` from `src/components/formItems/Select.tsx`. | `Select` already renders `subLabel`; the shared `SelectOption` type was simply narrower than the component it feeds. A one-line widening fixes every consumer, including `FlagContentForm`'s already-passed `subLabel`. | APPROVED |
| D9 | Two pure helpers — `toAssetTypeOptions` and `resolveAssetIdentity` — live in a new `src/lib/helpers/assetTypes.ts`. The zod schema stays colocated in the form file. | Matches `src/lib/helpers/shots.ts` for helpers and the existing form convention for schemas. The helpers are the phase's testable logic. | APPROVED |
| D10 | New keys live in the `assets` namespace: top-level `ageBrackets.*` and `valueTiers.*` beside `categories.*`, plus `createAssetForm.fields.assetType.label`, `createAssetForm.fields.ageBracket.label`, `createAssetForm.fields.valueTier.label`, and `createAssetForm.validation.assetTypeRequired`. Deleted from `en`: `createAssetForm.fields.name`, `fields.category`, `fields.approximateValue`, `validation.nameRequired`, `validation.categoryRequired`, `validation.invalidValue`, `assetCard.labels.approxValue`. | Keeps every enum label in one namespace that already holds the other three enum maps. The deleted keys are referenced by nothing after this change. | APPROVED |
| D11 | Dead keys are pruned from `en` only. `de`, `tr`, `sr-Latn` keep their now-unused copies. | `npm run i18n:translate` only ever adds — it has no delete mode. The locale invariant is defined in the `en` → others direction, which pruning from `en` alone preserves. | APPROVED |
| D12 | Asset type codes render raw. `t()` is never applied to a `code`. | Operator: codes will be documented and translated later. Wrapping them now would render raw keys in every locale. | APPROVED |
| D13 | `ageBrackets.<VALUE>` and `valueTiers.<VALUE>` values are translated in all four locales via `npm run i18n:translate`. | Operator: "these values possible enum values should be translated." The repo's own sync script is the mechanism. | APPROVED |
| D14 | `AssetItemCard` drops its `currency` prop and its `formatCentsToDecimal` helper and the whole approximate-value block. `ageBracket` and `valueTier` render as badges in the existing badge row, omitted when `null`. | The single caller (`ApartmentAssetsManager`) never passed `currency`, so removing it breaks no call site. Badges reuse the established row instead of adding a second footer. `valueTier` keeps the emerald tone the value block used. | APPROVED |
| D15 | `AssetItemCard` is a shared component whose prop surface shrinks. | Called out here and in the PR: `currency` is removed. Verified only one caller, and it passes neither. | APPROVED |
| D16 | `assets.types.ts` gains `AGE_BRACKETS` and `VALUE_TIERS`, and **loses** `ASSET_CATEGORIES`. | `ASSET_CATEGORIES`' only importer is the form's dead category select; after the rewrite it is an unused export. `AGE_BRACKETS` / `VALUE_TIERS` mirror the existing `satisfies readonly Asset[...][]` pattern. | APPROVED |
| D17 | Generated request functions are imported from `sdk.gen`, not the 3-line `services.gen` compatibility shim. | Matches `IndividualApartment.tsx`, the closest analogue. `services.gen.ts` only re-exports `sdk.gen`. | APPROVED |
| D18 | The description stays a single-line `Input`. Only its placeholder text changes. | Minimal diff; the operator asked for a placeholder change, not a control change. | APPROVED |
| D19 | Phase 2 (copy and host display) has **no test step**. | It is purely presentational and copy — it maps props to markup and holds no branch beyond a null check. This row is the explicit opt-out the skill requires. | APPROVED |
| D20 | Tests live beside the module: `src/lib/helpers/assetTypes.test.ts`. This is the repo's **first** test file, so `package.json`'s `gate` loses `--passWithNoTests` and `gate:strict` is deleted. | The skill's Stage 6 rule: the permissive flag exists only because the repo has zero tests; the moment one lands, the gate tightens. Otherwise a future run that silently collects no tests would still pass. | APPROVED |
| D21 | One commit per phase. The docs get their own commit. The already-dirty `src/api/generated/**` and the `package.json` gate scripts ride in the phase-1 commit. | Nothing is committed yet on this branch; the regenerated client *is* the new contract and phase 1 is what makes the tree compile against it. | APPROVED |
| D22 | The known-red baseline is fixed by phase 1, not by a separate preliminary commit. | The red is `CreateAssetForm.tsx` failing to send the now-required `assetTypeId` — the exact file this feature rewrites. A throwaway fix would be written twice. | APPROVED |
| D23 | Phase 3 covers the two guest files, and the backend payload change it needs is **inside** the phase. `ShotWithAssets.assets` and `InspectionFlag.assets` stop being inline copies of `SelectAssetSchema` and reference the existing named `AssetSchema`. | Supersedes D2. The two files cannot read `asset.asset_type.code` until the payload carries it, and the guest has no session to fetch the catalogue with (`GET /assets/types` is `authGuard` + `rolesGuard(["admin","host"])`), so there is no frontend-only route. Putting the contract change in the same phase keeps one plan covering the whole change instead of a plan plus a promise. | APPROVED |
| D24 | The catalogue row is loaded by declaring `assetsRelations` in `covera-hono/src/db/schema/assets.ts` and nesting `with: { asset: { with: { assetType: true } } }`; the service renames `assetType` → `asset_type` in one `toAssetWithType` helper. | `assets` had no relations at all, so `db.query` could not nest past `asset: true`. A relation is one declaration and keeps the query count at one, matching how this file already loads every other nested row. | APPROVED |
| D25 | Step 3.5 regenerates the client against a local `covera-hono` dev server (`http://localhost:3000/openapi.json`), not the deployed worker. | Removes a deploy from the middle of the phase — the phase stays executable in one sitting. It does not change the release order; that is D26. | APPROVED |
| D26 | **Deploy ordering:** `covera-hono` is deployed to `covera-api.josutic-sutic.workers.dev` before the `covera` branch merges. | The frontend reads `asset.asset_type.code` with no fallback (D1). Against a backend that does not return `asset_type`, `asset.asset_type` is `undefined` and `/inspection/:id` throws `Cannot read properties of undefined (reading 'code')` — the guest walkthrough stops rendering. This is the failure mode D2 was avoiding, and the reason the ordering is a decision rather than a note. | APPROVED |
| D27 | The flat `assets.name` and `assets.category` columns and their fields in the payloads are **not** removed. Phase 3 changes only which fields the frontend *reads*. | Both columns are `notNull` in `covera-hono/src/db/schema/assets.ts`, and `CreateAsset` still requires them (D4). Removing them is a migration plus a backfill plus a contract change — a separate feature. Phase 3 must not be read as deprecating them. | APPROVED |
| D28 | `FlagContentForm`'s sub-label keeps its current shape — `Category: ELECTRONICS`, raw and untranslated. Only the source field moves to `asset.asset_type.category`. | Operator's call. Smallest diff; the change under review is where the field comes from, not how it is presented. Consequence recorded: this is the one user-facing string the feature leaves outside `t()`, and it is carried as a `Noticed, untouched:` item rather than fixed here. | APPROVED |
| D29 | Phase 3's frontend steps (3.6, 3.7) have **no test step**. | Explicit opt-out, per the skill's test rule. Both steps replace one property access inside one JSX expression; there is no branch, no helper, and no pure logic to assert on, and the skill's own reasoning — a jsdom render of static markup proves little and rots fast — applies exactly. The phase's real logic is the backend mapping, which step 3.4 tests. | APPROVED |
| D30 | On the two guest surfaces, a missing `asset_type` **omits the element** — `RoomPhotoItem` drops the chip, `FlagContentForm` filters the asset out of the picker. Neither substitutes the flat `name`. | Operator's call, made after this plan was approved and during phase 3 execution. The two files as planned had no guard at all, so a worker deployed without `asset_type` crashed the entire `/inspection/:id` walkthrough (`Cannot read properties of undefined (reading 'code')`) instead of degrading one chip. This **narrows R1 rather than reversing it**: R1 rejected `asset.name` as the fallback, and that still holds — the guard never resurrects a stale free-text identity. The types say `asset_type` is required, so the branch is unreachable against a current backend; it is defenceless against a stale one only. Accepted cost, recorded so it is not rediscovered as a bug: the failure is now **silent** (a thin checklist, a short picker) where D26/D1 chose loud. Step 3.8's sweep stays clean either way, because no `name` read returns. | APPROVED |

---

## Checklist

**Shape**
- Route path, ecosystem: `n/a` — no new route. Two existing routes are affected: `/host/apartments/:id` (host) and `/inspection/:id` (public guest).
- Component location: `src/components/forms/CreateAssetForm.tsx` (form), `src/lib/helpers/assetTypes.ts` (helper), existing host components otherwise.
- Server state vs local state: catalogue and asset lists in react-query; `isOpen` / drawer state stay in `useState` exactly as today.
- `QUERY_ACTIONS`: **add** `ASSET_TYPES_GET_ALL = ["assets", "types"]`; reuse `ASSETS_GET_BY_APARTMENT` for invalidation.

**API**
- Request functions, by name: `getAssetsTypes` (new call site), `postAssets` (body changed).
- Backend already exposes both. Not blocked on a contract change. See the spec's Data section.
- `npm run api:generate` is re-run **once**, in phase 3 step 3.5, against a local `covera-hono` dev
  server (D25) — the contract changes there. Phases 1–2 need no run: the tree already contains the
  client regenerated for the `Asset.asset_type` change. The command needs a reachable backend +
  network (`prebuild` proves it), which is why phase 3 starts the server rather than hitting the
  deployed worker.
- Auth: `withAuth()` for both — including `getAssetsTypes`, which is authenticated.

**Auth and routing**
- Guard: `requireRoleGuard("host")` on the `/host` branch (already in `src/App.tsx`). `/inspection/:id` stays deliberately public.
- Roles that reach the form: `host` and `admin` only, via the existing host branch. No guest path.
- Route lazy-importing: unchanged, no new route.

**States**
- Loading: `getAssetsTypes` in flight → the type select renders disabled with no options.
- Empty: catalogue returns zero types → `Select` already renders its own "No matching options found" list box; no new empty state is added.
- Error: `getAssetsTypes` rejects → the query rejects and the select stays empty (`throwOnError: true`, same as the page's other queries). No new error UI in this feature.
- Success: form submits, toast fires, `ASSETS_GET_BY_APARTMENT` invalidated.
- Pessimistic mutation; nothing optimistic. Invalidates `ASSETS_GET_BY_APARTMENT` for `apartmentId` (unchanged behaviour).

**Copy and i18n**
- Namespace: `assets` (existing, all four locales). No new namespace.
- Key names are decided now (D10). No copy is pending.
- `de`, `tr`, `sr-Latn`: filled by `npm run i18n:translate`. Machine output is accepted; a human polish pass is explicitly not part of this feature.

**Forms**
- Schema colocated in `CreateAssetForm.tsx` (existing convention).
- Field error keys: `createAssetForm.validation.assetTypeRequired`, `createAssetForm.validation.roomLocationRequired`.
- Validation duplicating backend rules: `.min(1)` on the type and the `roomLocation` enum mirror the API's required fields. On conflict the backend wins and its message is surfaced through the existing `onError` toast.

**Evidence**
- Testable logic: `toAssetTypeOptions` and `resolveAssetIdentity` → `src/lib/helpers/assetTypes.test.ts` (phase 1, step 1.6).
- Exempt: phase 2, by D19.
- Testable logic: the `asset_type` mapping in `inspectionsService.getById` → `covera-hono/src/modules/inspections/inspections.service.test.ts` (phase 3, step 3.4).
- Exempt: phase 3's frontend steps 3.6–3.7 — a field swap in two JSX expressions, no branch and no pure logic.
- Test location: beside the module, per `vitest.config.ts` + `test-setup.ts` in `covera`, and `assets.service.test.ts`'s hand-rolled mock-db style in `covera-hono`.

**Process**
- Commit granularity: one per phase (D21).
- Doc update: this trio of files, committed separately.
- Shared components changed: **`AssetItemCard` loses its `currency` prop** (D14/D15). Only caller verified. Called out in the PR.
- Phase 3 spans **two repositories**: steps 3.1–3.4 commit in `covera-hono` on a branch off its `main` (recommendation: `feature/44_asset-type-in-guest-payloads`, continuing that repo's numbering from 43), and steps 3.5–3.8 commit on `covera`'s `feature/45_asset-type-change`. Two PRs, and the `covera-hono` one merges and deploys first (D26). `covera-hono` has a husky pre-commit hook that runs its gate; `covera` has no hooks at all.

---

## Rejected alternatives

| ID | Alternative | Why rejected |
| --- | --- | --- |
| R1 | Cast the guest payloads (`asset as unknown as Asset`) or read `asset.asset_type?.code ?? asset.name` in `RoomPhotoItem` / `FlagContentForm`. | The gate would stay green while the guest checklist silently fell back to `name` at runtime if the field is not actually nested. A silent fallback is worse than a documented gap. Still rejected after D23 — the payload now carries the field, so the cast has nothing left to work around. **Narrowed by D30**, which permits an *element-omitting* guard on those same two files; the `?? asset.name` and the cast both stay rejected. |
| R2 | Make `ageBracket` / `valueTier` required, since they "replace" the approximate value. | The field they replace was optional, and both are nullable in the API. Requiring them would block asset creation for fixtures whose age is unknown — the opposite of helping the host classify. |
| R3 | Request a `covera-hono` change first so all four surfaces read `asset_type`. | **Reversed by D23.** Rejected when it was the *first* thing this feature would do, which would have blocked phase 1 and 2 on a backend deploy for no gain — phases 1–2 needed nothing from the guest payloads. Phase 3 is where the change is actually needed, so it is where it now lives. The ordering constraint it created is D26. |
| R4 | Fetch the catalogue in `IndividualApartment.tsx` and pass it into the drawer as a prop. | Adds a query to a page that renders no catalogue UI, for one consumer. Self-contained in the form is cheaper to read and to delete. |
| R5 | Widen the form to a `Textarea` for description now that the placeholder asks for a model. | Not asked for; the operator specified a placeholder change. Recorded so it does not get "helpfully" added during execution. |
| R6 | Keep `ASSET_CATEGORIES` in `assets.types.ts` "for later". | Dead exports accumulate. `AssetType["category"]` and the `categories.*` locale keys already cover the enum, and re-adding a 14-line array is trivial if a filter UI ever needs it. |
| R7 | Fix the red baseline in a separate commit before phase 1. | The failing line is inside the file phase 1 rewrites; the fix would be authored twice. |
| R8 | Resolve `assetTypeId` on the guest side by fetching the catalogue, instead of changing the payload. | The guest reaches `/inspection/:id` with no session, and `GET /assets/types` is `authGuard` + `rolesGuard(["admin","host"])` — it answers 401/403. Making it public to serve this would expose the whole catalogue to anyone with an inspection link, which is a larger change than the one it avoids. |

---

## Facts verified while writing this (with the command that verified them)

| Fact | Verified by | Result |
| --- | --- | --- |
| Baseline gate is **RED** | `npm run gate` | `CreateAssetForm.tsx(115,9): error TS2741: Property 'assetTypeId' is missing … but required in type 'CreateAsset'` — one error only |
| `getAssetsTypes` exists and needs auth | `grep -n "getAssetsTypes" src/api/generated/requests/sdk.gen.ts` | `sdk.gen.ts:124`, `GET /assets/types`, 401/403/500 declared |
| `Asset.asset_type` is required; guest payloads have no `asset_type` | `grep -n "asset_type\|assetTypeId" types.gen.ts` | `Asset.asset_type: AssetType` (required, line 197); `ShotWithAssets.assets` (336-351) and `InspectionFlag.assets` (272-287) inline objects have `name` / `category` only |
| `services.gen.ts` is a compat shim | `cat src/api/generated/requests/services.gen.ts` | 3 lines, re-exports `client.gen` + `sdk.gen` |
| `QUERY_ACTIONS` has no asset-types key | `cat src/lib/api/queryKeys.ts` | 8 entries, none for asset types |
| `Select` already supports `subLabel`; `SelectOption` does not | `read src/components/formItems/Select.tsx`, `src/types/component.types.ts` | `RichOption.subLabel?` rendered in the list box; `SelectOption` is `{ value, label }` only |
| `AssetItemCard` has exactly one caller, passing no `currency` | `grep -rn "AssetItemCard" src --include=*.tsx` | only `ApartmentAssetsManager.tsx:82`, no `currency` prop |
| `ageBrackets` / `valueTiers` exist in no locale | `node -e "…require locales…"` | all four: `hasValueTier: false`, `hasAgeBracket: false` |
| The i18n sync script only adds keys | `read scripts/translate-locales.ts` | `missingKeys` filter; writes `unflattenObject(flatTarget)` |
| Repo has zero test files | `ls src/tests`, `vitest.config.ts`, `npm run gate` | empty dir, `--passWithNoTests` present, vitest exits 0 with no suites |
| `CalendarClock` / `Coins` exist in the installed lucide | `node -e "require('lucide-react')…"` | both `true` |
| Helper `t`-passing pattern compiles | `grep -rn "mapShotsToRoomFlowSteps" src` | `InspectionPage.tsx:105` passes `t` from `useTranslation(["assets","guest"])` to a `TFunction<"assets">` param |
| Routes | `read src/App.tsx` | `/host` branch behind `requireRoleGuard("host")`, child `apartments/:id`; `inspection/:id` public |
| `ASSET_CATEGORIES` has one importer | `grep -rn "ASSET_CATEGORIES" src` | `CreateAssetForm.tsx` only |
| Guest payloads carry `assetTypeId` but **no** `asset_type` | `grep -n "assetTypeId\|asset_type" src/api/generated/requests/types.gen.ts` | `Asset.asset_type: AssetType` (197); `ShotWithAssets.assets` (336–351) and `InspectionFlag.assets` (272–287) have `assetTypeId`, no `asset_type` |
| `covera-hono` builds both guest payloads from `SelectAssetSchema` | `grep -rn "SelectAssetSchema" src` (covera-hono) | `inspections.schema.ts:35`, `inspectionFlags.schema.ts:10`, and `assets.schema.ts:11` where `AssetSchema` already extends it |
| `assets` has no drizzle relations | `grep -rn "relations(" src/db` (covera-hono) | relations for apartments, apartment-images, apartment-shot-assets, inspections, inspection-flags, reservations — **none** for `assets`, so `with` cannot nest past `asset: true` |
| `GET /assets/types` is host/admin only | `read src/modules/assets/assets.contract.ts` (covera-hono) | `middleware: [authGuard, rolesGuard(["admin","host"])] as const` — a guest cannot fetch the catalogue |
| `covera-hono` is clean, so phase 3 starts from a known tree | `git status --short`, `git log --oneline -3` | no output; HEAD `4022610` on `feature/43_assets-name-table` |
| `covera-hono`'s gate is broader than `covera`'s | `cat scripts/gate.mjs` (covera-hono) | typecheck + lint + tests + 5 structural invariant rules + `check-contracts.ts`; `--openapi` optional |
| `api:generate` reads the **deployed** worker | `cat .env` | `VITE_API_DOCS_URL=https://covera-api.josutic-sutic.workers.dev/openapi.json` |
| A local server can serve the same document | `cat server.ts`, `grep -rn "openapi.json" src` (covera-hono) | `serve({ port: 3000 })`; `app.doc("/openapi.json", …)` at `src/index.ts:60` |
| The only remaining flat-identity reads are three lines | `grep -rnE "(^\|[^a-zA-Z_.])asset\.(name\|category)" src` | `RoomPhotoItem.tsx:85`, `FlagContentForm.tsx:179`, `FlagContentForm.tsx:180` — every other asset field access is `id`, `roomLocation`, `description`, `photoProofRequirement`, `ageBracket`, `valueTier` |
