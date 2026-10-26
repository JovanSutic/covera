# Asset type change — execution index

Spec: [../asset-type-change.md](../asset-type-change.md) · Decisions: [../asset-type-change.decisions.md](../asset-type-change.decisions.md)

## Phases

| Phase | File | Touches | Outcome | Requires |
| --- | --- | --- | --- | --- |
| 1 | [p1.md](./p1.md) | `src/lib/api/queryKeys.ts`, `src/types/component.types.ts`, `src/types/assets.types.ts`, `src/lib/helpers/assetTypes.ts` (new), `src/lib/helpers/assetTypes.test.ts` (new), `src/components/forms/CreateAssetForm.tsx` | The catalogue is reachable, the create form picks a type instead of typing a name, the helper logic is tested, and the tree compiles again | — |
| 2 | [p2.md](./p2.md) | `public/locales/*/assets.json`, `src/components/host/AssetItemCard.tsx`, `src/components/host/ShotStudioFlow.tsx`, `package.json` | Every host surface reads the type code and shows `ageBracket` / `valueTier`, in all four locales; the gate is strict | 1 |
| 3 | [p3.md](./p3.md) | **`covera-hono`:** `src/db/schema/assets.ts`, `src/modules/inspections/inspections.schema.ts`, `src/modules/inspections/inspectionFlags.schema.ts`, `src/modules/inspections/inspections.service.ts`, `src/modules/inspections/inspections.service.test.ts` (new) · **`covera`:** `src/api/generated/**` (regenerated), `src/components/guest/RoomPhotoItem.tsx`, `src/components/forms/FlagContentForm.tsx` | Both guest payloads carry `asset_type`, and the last two surfaces reading `asset.name` read the type code instead | 2, **plus a deploy of `covera-hono` before the `covera` branch merges** |

## ⚠️ Baseline state — the tree is RED

`npm run gate` fails on the branch as it stands, with exactly one error:

```
src/components/forms/CreateAssetForm.tsx(115,9): error TS2741:
Property 'assetTypeId' is missing in type '{ name: string; category: …; }' but required in type 'CreateAsset'.
```

The already-regenerated client made `assetTypeId` required on `CreateAsset`. The failing line is
inside the file phase 1 rewrites, so phase 1 fixes it rather than a throwaway preliminary commit
(D22).

**Consequence for the protocol:** steps 1.1–1.4 touch files that cannot yet make the tree compile one
at a time, so their Accept is a **narrow check** (a grep) rather than `npm run gate`. `npm run gate`
is the acceptance criterion from **step 1.5 onward**, and the **phase boundary gate is mandatory** —
that is the one that must be green before phase 2 starts and before each commit.

This note is scoped to **phases 1–2 only.** Phase 3 starts from a green `covera` tree and a green
`covera-hono` tree, and every one of its steps accepts on `npm run gate` — in `covera-hono` for
steps 3.1–3.4, in `covera` for 3.5–3.8.

## Dependency rules

- A legal landing order: 1 → 2 → 3.
- Do not start phase 2 before phase 1 — because the form phase 1 writes is the only consumer of the
  create flow, and phase 2's display steps assert on the phase-1 helper types.
- Inside phase 2 the copy lands before the display: steps 2.1–2.2 create `ageBrackets.*` and
  `valueTiers.*`, which steps 2.3–2.4 look up. Reversing them renders raw keys.
- Inside phase 1 the compile fix is step 1.5; the test (1.6) can only run once the module it imports
  exists.
- Phase 3 needs phase 2 only for the D1/D12/D14 conventions its steps follow — it shares no file with
  phases 1–2. Its real prerequisite is the `covera-hono` change it contains: steps 3.6–3.7 cannot
  compile until step 3.5 regenerates the client, and step 3.5 cannot produce anything new until
  steps 3.1–3.3 land. Inside phase 3 the order is therefore strict: backend → regenerate → read.
- Phase 3 spans **two repositories**, so it has two phase-boundary gates and a hard stop between
  them (see the ⚠️ note in `p3.md`). Do not start step 3.5 until the `covera-hono` branch is merged.

