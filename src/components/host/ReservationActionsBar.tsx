import { useTranslation } from "react-i18next";
import { ClipboardPlus, Link as LinkIcon, Trash2 } from "lucide-react";

import { ActionButton } from "@/components/shared/ActionButton";
import { ConfirmButton } from "@/components/shared/ConfirmButton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/Popover";
import { GuestInspectionMessage } from "./GuestInspectionMessage";
import { useReservationActions } from "@/hooks/useReservationActions";
import type { UseReservationActionsParams } from "@/hooks/useReservationActions";

interface ReservationActionsBarProps {
  reservation: UseReservationActionsParams["reservation"];
  apartmentId: string;
  inspectionId: string | null;
  onDeleted: () => void;
}

/**
 * The reservation page's general actions (prep §3, D17): three actions, one shape
 * each, all rendered through `ActionButton`, with delete going through
 * `ConfirmButton`.
 *
 * There is no "take photo proofs" here, deliberately — that action belongs to the
 * Proof section, and rendering it twice would give one behaviour two triggers with
 * two different disabled states. The previous plan's D16 made the same call.
 *
 * On mobile this is a horizontally scrolling strip (D19), so the tooltips are
 * desktop-only: the `InfoTooltip` panel is absolutely positioned and would be
 * clipped by the strip's overflow, and an info dot on every button is noise on a
 * phone anyway (D6a). The BUTTONS are always rendered — only the explanation is
 * desktop-only.
 *
 * Every button here is `variant="neutral"` / `size="md"` (D31). Prep §3 asks for
 * buttons that "look exactly the same, icon and then text, same color", and colour
 * is the only thing that can make two identical shapes read as different weights.
 * The one colour on the page is the confirm step: rose for delete, emerald for
 * create — which is also what keeps delete safe without being pre-red (D4).
 */
export function ReservationActionsBar({
  reservation,
  apartmentId,
  inspectionId,
  onDeleted,
}: ReservationActionsBarProps) {
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
    inspectionId,
    onDeleted,
  });

  // Each tooltip is the mutually exclusive NEXT reason the action is unavailable,
  // which is what makes the precedence below load-bearing.
  const createInspectionTooltip = isPast
    ? t("reservationPage.actions.tooltip.hasInspectionPast")
    : hasInspection
      ? t("reservationPage.actions.tooltip.hasInspection")
      : t("reservationPage.actions.tooltip.createInspection");

  const copyTooltip = isPast
    ? t("reservationPage.actions.tooltip.copyMessagePast")
    : t("reservationPage.actions.tooltip.copyGuestMessage");

  const deleteTooltip = isPast
    ? t("reservationPage.actions.tooltip.cannotDeletePast")
    : isDeletable
      ? t("reservationPage.actions.tooltip.delete")
      : t("reservationPage.actions.tooltip.cannotDelete");

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {/* D18: the confirmation step is retained from the previous plan; only the
          trigger's appearance changes — and `variant="success"` is why this confirm
          step is emerald rather than the delete pattern's rose (D32). */}
      <ConfirmButton
        className="shrink-0"
        variant="success"
        confirmLabel={t("reservationActionsCell.confirm.createLabel")}
        cancelLabel={t("reservationPage.actions.confirmCancel")}
        icon={<ClipboardPlus className="h-3 w-3" />}
        isLoading={createInspectionMutation.isPending}
        disabled={isPast || hasInspection}
        onConfirm={() => createInspectionMutation.mutateAsync()}
      >
        <ActionButton
          variant="neutral"
          size="md"
          className="shrink-0"
          icon={<ClipboardPlus className="w-4 h-4 shrink-0" />}
          label={t("reservationPage.actions.createInspection")}
          disabled={isPast || hasInspection}
          tooltip={createInspectionTooltip}
          tooltipLabel={t("reservationPage.actions.createInspection")}
        />
      </ConfirmButton>

      {/* A disabled button inside `PopoverTrigger` would still open the popover —
          the trigger div is the click target — so a past stay renders the same
          button outside a popover instead. */}
      {isPast ? (
        <ActionButton
          variant="neutral"
          size="md"
          className="shrink-0"
          icon={<LinkIcon className="w-4 h-4 shrink-0" />}
          label={t("reservationPage.actions.copyGuestMessage")}
          disabled
        />
      ) : (
        hasInspection && (
          <Popover>
            <PopoverTrigger>
              <ActionButton
                variant="neutral"
                size="md"
                icon={<LinkIcon className="w-4 h-4 shrink-0" />}
                label={t("reservationPage.actions.copyGuestMessage")}
                tooltip={copyTooltip}
                tooltipLabel={t("reservationPage.actions.copyGuestMessage")}
              />
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

      {/* D4: styled exactly like the others — safety comes from the confirmation
          step, not from colour. D6b keeps the info tooltip out of the way while
          that step is showing, which is this button's only difference. `variant`
          defaults to `danger` on `ConfirmButton`, so the step itself is rose. */}
      <ConfirmButton
        className="shrink-0"
        confirmLabel={t("reservationActionsCell.confirm.deleteLabel")}
        cancelLabel={t("reservationPage.actions.confirmCancel")}
        icon={<Trash2 className="h-3 w-3" />}
        isLoading={deleteMutation.isPending}
        disabled={isPast || !isDeletable}
        onConfirm={() => deleteMutation.mutateAsync()}
      >
        <ActionButton
          variant="neutral"
          size="md"
          className="shrink-0"
          icon={<Trash2 className="w-4 h-4 shrink-0" />}
          label={t("reservationPage.actions.delete")}
          disabled={isPast || !isDeletable}
          tooltip={deleteTooltip}
          tooltipLabel={t("reservationPage.actions.delete")}
        />
      </ConfirmButton>
    </div>
  );
}
