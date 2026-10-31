# Reservation page upgrade 2 — spec and decisions

Follow-up to `upgrade-prep-1.md`. That file's bullet numbering (§1–§8) is used throughout the
plan. Where the prep's *diagnosis* is wrong but its *ask* is right, the plan says so — see
"Corrections" below.

## Intent

Eight defects in the reservation surface, in three groups:

1. **Two broken actions.** Deleting from the reservation table's kebab menu navigates to the
   reservation instead of deleting, and the reservation page's delete button carries a tooltip
   that explains nothing.
2. **Tooltips are invisible or absent.** The actions bar scrolls, so its absolutely-positioned
   tooltips are clipped by `overflow-x-auto`; the copy-guest-message button has none at all; and
   `ActionButton` renders them desktop-only.
3. **The enable rules are wrong.** Create-inspection-link enables when the backend will refuse
   it, the copy button disappears rather than disabling, the proof-photos button is disabled
   even when photos exist, and alternative check-in/out accept any future date rather than
   capping at 8h past the booked time.

The governing rule across all of it, stated in prep §7: **no hide and show — enable and
disable.**

## Corrections to the prep's diagnosis

These change what gets built, so they are recorded rather than silently absorbed.

| Prep | Prep says | Actually true |
| --- | --- | --- |
| §1 | "use ConfirmButton locally in the ReservationActionsMenu" | `ReservationActionsMenu.tsx:114` **already** uses `ConfirmButton`. The real defect is that `PopoverContent` portals to `document.body`, and React propagates synthetic events through the **React** tree — so a click on any menu item bubbles to the `DataTable` row's `onClick`. The row's `event.target.closest("[data-row-click-stop]")` guard fails, because the clicked node is a child of `<body>`, not of the opt-out div. The fix is to carry the opt-out attribute into the portal. |
| §5 | "always enabled if there are photos … or if this reservation is covered" | Deriving from `photoCount > 0` alone is already what the code does. The gap is the second half of the sentence: `COVERED` implies proof exists, so it must enable the button too — including before the inspection read resolves. |
| §6 | "enabled only if the link doesn't exist and status is covered and check-in is in the future" | The backend's guard (`covera-hono/src/core/utils/db-validator.ts:236-279`) requires **four** things: no existing inspection, `status === "COVERED"`, **`hasPhotoProof`**, and now ≤ effective check-in + 1h. Dropping `hasPhotoProof` would leave a button that 400s. |
| §6 | — | `hasPhotoProof` and `COVERED` are set **only** by `src/lib/api/submitPhotoProofs.ts:107-113`, which runs at the end of the inspection guide — the page behind this very button. A reservation created in this app starts `PENDING_PROOF` / `false`. The enabled rule therefore matches the backend exactly but will not enable for app-created reservations; that is a backend lifecycle question, not a UI one. Out of scope here. |

## Behaviour

| Surface | Component | Data | States |
| --- | --- | --- | --- |
| `/host/apartments/:id/reservations/:reservationId` | `ReservationActionsBar` | `useReservationActions` | four buttons, each enabled/disabled per the rule table, each with a reason tooltip except delete |
| same | `ReservationProofSection` | `useInspection` + `reservation.status` | two controls, always present; photo control enabled when `photoCount > 0 \|\| status === "COVERED"` |
| same | `ReservationTimeSection` | `alternativeDatesSchema` factory | alternative inputs capped at booked time + 8h, client-side `max` + zod |
| apartment page table | `ReservationActionsMenu` | `useReservationActions` | copy row always present, disabled per rules; delete confirms in place and does **not** navigate |

i18n namespace: `host`, four locales (`en`, `de`, `tr`, `sr-Latn`).

## Data

No new endpoints. Everything comes from `ReservationWithInspection`
(`status`, `hasPhotoProof`, `alternativeCheckInDatetime`) and `getProofWindowState`, both
already read by these surfaces.

## Invariants this must not break

- 1, 2, 4, 5, 6, 7 from `.claude/skills/feature-kickoff/SKILL.md` — generated API untouched, no
  hardcoded strings, routes in `App.tsx`, query keys from `QUERY_ACTIONS`, network via
  `withAuth()`/`publicApi()`, mutations invalidate what they changed.
- 10. **One computation of the window.** `getProofWindowState` is called once per surface with a
  render-time `now`. The new action-rule helper calls it *inside* itself — callers must not pass
  a separately-computed window, and must not call `Date.now()` a second time.
