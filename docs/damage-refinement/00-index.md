# Damage claim refinement — plan index

**Spec:** `docs/damage-refinement.md` · **Decisions:** `docs/damage-refinement.decisions.md`
**Branch:** `feature/54_damage-claim-refinement`

Read this file **once**. Then read only the phase file you are about to execute.

---

## Phase table

| Phase | Files touched | Outcome | Prereq |
| ----- | ------------- | ------- | ------ |
| **p1** | `src/api/generated/**` (commit), 10 test files, `src/lib/helpers/__fixtures__/photoAllowance.ts` (new) | Baseline gate green again | — |
| **p2** | `src/components/Header.tsx`, `src/pages/host/DamageClaimGuidePage.tsx`, `src/lib/helpers/guidePoints.ts` (new), 4 locale files | Issue 1 (lang round-trip), issue 2 (back button), issue 6 (guide renders in all locales) | p1 |
| **p3** | `src/lib/helpers/absoluteUrl.ts` (new), `src/pages/host/ReservationPage.tsx`, `public/locales/*/host.json` | Issue 4a (absolute guest link), issue 4b (inviting claim message) | p1 |
| **p4** | `src/lib/api/specialAccess.ts` (new), `src/lib/api/queryKeys.ts`, `src/components/host/ReservationLinksSection.tsx` (new), `src/pages/host/ReservationPage.tsx`, locales | Issue 5: host can mint and revoke an `inspection_proof` access link | p1, p3 |
| **p5** | `src/lib/router/paths.ts`, `src/pages/host/IncidentProofsPage.tsx` (new), `src/lib/router/routes/public.ts`, locales | Issue 3: the `/incident/:incidentId/proofs` page | p1, p4 |
| **p6** | `src/pages/host/IncidentPage.tsx`, `src/components/host/incident/IncidentItemEvidence.tsx`, locales | Issue 3 host side: claim page goes view-mode and links to the proofs page | p5 |
| **p7** | `src/lib/router/paths.ts`, `src/lib/router/routes/public.ts`, `src/pages/InspectionGuidePage.tsx`, `src/lib/api/specialAccess.ts`, locales | Guest read access to the inspection guide via `?accessId=` | p4, p5 |

**7 phases.** Backend-independent throughout: every acceptance criterion is `npm run gate`
or a grep. No step depends on a live request.

---

## Dependency graph

```
p1 (baseline green)
 ├── p2 (lang + guide fixes)
 ├── p3 (messages) ──┐
 └── p4 (access links) ──┬── p5 (proofs page) ── p6 (incident page rewiring)
                         └── p7 (guest read access) ← needs p5's route too
```

Why each edge exists:

- **p1 → everything.** The tree does not compile until `photoAllowance` is in the fixtures.
  Nothing can be verified against a red gate.
- **p3 → p4.** `ReservationLinksSection` (p4) is mounted on the same page p3 edits; landing
  p3 first keeps one editor per file region.
- **p4 → p5.** The proofs page's route needs `paths.ts`'s `ParamKeysMatch` guard updated;
  p4 establishes the `specialAccess` module p5's guest branch calls.
- **p5 → p6.** The incident page links to a route that must already exist.
- **p5 → p7.** p7 flips `InspectionGuidePage` to `public` and reuses p5's access-aware
  fetchers and guest-refusal pattern.
- **p2 independent of p3–p7.** Different files; may be reordered.

---

## Invariants — check after every phase

From `docs/damage-refinement.md` §Invariants:

1. `src/api/generated/` is generated — never hand-edit.
2. No hardcoded user-facing strings; every key exists in all four locales.
3. Routes live in the route tables; `src/App.tsx` mounts the router only.
4. Query keys come from `QUERY_ACTIONS`; no string literals at call sites.
5. Network calls go through `withAuth()` / `publicApi()`.
6. Mutations invalidate what they changed.
7. Forms validate with a zod schema through `@hookform/resolvers`.
8. **Feature-specific:** the accessId query parameter is the only anonymous credential on
   the guide's read path; a page holding one must never call `withAuth()`.

Plus, from the skill:

- Locale parity is asserted one-way (`en ⊆ locale`). Never trust the gate alone for a new
  key — dump all four files with a `node -e` one-liner in the step that adds one.
- `src/lib/__checks__/localeParity.test.ts`, `src/lib/router/__checks__/*` are assertion
  files. If one goes red, the **declaration** is wrong, not the assertion.

---

## Execution protocol

```
You are executing a pre-written plan, one phase at a time. Do not design, redesign, or improve it.

SOURCES
- docs/damage-refinement/00-index.md — read ONCE at the start (dependencies, invariants, halt conditions).
- docs/damage-refinement/p<N>.md — read ONLY the phase file you are about to execute.
- docs/damage-refinement.decisions.md — read ONCE. If a decision is missing, HALT; do not decide it.

SCOPE
- Execute phases <A>–<B> in order. Stop at the phase boundary.

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
- Group steps that touch the same file into one read + one write, unless a step's Accept must
  be observed before the next step runs. Say which steps you grouped.

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

---

## Halt conditions

Stop and report — do not improvise — when:

- the gate is red and one honest fix attempt does not clear it;
- the plan contradicts the actual code in a way that changes observable behaviour;
- completing a step needs a file outside Touch;
- a decision the plan does not cover changes observable behaviour;
- a step needs a translation key that does not exist in any locale file;
- the generated client does not export the request function a step assumes.

**Phase-boundary rule:** the operator runs `npm run gate` and makes one commit per phase.
Docs commits are separate from code commits.

---

## What is blocked, and why

Recorded in the spec's §Behaviour. Do not work around these in code:

| Gap | Consequence in this plan |
| --- | ------------------------ |
| No `/incidents*` endpoint honours `?accessId=` | p5's guest mode is a refusal state (D31); p7 does not extend to the proofs page |
| Submit endpoints reject access | p7's guest guide is read-only (D38, D39) |
| `damage_evidence` scope has no endpoint | Only `inspection_proof` is offered (D18) |
| Unknown accessId → `500`, not `403` | Guest refusal copy must not claim the link is invalid; it reports the backend's own message |
