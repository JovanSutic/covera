# Router maximization — executor prompt

Invoke as: *"Read `docs/router-maximization/execution-prompt.md` and execute it with `PHASE=<n>`."*

Everywhere below, **`<PHASE>`** is the single substitution: substitute the number in *both* the phase
title (`phase <PHASE>`) and the phase-file name (`p<PHASE>.md`, `p1.md` … `p9.md`). Nothing else changes
between phases.

---

## The prompt

Execute phase `<PHASE>` of a pre-written router plan in this repo. I am the operator; you are the executor.

### SOURCES — read in this order, nothing else

1. Read `docs/router-maximization/p<PHASE>.md` in full. This is the work.
2. Read `docs/router-maximization.decisions.md` ONCE, and only to look up the D-numbers the phase file
   cites (grep `^\| D<n>`, do not re-read the whole file between steps). It is binding: an executor that
   hits a case no row covers HALTS — it does not decide.
3. Read `docs/router-maximization/00-index.md` only if you need the invariant list, the halt conditions,
   or the phase-dependency reason — read the one section, not the file.
4. Do NOT read: other phase files, `docs/router-maximization.md` (the spec), the playbook or the
   reference doc. They are context I already consumed; re-reading them wastes your budget.

### PRE-FLIGHT (once, before any edit)

- `npm run gate` must be green (timeout 300000). Red → stop and report; do not start.
- `git status --porcelain src/api/generated/` must be empty.
- Confirm the previous phase's outputs exist (the phase file's "Prerequisite" line). Missing → stop.
- Never run a git write command. Never commit. The branch stays `feature/49_router-improvements`.

### EXECUTE — for each step in the phase file

1. Read Touch / Do / Accept / Verify.
2. Before writing: read the target files you are about to edit, and grep for the symbols the Do block
   references (never read a file the step does not touch just to "understand" it).
3. Make exactly the change in Do. Fidelity is absolute: Do blocks are verbatim source — no renaming,
   reformatting, reordering, "cleaning up", no extra imports, no added error handling, no comments
   beyond the ones given. Line numbers are hints from a past date; locate by symbol.
4. Run Verify and capture real output. Walk every Accept bullet against that output, not against
   intent. An Accept bullet you cannot observe is a blocked step, not a passed one.
5. Report the step in the fixed format below, then continue to the next step.

### BATCHING — this is where the time goes

- Consecutive steps that touch the same file(s) and whose Accept does not require an intermediate
  observation: apply all their edits first, then run the gate once. Name the steps you grouped.
- One `npm run gate` after each group, and after the last step of the phase regardless.
- If a grouped gate run fails and the cause is not obvious from the error, re-run per step to localise —
  do not bisect by guessing.
- Use `npx tsc -b` or `npx vitest run <path>` only where the phase file's Verify says so.

### VERIFICATION-ONLY STEPS

- A step with `Touch: none` or a numbered browser checklist: do not edit anything. Run the
  gate/commands it names, and for each browser bullet emit `operator-verify <bullet>` — I will tick it
  in the browser. Never claim a UI observation you could not make.
- Steps that deliberately break something (e.g. phase 9's lint violations) must be reverted before the
  next step and the revert confirmed by a green gate.

### HALT AND ASK — do not guess — when

- the gate is red and one honest fix attempt does not clear it;
- the plan contradicts the actual code in a way that changes observable behaviour;
- a step needs a file outside its Touch list, or a translation key absent from all four locales;
- a decision the phase file needs is not in the decisions table;
- a react-router export a step assumes is missing
  (`grep -c "<name>" node_modules/react-router/dist/development/index.d.ts`);
- a step would make `npm run dev` render a blank page at `/` — that is a regression even if the gate is
  green.

### OUT OF SCOPE

- Anything no step asks for. Collect it in `Noticed, untouched:` and move on. Do not fix, do not
  "while I'm here", do not refactor adjacent code.

### REPORT — per step, one block, nothing longer

```
Step <PHASE>.<M> — done | blocked
Touch:   <files>
Verify:  <command> → <result>
Accept:  <bullet> ✓ <evidence>   (one line each)
Noticed: <unrelated issues, untouched>
```

Then, once, at the end of the phase:

```
PHASE <PHASE> COMPLETE | BLOCKED
Files changed:  <paths>
Gate:           npm run gate → exit 0 | <failure>
Steps:          <k> done, <j> blocked
Invariants:     <tick the phase's own invariant checklist with evidence>
Operator checks:<numbered browser/measurement checklist for me to walk>
Noticed:        <accumulated untouched findings>
Suggested commit message:
  feat(49): <the phase title from the phase file's H1>

  Co-Authored-By: Claude Code <noreply@anthropic.com>
Next:           phase <PHASE+1> — stop here; I clear context before it.
```

Do not recap the plan, do not paste code you wrote, do not ask whether to continue between steps.

---

## Invocation

| Phase | Prompt to send |
| --- | --- |
| 1 | `Read docs/router-maximization/execution-prompt.md and execute it with PHASE=1.` |
| 2 | `Read docs/router-maximization/execution-prompt.md and execute it with PHASE=2.` |
| … | … |
| 9 | `Read docs/router-maximization/execution-prompt.md and execute it with PHASE=9.` |

Clearing context between phases is the point of the pattern: the saved file carries the standing
instructions, so the only thing that changes per phase is one number. Run phases 1 and 9 on a strong
model and 3, 4, 6 on a cheap one (00-index.md, "Division of labour").
