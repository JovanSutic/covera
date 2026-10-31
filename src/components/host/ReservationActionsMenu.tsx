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
 * enabled row shows the pointer, and a disabled one shows `cursor-not-allowed` and
 * no hover background. The previous version rendered a `<span>` label next to a
 * second clickable control inside a `px-3 py-2` row, so every row looked clickable
 * while only part of it was — and the icon appeared twice.
 *
 * The two removed entries are *take proofs* and *create guest inspection link*
 * (prep §1). Neither capability is lost: both are on the reservation page, which is
 * where the guest link is created with a confirmation step and where taking proofs
 * is the Proof section's own control. What the table keeps is the read-and-triage
 * pair: copy guest message, and delete.
 *
 * No `InfoTooltip` here. The trigger is a 16px icon with no room for a second one,
 * and D6a makes tooltips a desktop-only affordance that cannot be placed inside a
 * table cell without clipping.
 */
const ITEM_CLASSES =
  "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent cursor-pointer transition-colors";

export function ReservationActionsMenu({
  reservation,
  apartmentId,
}: ReservationActionsMenuProps) {
  const { t } = useTranslation("host");

  const {
    hasInspection,
    isDeletable,
    isPast,
    guestInspectionUrl,
    deleteMutation,
  } = useReservationActions({
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
            {isPast ? (
              // `PopoverTrigger` is the click target, not the button inside it, so a
              // disabled button nested in one would still open the popover. A past
              // stay renders the same row without the nested popover.
              <button
                type="button"
                disabled
                title={t("reservationActionsCell.tooltip.copyMessagePast")}
                className={ITEM_CLASSES}
              >
                <LinkIcon className="w-4 h-4 shrink-0" />
                {t("reservationActionsMenu.copyGuestMessage")}
              </button>
            ) : (
              hasInspection && (
                <Popover>
                  <PopoverTrigger>
                    <button
                      type="button"
                      title={t("reservationActionsCell.tooltip.copyMessage")}
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
              )
            )}

            {/* Delete is the one row that keeps its confirmation step, now the
                shared primitive (D3). `ConfirmButton` renders the row itself as the
                trigger and swaps in the Yes/No pair in place, so the row is a single
                button until it is asked to confirm. The cancel label is the same
                `reservationPage.actions.confirmCancel` key the page's bar uses. */}
            <ConfirmButton
              confirmLabel={t("reservationActionsCell.confirm.deleteLabel")}
              cancelLabel={t("reservationPage.actions.confirmCancel")}
              disabled={isPast || !isDeletable}
              isLoading={deleteMutation.isPending}
              onConfirm={() => deleteMutation.mutateAsync()}
              className="w-full px-3 py-2"
            >
              <button
                type="button"
                disabled={isPast || !isDeletable}
                title={
                  isPast
                    ? t("reservationActionsCell.tooltip.cannotDeletePast")
                    : isDeletable
                      ? t("reservationActionsCell.tooltip.delete")
                      : t("reservationActionsCell.tooltip.cannotDelete")
                }
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
