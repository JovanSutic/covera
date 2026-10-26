# <Feature> — execution index

Spec: [../<feature>.md](../<feature>.md) · Decisions: [../<feature>.decisions.md](../<feature>.decisions.md)

## Phases

| Phase | File | Touches | Outcome | Requires |
| --- | --- | --- | --- | --- |
| 1 | [p1.md](./p1.md) | | | — |
| 2 | [p2.md](./p2.md) | | | 1 |

## Dependency rules

State the reason, not just the edge. Example: *phase 3 depends on phase 2 because every component
it touches imports the `useShots` hook phase 2 creates.*

- A legal landing order: 1 → 2 → 3
- Do not start phase N before phase M — because:

## Invariants — check at every phase boundary

1. `src/api/generated/` is not hand-edited; regenerate with `npm run api:generate` instead.
2. No hardcoded user-facing strings — every key exists in `en`, `de`, `tr`, and `sr-Latn`.
3. No secret in a `VITE_` env var; everything so prefixed ships to the browser.
4. Routes live in `src/App.tsx` as lazy imports; authenticated branches sit behind
   `requireRoleGuard("<role>")`.
5. Query keys come from `QUERY_ACTIONS`; no string literals at call sites.
6. Network calls go through `withAuth()` / `publicApi()`.
7. Mutations invalidate the keys they changed.
8. Feature-specific: <add here, or delete>

## Execution protocol

Paste the `Stage 7` block from the skill here, with the phase range filled in.

### Division of labour

- **Executor:** edits, runs `npm run gate` per step, never commits.
- **Operator:** runs `npm run gate` at each phase boundary and makes one commit per phase. This is
  a convention, not a cost saving — this repo has no husky hook and no CI, so nothing runs a check
  automatically. The gate is the only thing catching a regression.
- Clear context at phase boundaries, not mid-phase.
- Tier the model per step: cheap for transcription, strong for decision-heavy steps and review.

## Test plan for this feature

- Phases with testable logic, and the test file each one adds:
- Phases exempt from a test step, with the decision ID that exempts them:

## Halt conditions

- Gate red and one honest fix attempt does not clear it
- The plan contradicts the code in a way that changes observable behaviour
- The step needs a file outside its Touch list
- A decision the plan does not cover changes observable behaviour
- A step needs a translation key that exists in no locale file
- The generated client does not export the request function a step assumes

Report raw output, file and symbol, the options, and a recommendation. Do not proceed past it.

## Definition of done

- [ ] `npm run gate` green on the feature branch
- [ ] Every phase with testable logic landed its test; no test work deferred to review
- [ ] Every decision in `*.decisions.md` is `APPROVED` and reflected in the code
- [ ] Every new i18n key is present in `en`, `de`, `tr`, and `sr-Latn`
- [ ] No hand-edits under `src/api/generated/`
- [ ] Docs commit is separate from code commits
