# Incident follow-up — execution index

Intent: [../incident-follow-up.md](../incident-follow-up.md) · Decisions: [../incident-follow-up.decisions.md](../incident-follow-up.decisions.md) · Blocked: [./blocked.md](./blocked.md)

Baseline verified green on **2026-11-18** on branch `feature/46_incident-follow-up`:
`npm run gate` → exit 0. Working tree is otherwise clean except for the deleted prior docs and the
untracked intent file.

## What is true after this lands

| # | Surface | Behaviour |
| --- | --- | --- |
| 1 | Claim page, affected-asset row | Each damage photo is clickable and opens the same full-screen zoom the guide pages use. |
| 2 | Claim page, affected-asset row | A "Before" strip shows the asset's active `checkin_state` photos from this reservation, above the damage strip, with no delete control. |
| 3 | Claim page, "What you are asking for" | One amount row per affected asset, defaulting to the stored value; `0` or empty is invalid (red border, save disabled); editable until the claim is filed. |
| 4 | Claim page, "Request text" | The pasted message names the apartment, the stay dates and the guest, lists each asset with its amount and the total, asks the guest to settle, and states that before/after photos are attached. |
| 5 | Claim page + reservation page | Every incident string reacts to the language selector, because the four locale files no longer carry identical English values. |
| 6 | Whole app | Every internal link carries `lang=<current>`; a page opened from a translated page stays in that language, and a reload without the parameter no longer resets the UI to English. |
| 7 | `/host/damage-claim-guide` | A structured page explains the procedure, and the reservation's claim section links to it in every state. |
| 8 | Reservation page + claim page | "Open a claim" is disabled until the stay's effective check-out has passed, with a line explaining why. |

## Phases

| Phase | File | Touches | Outcome | Requires |
| --- | --- | --- | --- | --- |
| 1 | [p1.md](./p1.md) | `src/components/shared/ImageZoomOverlay.tsx` (new), `ExpendableImage.tsx`, `src/components/host/incident/IncidentItemEvidence.tsx` + test | Damage photos enlarge on click (issue 2) | — |
| 2 | [p2.md](./p2.md) | `src/lib/helpers/assetBeforePhotos.ts` (new) + test, `IncidentItemEvidence.tsx` + test, `IncidentPage.tsx`, `src/lib/router/routes/host.ts`, locales | Before photos render per asset (issue 3) | 1 |
| 3 | [p3.md](./p3.md) | `src/lib/helpers/claimMoney.ts` + test, `src/lib/api/incidentClaims.ts`, `IncidentItemValueEditor.tsx` (new) + test, `ClaimFilingPanel.tsx`, locales | Per-asset amount rows with validation (issue 4) | — |
| 4 | [p4.md](./p4.md) | `src/lib/helpers/claimMessage.ts` + test, `ClaimFilingPanel.tsx`, `IncidentPage.tsx`, locales | The request text carries dates, per-asset amounts, the ask and the photo note (issue 5) | 3 |
| 5 | [p5.md](./p5.md) | `src/lib/router/paths.ts`, `src/lib/router/routes/host.ts`, `src/pages/host/DamageClaimGuidePage.tsx` (new), `ClaimGuideLink.tsx` (new), `ReservationIncidentSection.tsx` + test wrapper, `IncidentPage.tsx`, locales | The procedure has a page, linked from the claim section (issue 9) | — |
| 6 | [p6.md](./p6.md) | `src/lib/router/lang.ts` (new) + test, `AccessLink.tsx`, `Header.tsx`, the direct-navigation sweep (6 files), `ReservationIncidentSection.test.tsx` | Language survives navigation (issue 7) | 5 |
| 7 | [p7.md](./p7.md) | `claimDeadline.ts` + test, `ReservationIncidentSection.tsx` + test, `ReservationPage.tsx`, `IncidentPage.tsx`, locales | Claim creation waits for check-out (issue 10) | 5, 6 |
| 8 | [p8.md](./p8.md) | `public/locales/{de,tr,sr-Latn}/host.json` | Incident copy is actually translated (issue 6) | 1–7 |

