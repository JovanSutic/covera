# Inspection guide upgrade

Status: APPROVED

## Intent

Five upgrades to the photo-proof experience, taken from
[`inspection-guide-upgrade-prep.md`](./inspection-guide-upgrade-prep.md), the operator's own brief.

The photo strip currently highlights only the step sequential progress stopped at, so a host who taps
back into an already-captured step has no visual signal that what is on screen is not where the flow
resumes. The step panel prints the shot's instruction as a paragraph, which has no room for a long
instruction and wastes the screen for a short one. The confirmation screen is not a step, so once the
last photo is taken there is no way back to it — and no way to return to it after going back to retake
a photo. Tooltips on the reservation page overflow the page wrapper and break the layout, badly on a
phone. And the tree carries components nothing imports.

## Behaviour

| # | Route | Component | Guard | Data (query key) | States | i18n ns |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `/apartments/:apartmentId/inspection/:reservationId` | `PhotoStripItem` | public-by-design (`inspectionGuide`) | none | four ring states: current / active / both / neither | `assets` |
| 2 | same | `ShotStepPanel` | same | none | instruction present / absent; trigger open / closed | `assets` |
| 3 | same | `InspectionGuideFlow` + `GuideReviewScreen` + `PhotoStripItem` | same | none | confirmation is the cursor / a photo step is the cursor | `assets` |
| 4 | `/apartments/:id/reservations/:reservationId` | `InfoTooltip`, `TooltipPanel` | host (`requireRoleGuard("host")`) | none (presentational) | placement computed; no measurable host in jsdom | `host` |
| 5 | all | — | — | — | six files deleted; `npm run gate` green | — |

Row 1–3 states in full:

- **cursor is a photo step, host is on it** → emerald ring (current)
- **cursor is elsewhere, host is viewing this captured step** → orange ring (active)
- **cursor is elsewhere and this is the cursor's step** → emerald ring (current wins)
- **all other items** → no ring

Row 3 states in full:

- **some photo still pending** → no confirmation; `GuideReviewScreen` is not rendered
- **every photo captured, cursor on the last photo** → `Next` is enabled and advances the cursor onto the confirmation step; the hint is gone
- **every photo captured, cursor on the confirmation step** → `GuideReviewScreen` renders, the strip's `✓` item carries the current ring, and `Next` is not offered
- **host taps a captured strip item while the cursor is on the confirmation** → that photo shows, `Go to current step` appears, and it returns to the confirmation

## Data

none. Every upgrade is presentational or local state. No generated request function, no `QUERY_ACTIONS`
entry, no `api:generate` re-run. The one new module with logic (`tooltipPlacement.ts`) is pure.

## Invariants this must not break

Link: `.claude/skills/feature-kickoff/SKILL.md` §"Invariants". Restated as checks:

1. `git status --porcelain src/api/generated/` → empty.
2. Every new key lands in all four of `public/locales/{en,de,tr,sr-Latn}/assets.json`. There are two:
   `shotGuide.strip.confirmItem` and `shotGuide.strip.confirmTitle`.
3. No new `VITE_`-prefixed variable. This feature adds none.
4. Routes live in `src/lib/router/routes/*.ts` (not `src/App.tsx`, which mounts the router only). No
   route changes here.
5. Query keys come from `QUERY_ACTIONS`. This feature adds no query key.
6. Network calls go through `withAuth()` / `publicApi()`. This feature adds no network call.
7. No mutation is added, so nothing new needs invalidating.
8. **Feature-specific.** `guideFlow.ts` remains the only place that decides where the host is in the
   flow (invariant 10 of that module). `PhotoStripItem`, `GuideReviewScreen` and `InspectionGuideFlow`
   compare nothing themselves; they render what the helper returned.
9. **Feature-specific.** The confirmation step occupies `cursorIndex === shots.length`. That is the
   only index for which `shots[cursorIndex]` is `undefined`, and `InspectionGuideFlow` must branch on
   the cursor before dereferencing it.
10. **Feature-specific.** `guideFlow.ts`'s existing exports keep their signatures. `p1.md` adds
    `advanceCursor` wiring only; it does not rename or re-shape an existing function.

## Out of scope

- Changing `previous`-style backward navigation. The strip is still the only way back, and
  `advanceCursor` still never moves backwards.
- Making `InfoTooltip` or `DescriptionTooltip` reachable on touch by adding a click-driven popover.
  The operator chose "opens on hover/focus"; a tap that focused the trigger once already reveals the
  panel through `group-focus-within` on touch, and a click-driven rewrite is a separate feature.
- Any tooltip on the `/reservations/:id` page that does not already exist. This feature fixes the
  placement of the ones that are there; it adds none.
- Deleting unused *exports* (`parseDateTime`, `publicApi`, prop-type exports). Operator-chosen:
  files only.
- Deleting the `--passWithNoTests` flag from `npm run gate` (a stale note from the router feature).
- `ShotStudioFlow` / `ShotStudioModal`, which are still reachable from `IndividualApartment`.

## Open questions

None. Every choice is in [`inspection-guide-upgrade.decisions.md`](./inspection-guide-upgrade.decisions.md).
