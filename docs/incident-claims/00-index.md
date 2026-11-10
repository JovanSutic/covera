# Incident claims — execution index

Spec: [../incident-claims.md](../incident-claims.md) · Decisions: [../incident-claims.decisions.md](../incident-claims.decisions.md) · Prep: [../incident-page-prep.md](../incident-page-prep.md) · Blueprint: [../incident_management_frontend_blueprint.md](../incident_management_frontend_blueprint.md)

Baseline verified green on **2026-11-08** at `e2fc012` on branch `feature/46_incident-page`:
`npm run gate` → exit 0, `Test Files 31 passed (31)`, `Tests 324 passed (324)`.
`npx vite build` + `npm run perf:bundle` → `index-CvNgUDKZ.js` 90.4 KiB gzip of a 92.0 KiB budget.

**Before phase 1, the operator makes two commits (D37, D38):** the regenerated
`src/api/generated/requests/*.gen.ts` (4 modified files), and the three docs files
(`incident-claims.md`, `incident-claims.decisions.md`, `incident-claims/`). Until the first of those
lands, `git status --porcelain src/api/generated/` is non-empty and invariant 1 cannot be checked.

## Phases

| Phase | File | Touches | Outcome | Requires |
| --- | --- | --- | --- | --- |
| 1 | [p1.md](./p1.md) | `src/lib/helpers/claimStatus.ts` (new), `claimDeadline.ts` (new), `incidentEvidence.ts` (new) + three `*.test.ts` (new) | The one answer to "what state is this claim in, what may I do next, and how long have I got" | — |
| 2 | [p2.md](./p2.md) | `src/lib/helpers/claimMoney.ts` (new), `claimMessage.ts` (new) + two `*.test.ts` (new) | Money formatted once, and the resolution-centre text block built from the claim | 1 |
| 3 | [p3.md](./p3.md) | `src/lib/api/queryKeys.ts`, `src/lib/api/queries/{incidents,incident,fieldIngest}.ts` (new), `queries/registry.ts`, `queries/manifest.ts`, `queries/incidents.test.ts` (new) | Three prefetchable reads registered, named, and gated by `manifest.ts` | — |
| 4 | [p4.md](./p4.md) | `src/lib/router/params.ts`, `src/lib/router/paths.ts`, `src/lib/router/routes/host.ts`, `src/lib/router/routes/public.ts`, `src/pages/host/IncidentPage.tsx` (new), `src/pages/FieldIncidentPage.tsx` (new), `src/lib/api/queries/host.test.ts` | Both routes exist, guarded and typed; the field token is a validated path segment | 3 |
| 5 | [p5.md](./p5.md) | `src/components/host/incident/ReservationIncidentSection.tsx` (new) + test (new), `src/pages/host/ReservationPage.tsx`, `src/pages/host/ReservationPage.test.tsx`, `public/locales/*/host.json` | The reservation page reports the claim and links to it | 2, 4 |
| 6 | [p6.md](./p6.md) | `src/lib/api/incidentClaims.ts` (new), `src/components/shared/StatusChip.tsx` (new), `src/components/host/incident/{AddIncidentItemForm,IncidentItemList}.tsx` (new) + tests (new), `src/pages/host/IncidentPage.tsx`, `public/locales/*/host.json` | A host can open a claim and list the damaged or stolen assets on it | 5 |
| 7 | [p7.md](./p7.md) | `src/lib/api/incidentClaims.ts`, `src/components/host/incident/{IncidentItemEvidence,IncidentFieldLink}.tsx` (new) + tests (new), `src/pages/host/IncidentPage.tsx`, `public/locales/*/host.json` | Evidence can be attached, and a cleaner can be handed a link that needs no account | 6 |
| 8 | [p8.md](./p8.md) | `src/hooks/useClaimClock.ts` (new), `src/components/host/incident/ClaimFilingPanel.tsx` (new) + test (new), `src/lib/api/incidentClaims.ts`, `src/pages/host/IncidentPage.tsx`, `public/locales/*/host.json` | The figures, the copy-ready text, the deep link, and the filing confirmation with its 24-hour clock | 7 |
| 9 | [p9.md](./p9.md) | `src/lib/api/fieldIncident.ts` (new), `src/components/field/*` (new), `src/pages/FieldIncidentPage.tsx`, `public/locales/*/guest.json` | A cleaner opens the link, is framed against the baseline photo, shoots each required view, and gets a safe-to-exit confirmation | 4, 7 |