## Dependency graph

A legal order is **1 → 2 → 3 → 4 → 5 → 6 → 7 → 8**, and **3 and 5 may land before 1**.

- **2 needs 1** — the before strip renders the same zoomable thumbnail p1 creates. Building the
  strip first would mean writing a second zoom trigger.
- **4 needs 3** — the message's per-asset amounts come from the rows p3 edits. Before p3 the message
  can only report `estimatedPlaceholderValueCents` as it was authored, which is the state issue 5
  complains about.
- **6 needs 5** — p5's route is the only new path `withLang` has to carry, and p5 is what wrapped the
  claim-section test in the providers 6.5 asserts against.
- **7 needs 5 and 6** — it disables CTAs in the two components p5 edited, and it extends the same test
  file 6.5 last touched.
- **8 needs 1–7** — it translates every key those phases add. Running it earlier would leave the new
  keys in English in the three target locales.
- **1, 3 and 5 are otherwise independent** — different files, no shared symbol. They may land in any
  order among themselves.

## Invariants — check at every phase boundary

1. `git status --porcelain src/api/generated/` → **empty**. No phase here touches it.
2. Every new key exists in all four of `public/locales/{en,de,tr,sr-Latn}/<ns>.json`. The gate
   catches an `en`-only key, but not a wrong namespace — read the key you added.
3. No new `VITE_`-prefixed variable.
4. Routes live in `src/lib/router/routes/*.ts`; `src/App.tsx` is not touched. Only p5 adds a route.
5. Query keys come from `QUERY_ACTIONS`; no new entry is added by any phase. p2 reuses
   `reservationPhotos`.
6. Every network call goes through `withAuth()` / `publicApi()`.
7. Mutations invalidate what they changed. p3 invalidates `incidentQueryKey` and `incidentsQueryKey`.
8. Forms validate with a zod schema. This plan adds **no** `<form>`; p3's rows are controlled inputs
   with a named helper, which is the same shape `ClaimFilingPanel` uses today.
9. **Feature-specific.** No status string comparison in a component. `isIncidentEditable` and
   `canFileClaim` stay the only answers to "may this be edited / filed".
10. **Feature-specific.** `src/lib/router/__checks__/prefetchCoverage.test.ts` and `tree.test.ts` are
    not edited. A red check means the declaration in `routes/host.ts` is wrong.
11. **Feature-specific.** The message text stays English-only in item names (free text the host
    wrote) and uses `t()` for fixed sentences, as today.

## Execution protocol

