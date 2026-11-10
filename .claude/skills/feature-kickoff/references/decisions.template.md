# <Feature> — decisions

Every choice the executor would otherwise make mid-flight. Approve the table in one pass, or edit
it in place; do not leave a row in `OPEN`.

This file is where the plan's intelligence belongs. It is prose and short rows — **no code** — and it
is the highest-value artifact per token in the whole process. The phase files stay thin *because*
this file is complete: with the §"Budgets" cap applied, the executor writes most of the components
itself, so anything not closed here gets decided by the executor instead of by you.

**Status values:** `APPROVED` · `OPEN` (blocks execution) · `REJECTED` (kept for the record)

---

## Decisions

| ID | Decision | Rationale | Status |
| --- | --- | --- | --- |
| D1 | | | OPEN |
| D2 | | | OPEN |
| D3 | | | OPEN |

**One row per decision. Keep the rationale to one line** — this file is read once as a whole, and a
`Rationale` column that runs to paragraphs costs more than the decision it defends. Where a rejection
is non-obvious, it goes in the Rejected alternatives table below, not into the rationale.

---

## Checklist — close every one of these before approval

Delete the rows that genuinely do not apply, but say why in one word (`n/a`).

**Shape**
- [ ] Route path, and which ecosystem it belongs to (`admin` / `host` / guest-facing)
- [ ] The route table it is declared in — `src/lib/router/routes/{host,admin,public}.ts`
- [ ] The capability its `requires` names (`canOpenHost`, `canUseApp`, `canOpenPublicOnly`, …), or
      `public`
- [ ] Any new path param, and its type in **both** `params.ts` and `paths.ts` (each guards the other)
- [ ] Component location: `src/pages/<area>/` for a routable screen, `src/components/` for a
      reusable piece, `src/components/forms/` for a form
- [ ] Server state vs local state — what goes in react-query, what stays in `useState`
- [ ] `QUERY_ACTIONS` key: reuse an existing entry, or add one (state which)

**API**
- [ ] Which generated request function is called, by name
- [ ] Does the backend already expose it? If not, this is blocked on a contract change — say so
- [ ] Does `npm run api:generate` need re-running before execution? (it needs a reachable backend)
- [ ] Auth: `withAuth()` or `publicApi()` — decided, not defaulted
- [ ] **If the backend is unreachable, which phases are unverifiable?** List them, so the operator
      can decide whether to start. See the skill's §"What to do when the backend is not ready"

**Auth and routing**
- [ ] Every capability that may reach the screen, named explicitly
- [ ] Whether it is deliberately public (and the comment that says so)

**States** — one row per state the screen can be in
- [ ] Loading
- [ ] Empty (list with no rows — distinct from loading, and frequently forgotten)
- [ ] Error (what the user sees when the query rejects)
- [ ] Success
- [ ] Optimistic vs pessimistic on each mutation, and what is invalidated

**Copy and i18n**
- [ ] Namespace (`general` / `host` / `guest` / `assets`, or a new one — a new namespace means new
      files in all four locales)
- [ ] Are the key names decided now, or is copy pending? "Pending" is a decision; silence is not
- [ ] Is translated copy ready for `de`, `tr`, `sr-Latn`, or does `npm run i18n:translate` run over it

**Forms** — `n/a` if the feature has none
- [ ] Where the zod schema lives (`src/lib/validations/` or colocated)
- [ ] Field-level error messages: which i18n keys
- [ ] Whether validation duplicates a backend rule, and which wins

**Evidence**
- [ ] Does this phase have testable logic? If yes, tests are required
- [ ] If no, the one-line reason it is exempt (this is the test opt-out; see the skill's test rule)
- [ ] Where tests live (default: `*.test.ts(x)` beside the module)

**Process**
- [ ] Commit granularity (default: one per phase)
- [ ] Does this need a doc update, and to which file
- [ ] Does anything here change a shared component other features already use? Named, and called
      out in the PR.

---

## Rejected alternatives

Only where the rejection is non-obvious enough that someone would otherwise re-propose it.

| ID | Alternative | Why rejected |
| --- | --- | --- |
| R1 | | |

---

## Facts verified while writing this (with the command that verified them)

Guesses become wrong decisions executed at scale. Record what you checked. Two rules: run the command
**once** (a fact confirmed twice is a fact confirmed once, at double cost), and **verify a file path
still exists before citing it** — several facts below were stale in the previous template.

| Fact | Verified by | Result |
| --- | --- | --- |
| Route is not already declared | `grep -n "<path>" src/lib/router/routes/*.ts` | |
| The capability exists | `grep -n "<canX>" src/lib/router/access.ts` | |
| `QUERY_ACTIONS` has no key for this | `grep -n "<name>" src/lib/api/queryKeys.ts` | |
| Key is missing from the other locales | `grep -rn "<key>" public/locales/` | |
| Generated client exports the request fn | `grep -n "<fn>" src/api/generated/requests/*.gen.ts` | |
