# Phase <N> — <outcome in four words>

**Prerequisite:** phase <M> (<why, in one clause>)
**Gate:** `npm run gate`
**Budget:** ≤ 400 lines total · ≤ 130 lines of verbatim code (logic) / ≤ 40 (surface) · ≤ 250 lines in
any one block. Run `node scripts/plan-budget.mjs <this file>` before this file is considered done.

---

Pick the mode per step. **Logic** steps carry verbatim code. **Surface** steps — components, pages,
hooks, anything composing existing pieces — carry a signature and bullets. When in doubt, use surface
mode: the executor writes a component better with the real file open than the plan does from memory.

## Step <N>.1 — <imperative title; this IS the goal, do not restate it>

**Touch.** `path/to/file.ts` (create | edit | delete)

**Do.** *(logic mode — small, pure, "nearly right" is wrong)*

```ts
// the exact bytes. A helper, validator, formatter, reducer, schema, query-key entry, route
// declaration, or locale key list. Under 60 lines. If it is longer, split the step.
```

**Accept.** <a command, with the output it must produce — e.g. `npm run gate` → exit 0;
`grep -n "x" src/f.tsx` → nothing>

**Verify.** `npm run gate`

---

## Step <N>.2 — <title>

**Touch.** `src/components/<area>/<Name>.tsx` (create)

**Do.** *(surface mode — specify, do not transcribe)*

- **Exports.** `export function <Name>(props: <Props>): JSX.Element`
- **Props.** write the interface out in full — the compiler checks this across files:
  `<field>: <type>` — <what it means>
- **Consumes.** `<symbol>` from `<file>`; `<query key>` from `QUERY_ACTIONS`
- **Renders.** `t("host.<ns>.<key>")` for the title; `t("<key>")` for the empty state
- **States.** loading → <what renders>; empty → <…>; error → <…>; success → <…>
- **Callbacks.** `onSelect(id)` — the caller <what it does with it>
- **Pattern to follow.** `<existing component>` in `<file>` — same shape, same conventions
- **Invariant.** <the one this must not break, or "no new invariant">

No JSX. If you are writing JSX here, the step is in the wrong mode.

**Accept.** <a command whose output proves the step landed>

**Verify.** `npm run gate`

---

## Step <N>.K — Test <module>

Required when this phase contains testable logic — a helper, validator, reducer, formatter, or state
machine. A purely presentational or wiring phase may omit it, but only if a decision row in
`docs/<feature>.decisions.md` exempts it. Skip silently and the phase is not done.

Tests are always written verbatim, in either mode: the test is the acceptance criterion, and it is
worth its lines.

**Touch.** `src/lib/<module>.test.ts`

**Do.**

```ts
// the actual test code
```

**Accept.** `npm run gate` → <new count> tests passing, 0 failing

**Verify.** `npm run gate`

Note for component tests: `test-setup.ts` global-mocks `react-i18next`, so `t()` returns the key.
Assert on keys (`expect(screen.getByText("host.form.title"))`), not on translated English.

---

## Phase <N> invariants

- [ ] No hand-edits under `src/api/generated/`
- [ ] Every new i18n key exists in all four locales
- [ ] Query keys come from `QUERY_ACTIONS`
- [ ] Mutations added here invalidate the keys they changed
- [ ] No secret added to a `VITE_` env var
- [ ] <feature-specific invariant, or delete>
