# Phase <N> — <outcome in four words>

**Prerequisite:** phase <M> (<why, in one clause>)
**Gate:** `npm run gate`

---

### Step <N>.1 — <imperative title; this IS the goal, do not restate it>

**Touch.** `path/to/file.tsx` (create | edit | delete)

**Do.**

```tsx
// exact content or exact final state — verbatim, no paraphrase
```

**Accept.** <a command, with the output it must produce — e.g. `npm run gate` → exit 0;
`grep -n "x" src/f.tsx` → nothing>

**Verify.** `npm run gate`

---

### Step <N>.2 — <title>

**Touch.**

**Do.**

**Accept.**

**Verify.**

---

### Step <N>.K — Test <module>

Required when this phase contains testable logic — a helper, validator, reducer, formatter, or state
machine. A purely presentational or wiring phase may omit it, but only if a decision row in
`docs/<feature>.decisions.md` exempts it. Skip silently and the phase is not done.

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
