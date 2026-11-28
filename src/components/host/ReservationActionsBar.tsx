import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";

import { ActionButton } from "@/components/shared/ActionButton";
import { ConfirmButton } from "@/components/shared/ConfirmButton";
import { useReservationActions } from "@/hooks/useReservationActions";
import type { UseReservationActionsParams } from "@/hooks/useReservationActions";

interface ReservationActionsBarProps {
  reservation: UseReservationActionsParams["reservation"];
  apartmentId: string;
  inspectionId: string | null;
  onDeleted: () => void;
}

/**
 * The reservation page's general actions (prep §3, D17): delete only. The copy action
 * lives in `CopyMessageSection` and the create-inspection action in
 * `ReservationLinksSection` (D17) — both are access links, so they belong in the
 * access-links section. What remains is rendered through `ActionButton`, with delete
 * going through `ConfirmButton`.
 *
 * The row WRAPS rather than scrolls. `overflow-x-auto` was doing two bad things:
 * introducing the scrollbar prep §3 reports, and clipping the tooltip panels back to the strip's
 * box — exactly the "confined with the wrapper" complaint. Wrapping removes the clip and the
 * scrollbar together.
 *
 * The clip was the half that wrapping fixed. The other half — a panel that fits the page but is
 * anchored past its edge — is `TooltipPanel`'s (prep §4): it measures against the
 * `[data-tooltip-host]` box `PageLayout` carries and flips or clamps the panel so it cannot cross
 * it. Neither half is sufficient alone: wrapping without clamping still overflows on a phone, and
 * clamping without wrapping still gets clipped.
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

  const { rules, deleteMutation } = useReservationActions({
    reservation,
    apartmentId,
    inspectionId,
    onDeleted,
  });

  const deleteLabel = t("reservationPage.actions.delete");

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* The copy action moved to the page's `CopyMessageSection`, which shows the
          message in place instead of behind a popover. The create-inspection action moved
          to `ReservationLinksSection` (D17), beside the special-access grant — both are
          access links, so they belong in the access-links section. The table's kebab menu
          still owns its own copy popover. */}

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