- 11. **Tooltips are always-on.** No `hidden sm:` gate on the tooltip affordance anywhere.
- 12. **`data-row-click-stop` must survive a portal.** Any `PopoverContent` rendered inside a
  `DataTable` row carries `data-row-click-stop`, in addition to its in-DOM container.

## Out of scope

- The `hasPhotoProof` lifecycle (backend).
- Tooltips on the Proof section's own buttons — prep §4 scoped the info affordance to the
  *general action* buttons, and `ReservationProofSection`'s explanation is its body line.
- Deleting the now-unused `reservationActionsCell.tooltip.*` keys from the locale files.
- `ReservationHeaderActions.tsx` / `ConfirmationButton.tsx` — dead code, not on any route.

## Decisions

All approved by the operator on 2026-10-31.

| ID | Decision | Rationale | Status |
| --- | --- | --- | --- |
| D1 | Fix §1 by passing `data-row-click-stop` to `PopoverContent` (outer menu **and** nested copy popover), not by restructuring the menu. | The portal is the cause; the confirm flow is already correct. Rejected: `stopPropagation` on every menu item — it would break the click-outside handler in `Popover.tsx`. | Approved |
| D2 | Create-inspection enabled rule = `before effective check-in AND !hasInspection AND status === "COVERED" AND hasPhotoProof`. | Exactly the backend guard, so an enabled button cannot 400. | Approved |
| D3 | Delete confirmation keeps its existing behaviour (delete + `onDeleted` → apartment page + invalidate); only the tooltip is removed. | §2's navigation and refetch already work — verified. | Approved |
| D4 | Tooltips render at **all** widths; the bar wraps (`flex-wrap`) instead of scrolling (`overflow-x-auto`). | `overflow-x-auto` is what clips the panel. Wrapping removes the clip and the scrollbar §3 complains about. | Approved |
| D5 | `InfoTooltip`'s panel opens **above** the trigger (`bottom-full mb-1`), anchored `left-0`, arrow flipped to the panel's bottom edge. | §4: "on the right of the button but on top" with a small gap. Above is also safe on the last row of a list. | Approved |
| D6 | `ActionButton` wraps button + tooltip in `<span className="inline-flex shrink-0 items-center gap-1">`; the bar's row gap becomes `gap-3`. | §4 requires the button→its-tooltip gap to be clearly smaller than the button→next-button gap. | Approved |
| D7 | The copy button is always rendered; enabled only when `before check-in AND hasInspection AND status === "COVERED"`. | §7 verbatim, and it is the same rule on both surfaces (§7 scope extended per operator). | Approved |
| D8 | Every bar button is disabled when `now > effective check-in` (alternative-first), via the helper's `isBeforeEffectiveCheckIn`. | §7's second sentence; `getProofWindowState` already resolves the alternative precedence. | Approved |
| D9 | `canViewPhotos = photoCount > 0 \|\| reservation.status === "COVERED"`. | §5, second half. `reservation.status` is already a prop — no new read, no second clock. | Approved |
| D10 | The action rule table is a **pure helper** in `src/lib/helpers/reservationActions.ts` returning booleans + i18n **keys**; the hook and both surfaces consume it. | One rule table, two surfaces. Tooltip precedence is the part that silently drifts otherwise. | Approved |
| D11 | Both surfaces use the `reservationPage.actions.tooltip.*` keys; the menu stops using `reservationActionsCell.tooltip.*` for its rows. | One source for one rule. The old keys stay in the files, unused (out of scope to remove). | Approved |
| D12 | The menu's copy row becomes always-present-but-disabled, matching the bar. | Operator extended §7's scope to both surfaces. | Approved |
| D13 | Alternative dates: replace `alternativeDatesSchema` with a factory `createAlternativeDatesSchema({ checkInDatetime, checkOutDatetime })`; migrate its 10 existing tests. | §8 is upper-bound-only and page-editor-only (operator), so the cap needs the booked times as input. A second parallel schema would be the drift §8 exists to prevent. | Approved |
| D14 | Cap is `booked + 8h`, inclusive; enforced by zod **and** the input's `max` attribute. | §8: "the values in the date input should also permit this as well". | Approved |
| D15 | Phase 1 (tooltip primitives) has no test step. | Purely presentational CSS; a jsdom render of a positioned box proves nothing and rots. Every other phase has testable logic and does carry one. | Approved |
| D16 | Four phases; docs committed separately from code; one commit per phase. | Repo has no hooks and no CI, so the gate is the only guard — keep phase boundaries observable. | Approved |

## Open questions

None.
