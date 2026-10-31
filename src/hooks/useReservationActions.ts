import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  deleteReservationsById,
  postInspections,
} from "@/api/generated/requests/services.gen";
import { withAuth } from "@/lib/api/api";
import { QUERY_ACTIONS } from "@/lib/api/queryKeys";
import { getProofWindowState } from "@/lib/helpers/proofWindow";
import type { ProofWindowSubject } from "@/lib/helpers/proofWindow";
import { appPaths, buildPath } from "@/lib/router";

/**
 * D16: ONE owner of the four reservation actions, shared by the table's kebab and
 * the reservation page's header. It owns the mutations, the invalidation, the
 * disable rules and the tooltips; each surface owns only its own markup. Without
 * this the two renderings would be two copies of the same behaviour, drifting
 * apart the first time one of them is touched.
 *
 * It deliberately does NOT own the guide-page URL. That path is defined in phase 5
 * (step 5.5) and there is exactly one place that builds it — the page that links to
 * it. A `guidePath` here would be a forward reference into a phase that has not
 * landed, which is the one thing this phase cannot afford.
 */
export interface UseReservationActionsParams {
  reservation: ProofWindowSubject & { id: string; guestName: string };
  apartmentId: string;
  /** The guest-inspection id, when one exists — it is the shared link's only source. */
  inspectionId?: string | null;
  /** Called after a successful delete. The page navigates away; the table does nothing. */
  onDeleted?: () => void;
}

export function useReservationActions({
  reservation,
  apartmentId,
  inspectionId,
  onDeleted,
}: UseReservationActionsParams) {
  const { t } = useTranslation("host");
  const queryClient = useQueryClient();

  // D9: the window answer comes from the helper, never from arithmetic here.
  // `Date.now()` is captured at render, matching the inline version this replaced.
  const now = Date.now();
  const window = getProofWindowState(reservation, now);

  const hasInspection = Boolean(inspectionId);

  // Deletion is allowed strictly before the effective check-in — the rule the
  // inline cell had, now read off the helper's own effective value.
  const isDeletable = window.checkInTime !== null && window.checkInTime > now;

  // D4/D5: a reservation whose stay is over offers no actions. The answer is the helper's
  // (D2), so the table's menu and the page's header compute it the same way and can never
  // disagree — and neither re-derives it from a check-out date.
  const isPast = window.isPast;

  const guestInspectionUrl = inspectionId
    ? buildPath(appPaths.inspection, { id: inspectionId })
    : "";

  const invalidateReservations = () => {
    queryClient.invalidateQueries({
      queryKey: [...QUERY_ACTIONS.RESERVATIONS_GET_BY_APARTMENT, apartmentId],
    });
    // The single reservation too: after a delete the detail entry is a stale 404
    // waiting to be read, and after a create its `inspection` field has appeared.
    queryClient.invalidateQueries({
      queryKey: [...QUERY_ACTIONS.RESERVATIONS_GET_ID, reservation.id],
    });
  };

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const config = await withAuth();
      await deleteReservationsById({ ...config, path: { id: reservation.id } });
    },
    onSuccess: () => {
      invalidateReservations();
      toast.success(t("reservationActionsCell.toast.deleteSuccess"));
      onDeleted?.();
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(
        error?.error?.message || t("reservationActionsCell.toast.deleteError"),
      );
    },
  });

  const createInspectionMutation = useMutation({
    mutationFn: async () => {
      const config = await withAuth();
      const response = await postInspections({
        ...config,
        body: { reservationId: reservation.id },
      });
      return response.data;
    },
    onSuccess: () => {
      invalidateReservations();
      toast.success(t("reservationActionsCell.toast.createSuccess"));
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(
        error?.error?.message || t("reservationActionsCell.toast.createError"),
      );
    },
  });

  /** The camera button's tooltip, derived from the helper's state — never recomputed. */
  const takeShotsTooltip = (): string => {
    switch (window.state) {
      case "ALREADY_SUBMITTED":
        return t("reservationActionsCell.tooltip.hasSubmittedProofs");
      case "EXPIRED":
        return t("reservationActionsCell.tooltip.isTooLate");
      case "TOO_EARLY":
        return t("reservationActionsCell.tooltip.isTooEarly", {
          windowHours: window.windowHours,
          hoursUntilWindow: window.hoursUntilWindow,
        });
      case "NOT_STARTED":
        return t("reservationActionsCell.tooltip.notStarted");
      case "OPEN":
        return t("reservationActionsCell.tooltip.active");
    }
  };

  return {
    window,
    hasInspection,
    isDeletable,
    isPast,
    guestInspectionUrl,
    takeShotsTooltip,
    deleteMutation,
    createInspectionMutation,
  };
}