## Dependency rules

A legal landing order: **1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9**, and **3 may land before 1 or 2**.

- **2 needs 1** — `buildClaimMessage` takes `ClaimLabel`-shaped items produced with `claimStatus`'s
  and `incidentEvidence`'s vocabularies; writing it first would mean inventing a second one.
- **4 needs 3** — the two new routes declare `data: [{ resource: "incidents" … }]`, and
  `resolveResource` throws at import for a resource name that is not in `QUERY_RESOURCES`. A route
  declaring a resource phase 3 has not registered is a red gate, not a subtle bug.
- **5 needs 4** — the section links to `appPaths.incidentClaim`, which phase 4 creates.
- **5 needs 2** — the section renders the provisional total through `formatCents`.
- **6 needs 5** — `IncidentPage` renders the section's status vocabulary and reuses the reservation
  route's already-declared reads; and phase 5 is what proves the status helper renders correctly
  before it is used on a second surface.
- **7 needs 6** — evidence and field links are per item, and an item can only exist once phase 6 can
  create one.
- **8 needs 7** — the filing panel reports the evidence and link state of every item; it is the last
  piece of the page for exactly that reason.
- **9 needs 4** — the field route and its `hex32` param type are phase 4's.
- **9 needs 7** — the field portal's submit path and the host's item token lifecycle are the same
  state machine seen from two sides. Building the portal first would mean guessing at the token
  states phase 7 pins.
- **1 and 3 are independent** — pure helpers and the query registry share no symbol. **3 can land
  first** if that suits; nothing in it imports a helper.
- **Phases do not parallelise.** Every phase ends with the same command on the same tree, and phases
  5–9 all edit `public/locales/*/host.json` or `guest.json`. Two executors on this tree produce a
  gate result neither can attribute.

## Invariants — check at every phase boundary

The eight repo invariants are in the spec's §"Invariants" section. Restated as checks:

1. `git status --porcelain src/api/generated/` → **empty**. Never hand-edit it; regenerate with
   `npm run api:generate` instead. (After the operator's pre-phase-1 commit it stays empty for the
   whole feature — no phase here touches it.)
2. Every new key exists in **all four** of `public/locales/{en,de,tr,sr-Latn}/<ns>.json`. **Do not
   trust `npm run gate` for this.** `localeParity.test.ts` flattens recursively and asserts
   `en ⊆ <locale>`, so a key written only into `en` *is* caught — but extra keys and differing
   *values* are not, and the strings are English in all four files by D29. Dump the files with the
   `node -e` one-liner each phase file gives you.
3. No new `VITE_`-prefixed variable. This feature adds none (D42).
4. Routes live in `src/lib/router/routes/*.ts`; `src/App.tsx` mounts the router only. **Only phase 4
   touches a route**, and it touches no file in `src/App.tsx`.
5. Query keys come from `QUERY_ACTIONS`; no string literals at `useQuery` / `invalidateQueries` call
   sites. **Phase 3 is the phase that adds them**; phases 5–9 must not add one.
6. Network calls go through `withAuth()` / `publicApi()`. **Every call in phases 3 and 9 is
   anonymous by design** (D12) — the same deliberate exception `queries/inspection.ts` carries.
7. Mutations invalidate the keys they changed. Named per mutation in phases 6–9.
8. Forms validate with a zod schema through `@hookform/resolvers`. **Phase 6's add-item form is the
   only form**, and it has one.
