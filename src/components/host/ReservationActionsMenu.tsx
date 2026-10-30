import { Camera, ClipboardPlus, Link as LinkIcon, MoreVertical, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/Popover";
import { ConfirmActionButton } from "@/components/ConfirmationButton";
import { GuestInspectionMessage } from "./GuestInspectionMessage";
import { useReservationActions } from "@/hooks/useReservationActions";
import type { ReservationRow } from "@/types/component.types";

interface ReservationActionsMenuProps {
  reservation: ReservationRow;
  apartmentId: string;
  onTakeProofs: (reservation: ReservationRow) => void;
}

const ITEM_CLASSES =
  "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent cursor-pointer transition-colors";

/**
 * D13/D16: the table's action cell. The kebab replaces the four inline icons the
 * prep asks to retire; the actions themselves are unchanged, because they come
 * from the shared hook. Each keeps its current enabled/disabled rule and tooltip
 * (`reservationActionsCell.*`), which is what the prep asks for.
 */
export function ReservationActionsMenu({
  reservation,
  apartmentId,
  onTakeProofs,
}: ReservationActionsMenuProps) {
  const { t } = useTranslation("host");

  const {
    window,
    hasInspection,
    isDeletable,
    isPast,
    guestInspectionUrl,
    takeShotsTooltip,
    deleteMutation,
    createInspectionMutation,
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
            <button
              type="button"
              disabled={isPast || !window.canTakeShots}
              title={
                isPast
                  ? t("reservationActionsCell.tooltip.stayPast")
                  : takeShotsTooltip()
              }
              onClick={() => window.canTakeShots && onTakeProofs(reservation)}
              className={ITEM_CLASSES}
            >
              <Camera className="w-4 h-4 shrink-0" />
              {t("reservationActionsMenu.takeProofs")}
            </button>

            {/* D13: confirmation is RETAINED, not dropped. ConfirmActionButton swaps
                its icon for a Yes/No pair in place; at w-64 that fits when it carries
                no confirmMessage. Keeping it is what makes this a faithful extraction
                of the inline cell rather than a behaviour change smuggled into a
                layout change. */}
            <div className="px-3 py-2 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                <ClipboardPlus className="w-4 h-4 shrink-0" />
                {t("reservationActionsMenu.createInspection")}
              </span>
              <ConfirmActionButton
                icon={<ClipboardPlus className="w-4 h-4" />}
                variant="success"
                confirmLabel={t("reservationActionsCell.confirm.createLabel")}
                disabled={isPast || hasInspection}
                title={
                  isPast
                    ? t("reservationActionsCell.tooltip.hasInspectionPast")
                    : hasInspection
                      ? t("reservationActionsCell.tooltip.hasInspection")
                      : t("reservationActionsCell.tooltip.createInspection")
                }
                isLoading={createInspectionMutation.isPending}
                onConfirm={() => createInspectionMutation.mutateAsync()}
              />
            </div>

            {isPast ? (
              // A past stay has no guest message to copy, and `PopoverTrigger` is the
              // click target, not this button — so a disabled button inside a Popover
              // would still open it. This renders the same item without one.
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
                    <button type="button" className={ITEM_CLASSES}>
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

            <div className="px-3 py-2 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2.5 text-sm text-rose-600 dark:text-rose-400">
                <Trash2 className="w-4 h-4 shrink-0" />
                {t("reservationActionsMenu.delete")}
              </span>
              <ConfirmActionButton
                icon={<Trash2 className="w-4 h-4" />}
                variant="danger"
                confirmLabel={t("reservationActionsCell.confirm.deleteLabel")}
                disabled={isPast || !isDeletable}
                title={
                  isPast
                    ? t("reservationActionsCell.tooltip.cannotDeletePast")
                    : isDeletable
                      ? t("reservationActionsCell.tooltip.delete")
                      : t("reservationActionsCell.tooltip.cannotDelete")
                }
                isLoading={deleteMutation.isPending}
                onConfirm={() => deleteMutation.mutateAsync()}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