```
You are executing a pre-written plan, one phase at a time. Do not design, redesign, or improve it.

SOURCES
- docs/incident-follow-up/00-index.md — read ONCE at the start (dependencies, invariants, halt conditions).
- docs/incident-follow-up/p<N>.md — read ONLY the phase file you are about to execute.
- docs/incident-follow-up.decisions.md — read ONCE. If a decision is missing, HALT; do not decide it.

SCOPE
- Execute phases 1–8 in order. Stop at the phase boundary.

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

- **Executor:** edits, runs `npm run gate` per step, **never commits**.
- **Operator:** runs `npm run gate` at each phase boundary and makes **one commit per phase** (D3).
- Clear context at phase boundaries, not mid-phase.
- Tier the model: **p2, p3, p4, p6 and p7 carry logic** (a filter, a validation rule, a formatter, URL
  building, a date comparison) — use the strong model. **p1, p5 and p8 are transcription, wiring and
  locale data** — a cheap model handles them.

### Batching

- **p2: run 2.2's gate before starting 2.3.** They touch different files, but 2.3 passes the prop 2.2
  introduced; grouped, a prop mismatch is one error among many and its side is unclear.
- **p3: run 3.4's gate before starting 3.5.** 3.4 removes the panel's input and 3.5 rewrites the test
  that asserted it. Grouped, `tsc` and `vitest` report the same removal from two directions.
- **p6: 6.2 and 6.3 must not be grouped.** `AccessLink` and `Header` both build an href and both fail as
  the same type error if grouped.
- Everywhere else, group freely and say which steps you grouped.

## Test plan

| Phase | Test file | Covers |
| --- | --- | --- |
| 1 | `IncidentItemEvidence.test.tsx` (edited) | a thumbnail click opens the overlay with that photo; closing removes it; the delete button does not open it |
| 2 | `src/lib/helpers/assetBeforePhotos.test.ts` (new) | no shots; one shot with two assets; `damage` images excluded; soft-deleted excluded; the same asset across two shots merges; duplicate image ids dedupe |
| 2 | `IncidentItemEvidence.test.tsx` (edited) | the strip renders above the damage strip; nothing renders without it; a before photo has no delete control; a before photo zooms |
| 3 | `src/lib/helpers/claimMoney.test.ts` (edited) | `parsePositiveCentsFromInput` for `"12.34"`, `"12,34"`, `"0"`, `"0.00"`, `""` and `"abc"` |
| 3 | `IncidentItemValueEditor.test.tsx` (new) | one row per item; `0` renders invalid; a valid amount saves that row's cents; save is disabled while invalid; read-only when `editable` is false |
| 4 | `src/lib/helpers/claimMessage.test.ts` (edited) | the message names both dates, the apartment, every asset with its amount, the total, the ask and the photo note; a one-item and a five-item claim |
| 6 | `src/lib/router/lang.test.ts` (new) | `en` is omitted; `de`/`tr`/`sr-Latn` appended; an existing query is preserved; a hash survives; an unsupported language is ignored |
| 6 | `ReservationIncidentSection.test.tsx` (edited) | a rendered guarded link's href carries `?lang=de` |
| 7 | `src/lib/helpers/claimDeadline.test.ts` (edited) | `canOpenClaimAt` before, at and after checkout; an alternative check-out wins when it is a real date; a corrupt date does not gate |
| 7 | `ReservationIncidentSection.test.tsx` (edited) | "start a claim" is disabled with a reason before checkout, enabled after |

**Phases exempt from a test step:** p5 (route wiring plus static copy) and p8 (locale data). The
reason is D26. Every other phase carries one.

## Halt conditions

- `npm run gate` is red and one honest fix attempt does not clear it.
- Theplan contradicts the code in a way that changes observable behaviour.
- A step needs a file outside its Touch list.
- A decision the plan does not cover changes observable behaviour.
- A step needs a translation key that exists in no locale file.
- The generated client does not export a request function a step assumes.
- **`prefetchCoverage.test.ts` or `tree.test.ts` goes red.** Both are structural; fix the
  declaration in `routes/host.ts`, never the assertion (invariant 10).
- **`npm run i18n:translate` fails or produces empty values for a key** (p8). Report the failing
  locale and key; do not hand-write a translation the operator has not approved.

## Definition of done

- [ ] `npm run gate` green on the feature branch; every non-exempt phase's test step landed
- [ ] `Test Files` and `Tests` counts increased at every phase that adds a test file and never dropped
- [ ] Every new key present in `en`, `de`, `tr` and `sr-Latn`
- [ ] p8's verification command reports every `incidentPage.*` value differs from `en` in all three target locales
- [ ] `git status --porcelain src/api/generated/` → empty
- [ ] `/host/damage-claim-guide` reachable behind `canOpenHost`
- [ ] One commit per phase, made by the operator
- [ ] The PR records that issues 1 and 11 were **not** implemented and why (see `blocked.md`)

## Blocked work

Issues **1** (mandatory + additional photos, max 4 per asset) and **11** (repair/replace proposal,
two documents, explanation, lost business) require a `covera-hono` contract change. The exact
changes and the frontend follow-up are in [blocked.md](./blocked.md). No phase in this plan depends
on them.