9. **Feature-specific.** No component compares a status string. `claimStatus.ts` (phase 1) decides
   what a status means, what may be done next, and whether a link is reusable; every component
   renders what it returned. A `=== "draft"` in a component is drift.
10. **Feature-specific.** Nothing in the field portal calls `withAuth()`, in the module or the page.
11. **Feature-specific.** The three `__checks__` assertion files are not edited to make a phase pass
    (D35). If `prefetchCoverage.test.ts` or `tree.test.ts` goes red, the route declaration is wrong,
    not the assertion.
12. **Feature-specific.** `docs/incident-claims.decisions.md` is the only place a new choice may be
    made. If a step needs a decision that is not in it, **HALT** — do not decide it.

## Execution protocol

```
You are executing a pre-written plan, one phase at a time. Do not design, redesign, or improve it.

SOURCES
- docs/incident-claims/00-index.md — read ONCE at the start (dependencies, invariants, halt conditions).
- docs/incident-claims/p<N>.md — read ONLY the phase file you are about to execute.
- docs/incident-claims.decisions.md — read ONCE. If a decision is missing, HALT; do not decide it.

SCOPE
- Execute phases 1–9 in order. Stop at the phase boundary.

PRECONDITION
- `npm run gate` must pass. If not, STOP and report.

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

- **Executor:** edits, runs `npm run gate` per step, **never commits** (D39 — the operator's
  instruction: "All the code additions from the steps should be commited by me, manually").
- **Operator:** runs `npm run gate` at each phase boundary and makes **one commit per phase**. This
  is a convention, not a cost saving — this repo has no husky hook and no CI, so nothing runs a check
  automatically. The gate is the only thing catching a regression.
- Clear context at phase boundaries, not mid-phase.
- Tier the model: **phases 1, 2, 3 and 8 are calculation-heavy** (state machines, deadline
  arithmetic, key identity, the filing rules) — use the strong model. **Phases 4, 5, 6, 7 and 9 are
  mostly transcription against a named pattern** — a cheap model handles them. Phase 4 is the one
  cheap phase with a sharp edge: `paths.ts`'s `ParamKeysMatch` guard and `params.ts`'s exhaustive
  switch both fail loudly if the new param type is added in only one of the two places.

### Batching, and the two places it is not allowed

- **Phase 4:** step 4.1 (`hex32` in `params.ts`) and 4.2 (`appPaths`) must not be grouped. Both fail
  as the same `tsc` error, so grouping them hides which one is wrong.
- **Phase 7:** step 7.5 (the evidence panel's test) has to be observed **green** before step 7.6
  changes the item card's props. Step 7.6 is what mounts `IncidentItemEvidence` and
  `IncidentFieldLink` inside `renderItemExtra`, so a red 7.5 is red for a reason 7.6 will hide
  among its own — and 7.5 is the only place the capture branches are asserted at all.

Everywhere else, group freely and say which steps you grouped.

## Test plan for this feature

Thirteen test files created, three edited (`params.test.ts`, `host.test.ts`,
`ReservationPage.test.tsx`).

| Phase | Test file | Covers |
| --- | --- | --- |
| 1 | `src/lib/helpers/claimStatus.test.ts` (new) | every `status` → tone/label pair; `isIncidentEditable` and `canConfirmFiling` on all six statuses; `canReissueItemLink` at the boundary (expired / live / wrong status); `findIncidentForReservation` — match, no match, and two incidents on one apartment |
| 1 | `src/lib/helpers/claimDeadline.test.ts` (new) | `getClaimDeadlineState` before, at and after the guest deadline; a null `guestResponseDeadlineAt`; the AirCover day count rounding; `formatCountdown` at 0 and at 24 h |
| 1 | `src/lib/helpers/incidentEvidence.test.ts` (new) | `requiredPhotoTypes` per item type, with `PHOTO_EVIDENCE_FOR_TYPE` named as the backend rule it mirrors; active-photo counting ignores `soft_deleted` evidence and documents; the evidence-type→label-key map covers all seven types |
| 2 | `src/lib/helpers/claimMoney.test.ts` (new) | `formatCents` for 0, a three-digit amount and a thousands group; `claimTotals` over an empty and a multi-item claim; `parseCentsFromInput` for `"12.34"`, `"12,34"`, `""` and `"abc"` |
| 2 | `src/lib/helpers/claimMessage.test.ts` (new) | the message contains the guest's name, every item once, its room and its value; a one-item and a five-item claim; a `t` stub proves which keys are asked for |
| 3 | `src/lib/api/queries/incidents.test.ts` (new) | each key builder's exact shape; `useIncidents`'s request `query` object; that the field module's three fetchers make **no** `withAuth()` call |
| 4 | `src/lib/router/params.test.ts` (edited) | the `hex32` boundary: 32 hex accepted in either case, 31 and 33 rejected, a hyphenated uuid rejected, and the shapes `"name"` would have accepted rejected — the whole reason the type exists |
| 4 | `src/lib/api/queries/host.test.ts` (edited) | the reservation route declares the incidents read; the claim route's four declarations, one of which resolves to null |
| 5 | `src/components/host/incident/ReservationIncidentSection.test.tsx` (new) | the apartment-keyed read; the other-reservation non-match; loading, error, empty and populated branches; the four clock branches; both callbacks |
| 6 | `src/components/host/incident/AddIncidentItemForm.test.tsx` (new) | the picker excludes assets already on the claim and deactivated ones; the submit stays disabled until an asset is chosen, then enables and sends **one** call carrying the type and the optional cents; an empty value is omitted rather than sent as 0 |
| 6 | `src/components/host/incident/IncidentItemList.test.tsx` (new) | the empty branch; a damage item and a theft item render their own required-view copy; a soft-deleted photo does not count as a collected view; the status renders through phase 1's key |
| 7 | `src/components/host/incident/IncidentFieldLink.test.tsx` (new) | the link is the field route with the item's token; copy calls `navigator.clipboard.writeText`; reissue renders only for an expired `link_generated` item |
| 7 | `src/components/host/incident/IncidentItemEvidence.test.tsx` (new) | the required views render as the item's type demands; a captured photo shows; the disabled state while uploading |
| 8 | `src/components/host/incident/ClaimFilingPanel.test.tsx` (new) | figures; copy builds the message; confirm is disabled below `ready_to_file`; the emergency banner renders only when `isEmergencyMode`; the countdown renders from the injected clock |
| 9 | `src/pages/FieldIncidentPage.test.tsx` (new) | loading; the unusable-link branch for a rejected token; each required view becomes capturable; submit posts once then shows the done screen with **no** navigation; the baseline still renders when `baselinePhotos` is non-empty and is absent when `[]` |

**Phases exempt from a test step:** **none** (D34). Every phase here creates logic or a state
branch, and the rule's exemption is for a phase that only wires or renames. Phase 4 is the closest
to exempt — it is route wiring — but its `hex32` param type is a real rule with a real boundary, and
its test step pins it there rather than leaving it to phase 9.

**Deliberately untested, with the reason:** the live 15-second claim clock's *ticking* (phase 8). The
hook wraps `setInterval`; jsdom's fake timers would assert that an interval fired, not that the
screen updated, and the arithmetic that can actually be wrong lives in `claimDeadline.ts`, which is
covered in phase 1. Phase 8 tests the panel's rendering against a **stubbed** clock value instead.

## Halt conditions

- `npm run gate` is red and one honest fix attempt does not clear it
- The plan contradicts the code in a way that changes observable behaviour
- A step needs a file outside its Touch list
- A decision the plan does not cover changes observable behaviour
- A step needs a translation key that exists in no locale file
- The generated client does not export a request function a step assumes
- **`prefetchCoverage.test.ts` or `tree.test.ts` goes red.** Both are structural: red means a route
  declaration is wrong, and the one action that is *always* wrong is editing the assertion (D35).
  Fix the declaration in `routes/host.ts` / `routes/public.ts` and report what was wrong.
- **An executor finds itself writing `=== "draft"` (or any other status literal) inside a component
  or a page.** That comparison belongs to `claimStatus.ts` (invariant 9). Report it rather than
  adding a second copy of the rule.
- **An executor finds itself adding a fourth `QUERY_ACTIONS` entry.** Three are decided (D8); a
  fourth means a step is inventing a read the plan does not have.
- **A phase's own test step fails in a way the phase's `Do` block does not explain**, in any phase.
  Stop and report it — do not adjust the test to match.
- **A step needs `getIncidents` to filter by `reservationId`.** It cannot: `apartmentId` is required
  and there is no such parameter (fact 7 in the decisions file). Match client-side via
  `findIncidentForReservation`.
- **The backend is unreachable, and that is expected.** The incident surface is on an unmerged
  branch (`feature/51_incident-initial-setup`) and the deployed field route answers
  `500 INTERNAL_SERVER_ERROR`. No phase may depend on a live request, a browser pass against a real
  field link, or a `npm run api:generate`. Every acceptance criterion is either `npm run gate` or a
  grep. The phase-8 and phase-9 browser passes are **advisory**, recorded as noticed items.

## Definition of done

- [ ] `npm run gate` green on the feature branch; every phase's test step landed, none deferred
- [ ] `Test Files` and `Tests` counts strictly increased at every phase that adds a test file, and
      never decreased — a count that drops means a test was deleted rather than adapted
- [ ] Every new i18n key present in `en`, `de`, `tr` and `sr-Latn` — checked per-file with the
      `node -e` dump each phase gives, not by the gate alone
- [ ] No hand-edits under `src/api/generated/` (`git status --porcelain src/api/generated/` → empty,
      after the operator's pre-phase-1 commit)
- [ ] `grep -rn 'withAuth' src/lib/api/fieldIngest.ts src/pages/FieldIncidentPage.tsx` → nothing
- [ ] `grep -rn '=== "draft"\|=== "ready_to_file"\|=== "link_generated"' src/components src/pages`
      → nothing (invariant 9)
- [ ] Both routes reachable by URL: `/host/apartments/<id>/reservations/<id>/incident` behind
      `canOpenHost`, `/field/incident/<32-hex>` with no session
- [ ] A malformed field token (`/field/incident/nope`) renders the router's 404, not the API's
      unusable-link screen
- [ ] One commit per phase, by the operator; docs and generated files committed separately and
      before phase 1 (D37, D38)
- [ ] The PR records **four deviations**: the emergency banner does not flash (D18), the ghost
      overlay is a baseline still rather than a live viewfinder (D19), the locale strings are written
      in English rather than machine translated (D29), and the incident list reads page 1 only so an
      apartment with more than 100 claims could hide an older one (D14)

## Facts the executor should know, that no phase file repeats

- **The generated client is already regenerated** in the working tree: all 15 incident and 3 field
  functions, and every type the phases use. No phase runs `npm run api:generate`.
- **`npm run build` is never an acceptance criterion** (D43). Its `prebuild` hook runs
  `api:generate`, which fetches `VITE_API_DOCS_URL` and rewrites `src/api/generated/`.
- **`npm run perf:bundle` is advisory and appears once**, at the end of phase 3, because that is the
  only phase that adds to the entry chunk. It was measured while planning: +0.2 KiB.
- **`test-setup.ts` global-mocks `react-i18next`**, so `t()` returns the key. Assert on keys, never
  on English.
- **`vi.mock` of a query module must spread `importOriginal`** — `registry.ts` dereferences each
  module's `xResource` export at load, and a wholesale replacement erases it and kills the whole
  suite before a single test runs. `ReservationPage.test.tsx` has the comment and the pattern.
- **jsdom implements no `URL.createObjectURL`.** Any test that drives a capture stubs it with
  `vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:preview") })` and calls
  `vi.unstubAllGlobals()` afterwards — `ShotStepPanel.camera.test.tsx` is the model.
