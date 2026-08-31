import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Check, Trash2 } from "lucide-react";
import { deleteReservationsById } from "@/api/generated/requests/services.gen";
import { withAuth } from "@/lib/api/api";
import { QUERY_ACTIONS } from "@/lib/api/queryKeys";
import type { ReservationRow } from "@/types/component.types";
import { toast } from "sonner";

export function ReservationActionsCell({
  reservation,
  onSelectReservation,
  apartmentId,
}: {
  reservation: ReservationRow;
  onSelectReservation?: (reservation: ReservationRow) => void;
  apartmentId: string;
}) {
  const queryClient = useQueryClient();
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const now = Date.now();

  // Resolve effective check-in time (prioritize alternative check-in if present)
  const effectiveCheckIn =
    reservation.alternativeCheckInDatetime || reservation.checkInDatetime;
  const checkInTime = effectiveCheckIn ? new Date(effectiveCheckIn).getTime() : 0;

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
        error?.message || "Failed to delete reservation. Please try again."
      );
    },
    onSettled: () => {
      setIsConfirmingDelete(false);
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
        (proofWindowStartTime - now) / (1000 * 60 * 60)
      );
      return `Inspection window opens ${windowHours}h before check-in (in ~${hoursUntilWindow}h)`;
    }
    return "Inspection window active! Click to capture photo proof";
  };

  return (
    <div className="flex items-center justify-end gap-1">
      {/* Inspection Shots Action Button */}
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

      {/* Delete Confirmation Logic */}
      {isConfirmingDelete ? (
        <div className="flex items-center gap-1 animate-in fade-in duration-150">
          <button
            type="button"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="flex items-center gap-1 rounded bg-red-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors cursor-pointer"
            title="Confirm deletion"
          >
            {deleteMutation.isPending ? "..." : <Check className="h-3 w-3" />}
            <span>Delete</span>
          </button>
          <button
            type="button"
            onClick={() => setIsConfirmingDelete(false)}
            disabled={deleteMutation.isPending}
            className="rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-1 text-[11px] font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => isDeletable && setIsConfirmingDelete(true)}
          disabled={!isDeletable}
          className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title={
            isDeletable
              ? "Delete reservation"
              : "Cannot delete reservations that have already started"
          }
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}