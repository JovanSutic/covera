# <Feature> — decisions

Every choice the executor would otherwise make mid-flight. Approve the table in one pass, or edit
it in place; do not leave a row in `OPEN`.

**Status values:** `APPROVED` · `OPEN` (blocks execution) · `REJECTED` (kept for the record)

---

## Decisions

| ID | Decision | Rationale | Status |
| --- | --- | --- | --- |
| D1 | | | OPEN |
| D2 | | | OPEN |
| D3 | | | OPEN |

---

## Checklist — close every one of these before approval

Delete the rows that genuinely do not apply, but say why in one word (`n/a`).

**Shape**
- [ ] Route path, and which ecosystem it belongs to (`admin` / `host` / guest-facing)
- [ ] Component location: `src/pages/<area>/` for a routable screen, `src/components/` for a
      reusable piece, `src/components/forms/` for a form
- [ ] Server state vs local state — what goes in react-query, what stays in `useState`
- [ ] `QUERY_ACTIONS` key: reuse an existing entry, or add one (state which)

**API**
- [ ] Which generated request function is called, by name
- [ ] Does the backend already expose it? If not, this is blocked on a contract change — say so
- [ ] Does `npm run api:generate` need re-running before execution? (it needs a reachable backend)
- [ ] Auth: `withAuth()` or `publicApi()` — decided, not defaulted

**Auth and routing**
- [ ] Guard that runs (`requireRoleGuard("<role>")`, `redirectIfAuthenticated()`, or public)
- [ ] Every role that may reach the screen, named explicitly
- [ ] Whether it is deliberately public (and the comment that says so)
- [ ] Whether the route is lazy-imported in `src/App.tsx`

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

Guesses become wrong decisions executed at scale. Record what you checked.

| Fact | Verified by | Result |
| --- | --- | --- |
| Route is not already in `src/App.tsx` | `grep -n "<path>" src/App.tsx` | |
| `QUERY_ACTIONS` has no key for this | `grep -n "<name>" src/lib/api/queryKeys.ts` | |
| Key is missing from the other locales | `grep -rn "<key>" public/locales/` | |
| Generated client exports the request fn | `grep -n "<fn>" src/api/generated/requests/*.gen.ts` | |
