import { Link as LinkIcon, MoreVertical, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/Popover";
import { ConfirmButton } from "@/components/shared/ConfirmButton";
import { GuestInspectionMessage } from "./GuestInspectionMessage";
import { useReservationActions } from "@/hooks/useReservationActions";
import type { ReservationRow } from "@/types/component.types";

interface ReservationActionsMenuProps {
  reservation: ReservationRow;
  apartmentId: string;
}

/**
 * Prep §1. Each entry is ONE button: the icon and the label highlight together, an
 * enabled row shows the pointer, and a disabled one shows `cursor-not-allowed` and no
 * hover background.
 *
 * Prep §1's second symptom — clicking delete navigating to the reservation instead of
 * deleting — was NOT the confirmation step, which `ConfirmButton` already provided. It
 * was the popover's portal; `PopoverContent` now carries `data-row-click-stop` itself,
 * and `ReservationActionsMenu.test.tsx` guards it.
 *
 * Prep §7's rule — no hide and show, only enable and disable — applies to this menu too
 * (operator decision), so the copy row is always rendered. Both rows' reasons come from
 * the shared rule table, which is what stops this menu and the page's bar disagreeing.
 *
 * No `InfoTooltip` here. The trigger is a 16px icon with no room for a second one, and
 * the panel would be clipped inside a table cell; the rows use native `title`, which is
 * always present rather than width-gated (invariant 11).
 */
const ITEM_CLASSES =
  "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent cursor-pointer transition-colors";

export function ReservationActionsMenu({
  reservation,
  apartmentId,
}: ReservationActionsMenuProps) {
  const { t } = useTranslation("host");

  const { rules, guestInspectionUrl, deleteMutation } = useReservationActions({
    reservation,
    apartmentId,
    inspectionId: reservation.inspection?.id ?? null,
  });

  return (
    <div
      className="flex items-center justify-end"
      // D14: the whole cell opts out of the row click, so opening the menu never
      // navigates to the reservation the menu is about.
      data-row-click-stop
    >
      <Popover>
        <PopoverTrigger>
          <button
            type="button"
            title={t("reservationActionsMenu.triggerTitle")}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </PopoverTrigger>

        <PopoverContent align="right">
          <div className="w-64 py-1">
            {/* Always rendered, enabled or not (prep §7). A disabled button inside
                `PopoverTrigger` would still open the panel — the trigger div is the click
                target — so an unavailable copy action renders the same row with no
                popover around it. */}
            {rules.copyMessage.enabled ? (
              <Popover>
                <PopoverTrigger>
                  <button
                    type="button"
                    title={t(rules.copyMessage.tooltipKey ?? "")}
                    className={ITEM_CLASSES}
                  >
                    <LinkIcon className="w-4 h-4 shrink-0" />
                    {t("reservationActionsMenu.copyGuestMessage")}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="left">
                  <GuestInspectionMessage
                    guestName={reservation.guestName}
                    guestInspectionUrl={guestInspectionUrl}
                  />
                </PopoverContent>
              </Popover>
            ) : (
              <button
                type="button"
                disabled
                title={t(rules.copyMessage.tooltipKey ?? "")}
                className={ITEM_CLASSES}
              >
                <LinkIcon className="w-4 h-4 shrink-0" />
                {t("reservationActionsMenu.copyGuestMessage")}
              </button>
            )}

            {/* Delete is the one row that keeps its confirmation step, the shared
                primitive (D3). `ConfirmButton` renders the row itself as the trigger and
                swaps in the Yes/No pair in place. No `title` — prep §2: deleting is
                self-explanatory. */}
            <ConfirmButton
              confirmLabel={t("reservationActionsCell.confirm.deleteLabel")}
              cancelLabel={t("reservationPage.actions.confirmCancel")}
              disabled={!rules.delete.enabled}
              isLoading={deleteMutation.isPending}
              onConfirm={() => deleteMutation.mutateAsync()}
              className="w-full px-3 py-2"
            >
              <button
                type="button"
                disabled={!rules.delete.enabled}
                className={ITEM_CLASSES}
              >
                <Trash2 className="w-4 h-4 shrink-0" />
                {t("reservationActionsMenu.delete")}
              </button>
            </ConfirmButton>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