## Invariants — check at every phase boundary

1. `src/api/generated/` is not hand-edited; regenerate with `npm run api:generate` instead.
2. No hardcoded user-facing strings — every key exists in `en`, `de`, `tr`, and `sr-Latn`.
3. No secret in a `VITE_` env var; everything so prefixed ships to the browser.
4. Routes live in `src/App.tsx` as lazy imports; authenticated branches sit behind
   `requireRoleGuard("<role>")`. This feature adds no route.
5. Query keys come from `QUERY_ACTIONS`; no string literals at call sites.
6. Network calls go through `withAuth()` / `publicApi()`.
7. Mutations invalidate the keys they changed.
8. Feature-specific: an asset type `code` is rendered raw, never through `t()` (D12); a `null`
   `ageBracket` / `valueTier` renders no badge (D14); `asset.asset_type` is accessed directly with no
   `?? asset.name` fallback (D1). Phase 3 adds a second deliberate raw enum — `FlagContentForm`'s
   category sub-label (D28). It is a known exception to invariant 2, not an oversight: do not "fix" it
   by inventing a key, and do not fail the phase-3 boundary check on it.

## Execution protocol

```
You are executing a pre-written plan, one phase at a time. Do not design, redesign, or improve it.

SOURCES
- docs/asset-type-change/00-index.md — read ONCE at the start (dependencies, invariants, halt conditions).
- docs/asset-type-change/p<N>.md — read ONLY the phase file you are about to execute.
- docs/asset-type-change.decisions.md — read ONCE. If a decision is missing, HALT; do not decide it.

SCOPE
- Execute phases 1–3 in order. Stop at the phase boundary.
- Phase 3 runs `npm run gate` in `covera-hono` for steps 3.1–3.4 and in `covera` for 3.5–3.8. Do not
  start step 3.5 until the `covera-hono` branch is merged and its dev server serves the new document.

PRECONDITION
- `npm run gate` must pass. If not, STOP and report. (Known exception, phases 1–2 only: the `covera`
  tree is RED on entry because of the `CreateAssetForm.tsx` error quoted above, which step 1.5 fixes.
  Do not attempt a separate preliminary fix — see D22. Phase 3 has no such exception: both trees must
  be green before step 3.1, and every phase-3 step accepts on `npm run gate`.)

PER STEP
1. Read the step's Touch / Do / Accept / Verify.
2. Make exactly the change in Do. Files outside Touch are off-limits.
3. Run Verify (`npm run gate` unless the step says otherwise).
4. Walk Accept bullets against real command output, not intent.
5. Report in the fixed format. Then the next step.

FIDELITY
- Do blocks are exact. Reproduce verbatim. If one does not compile or does not match its target
  file, STOP and report the mismatch — do not improvise a substitute.
- Do not rename, reformat, reorder, or "clean up" given code.
- Line numbers in the plan are hints measured on a past date. Locate by symbol.

BATCHING
- Group steps that touch the same file into one read + one write, unless a step's Accept must be
  observed before the next step runs. Say which steps you grouped.

HALT AND ASK — do not guess — when:
- the gate is red and one honest fix attempt does not clear it;
- the plan contradicts the actual code in a way that changes observable behaviour;
- completing a step needs a file outside Touch;
- a decision the plan does not cover changes observable behaviour;
- a step needs a translation key that does not exist in any locale file;
- the generated client does not export the request function a step assumes.
Report: raw output, file and symbol, the options you see, your recommendation.

OUT OF SCOPE
- Anything no step asks for. Collect it in one `Noticed, untouched:` line. Do not fix it.

REPORT — one block per step, nothing longer
Step <N.M> — done | blocked
Touch:   <files>
Verify:  <command> → <result>
Accept:  <bullet> ✓ <evidence>   (one line each)
Noticed: <unrelated issues, untouched>

Do not summarize the plan back, restate code you wrote, or ask whether to continue between steps.
```

### Division of labour

