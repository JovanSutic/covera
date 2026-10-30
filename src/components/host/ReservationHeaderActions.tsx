import { ClipboardPlus, Link as LinkIcon, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/Popover";
import { ConfirmActionButton } from "@/components/ConfirmationButton";
import { GuestInspectionMessage } from "./GuestInspectionMessage";
import { useReservationActions } from "@/hooks/useReservationActions";
import type { UseReservationActionsParams } from "@/hooks/useReservationActions";
import type { Inspection } from "@/api/generated/requests/types.gen";

interface ReservationHeaderActionsProps {
  reservation: UseReservationActionsParams["reservation"] & {
    inspection?: Inspection;
  };
  apartmentId: string;
  onDeleted: () => void;
}

/**
 * D16: the page-header rendering of the same actions the table's kebab holds. Both
 * read `useReservationActions`, so the mutations, the disable rules and the
 * invalidation exist once. The difference is markup only — the prep asks for
 * buttons here rather than icons.
 *
 * The camera action is deliberately ABSENT: on this page, taking proofs is the
 * Proof section's primary action. Rendering it in both places would give one
 * behaviour two triggers with two different disabled states.
 */
export function ReservationHeaderActions({
  reservation,
  apartmentId,
  onDeleted,
}: ReservationHeaderActionsProps) {
  const { t } = useTranslation("host");

  const {
    hasInspection,
    isDeletable,
    isPast,
    guestInspectionUrl,
    deleteMutation,
    createInspectionMutation,
  } = useReservationActions({
    reservation,
    apartmentId,
    inspectionId: reservation.inspection?.id ?? null,
    onDeleted,
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border ${
          hasInspection
            ? "text-gray-400 border-gray-200 dark:text-gray-500 dark:border-gray-800"
            : "text-gray-700 border-gray-300 dark:text-gray-300 dark:border-gray-700"
        }`}
      >
        <ClipboardPlus className="w-4 h-4 shrink-0" />
        {t("reservationActionsMenu.createInspection")}
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
        // Same reason as the table's kebab: `PopoverTrigger` is the click target, so a
        // disabled button inside one would still open. No Popover on this path.
        <button
          type="button"
          disabled
          title={t("reservationActionsCell.tooltip.copyMessagePast")}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-blue-200 dark:border-blue-800 text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <LinkIcon className="w-4 h-4 shrink-0" />
          {t("reservationActionsMenu.copyGuestMessage")}
        </button>
      ) : (
        hasInspection && (
          <Popover>
            {/* `PopoverTrigger` is itself a <div onClick={toggleOpen}> — the button
                inside it carries NO handler, exactly as phase 4's kebab menu does.
                A second onClick here would bubble and toggle twice. */}
            <PopoverTrigger>
              <button
                type="button"
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-blue-200 dark:border-blue-800 text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
              >
                <LinkIcon className="w-4 h-4 shrink-0" />
                {t("reservationActionsMenu.copyGuestMessage")}
              </button>
            </PopoverTrigger>
            <PopoverContent align="right">
              <GuestInspectionMessage
                guestName={reservation.guestName}
                guestInspectionUrl={guestInspectionUrl}
              />
            </PopoverContent>
          </Popover>
        )
      )}

      <div
        className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border ${
          isDeletable
            ? "text-rose-600 border-rose-200 dark:text-rose-400 dark:border-rose-900"
            : "text-gray-400 border-gray-200 dark:text-gray-500 dark:border-gray-800"
        }`}
      >
        <Trash2 className="w-4 h-4 shrink-0" />
        {t("reservationActionsMenu.delete")}
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
  );
}
