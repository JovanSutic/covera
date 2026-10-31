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
 * The reservation page's general actions (prep §3, D17): three actions, one shape each,
 * all rendered through `ActionButton`, with delete going through `ConfirmButton`.
 *
 * The row WRAPS rather than scrolls. `overflow-x-auto` was doing two bad things:
 * introducing the scrollbar prep §3 reports, and clipping the absolutely-positioned
 * tooltip panels back to the strip's box — exactly the "confined with the wrapper"
 * complaint. Wrapping removes the clip and the scrollbar together.
 *
 * Every enable rule and every tooltip reason comes from
 * `getReservationActionAvailability` (D10) — the same table the table's menu reads.
 *
 * Delete carries no tooltip (prep §2): it is self-explanatory, and the info dot beside it
 * was noise. Every OTHER button's tooltip is the reason it is unavailable, or what it
 * does when it is.
 */
export function ReservationActionsBar({
  reservation,
  apartmentId,
  inspectionId,
  onDeleted,
}: ReservationActionsBarProps) {
  const { t } = useTranslation("host");

  const { rules, guestInspectionUrl, deleteMutation, createInspectionMutation } =
    useReservationActions({
      reservation,
      apartmentId,
      inspectionId,
      onDeleted,
    });

  const createLabel = t("reservationPage.actions.createInspection");
  const copyLabel = t("reservationPage.actions.copyGuestMessage");
  const deleteLabel = t("reservationPage.actions.delete");

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* D18: the confirmation step is retained from the previous plan; only the
          trigger's appearance changes — and `variant="success"` is why this confirm step
          is emerald rather than the delete pattern's rose (D32). */}
      <ConfirmButton
        className="shrink-0"
        variant="success"
        confirmLabel={t("reservationActionsCell.confirm.createLabel")}
        cancelLabel={t("reservationPage.actions.confirmCancel")}
        icon={<ClipboardPlus className="h-3 w-3" />}
        isLoading={createInspectionMutation.isPending}
        disabled={!rules.createInspection.enabled}
        onConfirm={() => createInspectionMutation.mutateAsync()}
      >
        <ActionButton
          variant="neutral"
          size="md"
          className="shrink-0"
          icon={<ClipboardPlus className="w-4 h-4 shrink-0" />}
          label={createLabel}
          disabled={!rules.createInspection.enabled}
          tooltip={t(rules.createInspection.tooltipKey ?? "")}
          tooltipLabel={createLabel}
        />
      </ConfirmButton>

      {/* The copy button is ALWAYS rendered (prep §7). A disabled button inside
          `PopoverTrigger` would still open the popover — the trigger div is the click
          target — so an unavailable copy action renders the same button outside one. */}
      {rules.copyMessage.enabled ? (
        <Popover>
          <PopoverTrigger>
            <ActionButton
              variant="neutral"
              size="md"
              className="shrink-0"
              icon={<LinkIcon className="w-4 h-4 shrink-0" />}
              label={copyLabel}
              tooltip={t(rules.copyMessage.tooltipKey ?? "")}
              tooltipLabel={copyLabel}
            />
          </PopoverTrigger>
          <PopoverContent align="left">
            <GuestInspectionMessage
              guestName={reservation.guestName}
              guestInspectionUrl={guestInspectionUrl}
            />
          </PopoverContent>
        </Popover>
      ) : (
        <ActionButton
          variant="neutral"
          size="md"
          className="shrink-0"
          icon={<LinkIcon className="w-4 h-4 shrink-0" />}
          label={copyLabel}
          disabled
          tooltip={t(rules.copyMessage.tooltipKey ?? "")}
          tooltipLabel={copyLabel}
        />
      )}

      {/* D4: styled exactly like the others — safety comes from the confirmation step,
          not from colour. NO tooltip (prep §2). `variant` defaults to `danger` on
          `ConfirmButton`, so the step itself is rose. */}
      <ConfirmButton
        className="shrink-0"
        confirmLabel={t("reservationActionsCell.confirm.deleteLabel")}
        cancelLabel={t("reservationPage.actions.confirmCancel")}
        icon={<Trash2 className="h-3 w-3" />}
        isLoading={deleteMutation.isPending}
        disabled={!rules.delete.enabled}
        onConfirm={() => deleteMutation.mutateAsync()}
      >
        <ActionButton
          variant="neutral"
          size="md"
          className="shrink-0"
          icon={<Trash2 className="w-4 h-4 shrink-0" />}
          label={deleteLabel}
          disabled={!rules.delete.enabled}
        />
      </ConfirmButton>
    </div>
  );
}
