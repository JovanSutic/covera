import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, ClipboardPlus, Trash2 } from "lucide-react";
import {
  deleteReservationsById,
  postInspections,
} from "@/api/generated/requests/services.gen";
import { withAuth } from "@/lib/api/api";
import { QUERY_ACTIONS } from "@/lib/api/queryKeys";
import type { ReservationRow } from "@/types/component.types";
import { toast } from "sonner";
import { ConfirmActionButton } from "../ConfirmationButton";

export function ReservationActionsCell({
  reservation,
  onSelectReservation,
  onCreateGuestInspection,
  apartmentId,
}: {
  reservation: ReservationRow;
  onSelectReservation?: (reservation: ReservationRow) => void;
  onCreateGuestInspection?: (reservation: ReservationRow) => void;
  apartmentId: string;
}) {
  const queryClient = useQueryClient();

  const now = Date.now();

  // Resolve effective check-in time (prioritize alternative check-in if present)
  const effectiveCheckIn =
    reservation.alternativeCheckInDatetime || reservation.checkInDatetime;
  const checkInTime = effectiveCheckIn
    ? new Date(effectiveCheckIn).getTime()
    : 0;

  // 1. Deletion logic: Allowed strictly before check-in time
  const isDeletable = Boolean(checkInTime) && checkInTime > now;

  // 2. Photo Proof Window Evaluation
  const windowHours = reservation.proofWindowHours ?? 4;
  const proofWindowStartTime = checkInTime - windowHours * 60 * 60 * 1000;

  // Extension cutoff: 1 hour post check-in time
  const maxAllowedTime = checkInTime + 1 * 60 * 60 * 1000;

  const hasSubmittedProofs =
    Boolean(reservation.hasPhotoProof) || reservation.status === "COVERED";

  const isTooEarly = Boolean(checkInTime) && now < proofWindowStartTime;
  const isTooLate = Boolean(checkInTime) && now > maxAllowedTime;

  // Rule execution: Active window, post window cutoff, & proof status check
  const canTakeShots =
    Boolean(checkInTime) && !hasSubmittedProofs && !isTooEarly && !isTooLate;

  // Delete Reservation Mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const config = await withAuth();
      await deleteReservationsById({
        ...config,
        path: { id: reservation.id },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...QUERY_ACTIONS.RESERVATIONS_GET_BY_APARTMENT, apartmentId],
      });
      toast.success("Reservation deleted successfully!");
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(
        error?.message || "Failed to delete reservation. Please try again.",
      );
    },
  });

  // Create Guest Inspection Mutation
  const createInspectionMutation = useMutation({
    mutationFn: async () => {
      const config = await withAuth();
      const response = await postInspections({
        ...config,
        body: {
          reservationId: reservation.id,
        },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...QUERY_ACTIONS.RESERVATIONS_GET_BY_APARTMENT, apartmentId],
      });
      toast.success("Guest inspection session created!");
      onCreateGuestInspection?.(reservation);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(
        error?.message || "Failed to create guest inspection. Please try again.",
      );
    },
  });

  const getCameraTooltip = (): string => {
    if (hasSubmittedProofs) {
      return "Inspection photos have already been submitted";
    }
    if (isTooLate) {
      return "Inspection window has closed (expired 1 hour past check-in)";
    }
    if (isTooEarly) {
      const hoursUntilWindow = Math.ceil(
        (proofWindowStartTime - now) / (1000 * 60 * 60),
      );
      return `Inspection window opens ${windowHours}h before check-in (in ~${hoursUntilWindow}h)`;
    }
    return "Inspection window active! Click to capture photo proof";
  };

  return (
    <div className="flex items-center justify-end gap-1">
      {/* 1. Host Photo Proof Button */}
      <button
        type="button"
        onClick={() => canTakeShots && onSelectReservation?.(reservation)}
        disabled={!canTakeShots}
        title={getCameraTooltip()}
        className={`p-1.5 rounded-lg transition-all duration-150 cursor-pointer ${
          canTakeShots
            ? "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:hover:bg-amber-900/70 border border-amber-300 dark:border-amber-700 shadow-xs animate-pulse"
            : "text-gray-400 hover:text-gray-600 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400 disabled:cursor-not-allowed"
        }`}
      >
        <Camera className="w-4 h-4" />
      </button>

      {/* 2. Create Inspection Flow (Green Variant) */}
      <ConfirmActionButton
        icon={<ClipboardPlus className="w-4 h-4" />}
        variant="success"
        confirmLabel="Create"
        confirmMessage="Create guest inspection?"
        title="Generate new guest inspection link"
        isLoading={createInspectionMutation.isPending}
        onConfirm={() => createInspectionMutation.mutateAsync()}
      />

      {/* 3. Delete Action (Red Variant) */}
      <ConfirmActionButton
        icon={<Trash2 className="w-4 h-4" />}
        variant="danger"
        confirmLabel="Delete"
        confirmMessage="Delete reservation?"
        disabled={!isDeletable}
        isLoading={deleteMutation.isPending}
        title={
          isDeletable
            ? "Delete reservation"
            : "Cannot delete reservations that have already started"
        }
        onConfirm={() => deleteMutation.mutateAsync()}
      />
    </div>
  );
}