- **Executor:** edits, runs `npm run gate` per step, never commits.
- **Operator:** runs `npm run gate` at each phase boundary and makes one commit per phase. This is a
  convention, not a cost saving — `covera` has no husky hook and no CI, so nothing runs a check
  automatically. The gate is the only thing catching a regression. (`covera-hono` *does* have a husky
  pre-commit hook, so phase 3's steps 3.1–3.4 get a second, automatic check there — but run the gate
  per step anyway, so a failure is attributed to the step that caused it.)
- Clear context at phase boundaries, not mid-phase.
- Tier the model per step: cheap for transcription, strong for decision-heavy steps and review.

## Test plan for this feature

- Phase 1, step 1.6 adds `src/lib/helpers/assetTypes.test.ts` — 4 cases over `toAssetTypeOptions` and
  `resolveAssetIdentity`, the feature's only pure logic.
- Phase 2 is exempt by **D19** — purely presentational and copy.
- Phase 3, step 3.4 adds `covera-hono/src/modules/inspections/inspections.service.test.ts` — 5 cases
  over the `asset_type` mapping. Its frontend steps 3.6–3.7 are exempt by **D29**: a field swap in two
  JSX expressions, no branch and no pure logic.
- This is the repo's first test file, so phase 2, step 2.5 promotes `npm run gate` off
  `--passWithNoTests` and deletes `gate:strict` (D20).

## Known deviation from the skill

`p1.md` is 530 lines, above the skill's "under ~400" target for a phase file. Accepted because that
phase must contain the verbatim final state of a ~300-line form rewrite *and* that phase's test step.
Splitting it further would force one of two worse outcomes: a red gate at a phase boundary, or the
test deferred out of the phase that introduces the logic it covers. `p2.md` is 364 lines.

`p3.md` is the other deviation, and a different one: it is the only phase file whose steps run in
**two repositories**. Accepted because the two halves are one indivisible change — the frontend
steps are a type error until the backend steps land, and the backend steps change nothing observable
until the frontend reads them. Splitting it would produce a phase whose gate is red on entry for a
reason no step in it can fix, which is the failure the skill's "never plan against a red tree" rule
exists to prevent.

## Halt conditions

- Gate red and one honest fix attempt does not clear it
- The plan contradicts the code in a way that changes observable behaviour
- The step needs a file outside its Touch list
- A decision the plan does not cover changes observable behaviour
- A step needs a translation key that exists in no locale file
- The generated client does not export the request function a step assumes
- `npm run i18n:translate` fails (it needs network access to Google Translate) and leaves the new
  keys missing from `de`, `tr`, or `sr-Latn`
- Phase 3: `npm run api:generate` produces no change to `types.gen.ts`, or the guest payloads still
  lack `asset_type` after it — the regeneration read a document that does not carry the change, so
  check which `VITE_API_DOCS_URL` won before touching any frontend file
- Phase 3: nesting `with: { asset: { with: { assetType: true } } }` does not type-check after
  `assetsRelations` is declared — do not fall back to a second query or a cast without a decision row

Report raw output, file and symbol, the options, and a recommendation. Do not proceed past it.

## Definition of done

- [ ] `npm run gate` green on the feature branch (no `--passWithNoTests`)
- [ ] `npm run gate` green in `covera-hono`
- [ ] Every phase with testable logic landed its test; no test work deferred to review
- [ ] Every decision in `*.decisions.md` is `APPROVED` and reflected in the code — including D2, which
      is `REJECTED` and superseded by D23
- [ ] Every new i18n key is present in `en`, `de`, `tr`, and `sr-Latn`
- [ ] No hand-edits under `src/api/generated/`
- [ ] Docs commit is separate from code commits
- [ ] **`covera-hono` is merged and deployed before the `covera` branch merges** (D26) — otherwise
      `/inspection/:id` throws on the first guest who opens a link
- [ ] Operator has clicked through `/host/apartments/:id` → Assets tab → Add New Asset, the Shot
      Studio asset picker, **and `/inspection/:id` → a room → a shot's checklist** (the operator's own
      definition of done)
