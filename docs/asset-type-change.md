# Asset type change

Status: APPROVED

## Intent

Asset identity moves out of a free-text name and into the seeded `AssetType` catalogue. A host no
longer types a name and picks a category: they pick an asset type, whose `code` becomes the asset's
name and whose `category` is shown beneath it inside the same picker. Everywhere an asset is
*displayed*, the type code (`asset.asset_type.code`) is what the user reads, and the category is
derived from that same object rather than read off a separately stored field.

Classification also changes shape. A hand-guessed approximate monetary value is replaced by two
coarse enums — `ageBracket` and `valueTier` — picked from translated lists. The asset type *codes*
are deliberately untranslated for now; they will be documented and translated later.

## Behaviour

| # | Route | Component | Guard | Data (query key) | States | i18n ns |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `/host/apartments/:id` → Assets tab | `src/components/host/ApartmentAssetsManager.tsx` → `AssetItemCard` | `requireRoleGuard("host")` | `QUERY_ACTIONS.ASSETS_GET_BY_APARTMENT`, `["APARTMENT_SHOTS_GET_BY_APARTMENT", id]` | loading / empty / success unchanged. Card title becomes the type code; category is derived from `asset_type`; `ageBracket` and `valueTier` render as badges; the approximate-value block is gone | `assets` |
| 2 | `/host/apartments/:id` → "Add New Asset" drawer | `src/components/forms/CreateAssetForm.tsx` | `requireRoleGuard("host")` | `QUERY_ACTIONS.ASSET_TYPES_GET_ALL` (**new**) | type-select loading / type-select empty / validation error / submit error / success | `assets` |
| 3 | `/host/apartments/:id` → Shot Studio modal | `src/components/host/ShotStudioFlow.tsx` | `requireRoleGuard("host")` | `["APARTMENT_SHOTS_GET_BY_APARTMENT", id]` (unchanged) | unchanged. Asset tiles read the type code and the derived category | `assets` |
| 4 | `/inspection/:id` | `src/components/guest/RoomPhotoItem.tsx`, `src/components/forms/FlagContentForm.tsx` | public | `QUERY_ACTIONS.INSPECTION_GET_BY_ID` (unchanged) | unchanged. The shot checklist chip and the flag form's item picker read the type code; the picker's sub-label reads the category off the same object | `guest` |

Row 4 needs the payload to change with it: `ShotWithAssets.assets` and `InspectionFlag.assets` carry
`assetTypeId` but not `asset_type`, so both files read the flat `asset.name` until `covera-hono`
serves the type on those two fields. That contract change is part of this feature, in phase 3 (D23);
D2 recorded the decision to leave it out and is now `REJECTED`. The frontend never falls back to the
flat `name` (D1, narrowed by D30), so `covera-hono` must still be deployed before this branch merges
(D26) — the D30 guard only stops the crash, it does not restore the identity.

## Data

Generated surface this depends on. Phases 1–2 need no regeneration — all of it already exists in the
working tree:

- `getAssetsTypes` — `src/api/generated/requests/sdk.gen.ts`, `GET /assets/types`, ordered A-Z by
  `code`, requires an authenticated non-guest caller.
- `postAssets` — `src/api/generated/requests/sdk.gen.ts`, `POST /assets`.
- `AssetType = { id, code, category, createdAt, updatedAt }` and `AssetTypesList` —
  `types.gen.ts`. `Asset.asset_type` is a **required** `AssetType`; `Asset` additionally keeps the
  flat `name` / `category` / `approximateValueCents` fields, and gains `assetTypeId`, `ageBracket`,
  `valueTier`.
- `CreateAsset` — requires `apartmentId`, `name`, `category`, `roomLocation`, `assetTypeId`;
  `description`, `photoProofRequirement`, `approximateValueCents`, `ageBracket`, `valueTier` are
  optional.
- New entry: `QUERY_ACTIONS.ASSET_TYPES_GET_ALL = ["assets", "types"]`.

**Phase 3 adds one contract change and needs a second regeneration.** In `covera-hono`,
`ShotWithAssets.assets` and `InspectionFlag.assets` change from inline copies of `SelectAssetSchema`
to the named `AssetSchema`, so both gain `asset_type: AssetType` (D23). Until `npm run api:generate`
runs again, the client keeps the old inline shape and `asset.asset_type.code` is a type error on the
guest surfaces — the generated client is what turns the payload into a compile-time fact. The two
payloads currently carry `assetTypeId` but no `asset_type`.

`CreateAsset` still demands `name` and `category`, and both are derivable client-side from the
selected `AssetType` (D4). Those two flat columns and their fields are **not** removed by this
feature (D27) — the payloads keep them; only the frontend reads move.

## Invariants this must not break

See the Invariants section of `.claude/skills/feature-kickoff/SKILL.md`. Feature-specific ones:

- `src/api/generated/` is not hand-edited — the new contract arrives by regenerating. The
  already-regenerated files ride along in the phase-1 commit; phase 3 regenerates a second time
  (step 3.5) and those files ride in the phase-3 commit.
- Every new i18n key (`ageBrackets.*`, `valueTiers.*`, the reworked `createAssetForm.*`) exists in
  `en`, `de`, `tr`, and `sr-Latn`.
- Query keys come from `QUERY_ACTIONS` — including the new `ASSET_TYPES_GET_ALL`, not a literal.
- Network calls go through `withAuth()`; `GET /assets/types` is authenticated, not public.
- Mutations invalidate the keys they changed — creating an asset invalidates
  `ASSETS_GET_BY_APARTMENT` for its apartment.
- **Feature-specific:** an asset type `code` is rendered raw and is never passed through `t()`
  (D12); a `null` `ageBracket` / `valueTier` renders no badge rather than an empty one (D14);
  `asset.asset_type` is accessed directly with no `?.` and no `?? asset.name` fallback (D1) — which
  is why `covera-hono` must ship first (D26). The one exception is D30: the two guest surfaces omit
  their element when the field is absent rather than substituting `name`, so a stale worker degrades
  the guest view instead of crashing it.
- Phase 3 adds no i18n key, so there is nothing to propagate to `de`, `tr`, or `sr-Latn`. Its one
  untranslated user-facing string is `FlagContentForm`'s raw category sub-label, left as-is on
  purpose (D28).

## Out of scope

- **Removing** the flat `assets.name` / `assets.category` columns, or the `name` / `category` fields
  on the payloads. Phase 3 adds `asset_type` beside them and stops reading them in two files; it does
  not deprecate them (D27). Dropping them is a migration plus a backfill plus a `CreateAsset` contract
  change — a separate feature.
- Translating or documenting asset type `code` values. Codes render raw (D12).
- Translating `FlagContentForm`'s category sub-label. It renders the raw enum (D28).
- Any editing flow for existing assets. Only creation and display change; there is no update form.
- The approximate monetary value is not migrated, backfilled, or displayed anywhere. It simply
  stops being collected.
- Guest-side classification badges. `RoomPhotoItem` gains no `ageBracket` / `valueTier` display.

## Open questions

Empty.
