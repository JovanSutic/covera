import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, Check, Trash2 } from "lucide-react";
import { deleteReservationsById } from "@/api/generated/requests/services.gen";
import { withAuth } from "@/lib/api/api";
import { QUERY_ACTIONS } from "@/lib/api/queryKeys";
import type { ReservationRow } from "@/types/component.types";

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
  const [isDeleting, setIsDeleting] = useState(false);

  const now = Date.now();
  const checkInTime = new Date(reservation.checkInDatetime).getTime();
  const checkOutTime = new Date(reservation.checkOutDatetime).getTime();

  // Deletion logic: Allowed only before check-in time
  const isDeletable = Boolean(reservation.checkInDatetime) && checkInTime > now;

  // Proof Window calculation (defaults to 4 hours if proofWindowHours is not provided)
  const windowHours = reservation.proofWindowHours ?? 4;
  const proofWindowStartTime = checkInTime - windowHours * 60 * 60 * 1000;

  // Allowed from window start until checkout (or when already COVERED)
  const isPastCheckOut = Boolean(reservation.checkOutDatetime) && now > checkOutTime;
  const isTooEarly = now < proofWindowStartTime;

  const canTakeShots = !isPastCheckOut && !isTooEarly;

  // Tooltip helper to explain state clearly to host
  const getCameraTooltip = () => {
    if (reservation.status === "COVERED" || reservation.hasPhotoProof) {
      return "Inspection photos already submitted (COVERED)";
    }
    if (isPastCheckOut) {
      return "Cannot take inspection shots for past reservations";
    }
    if (isTooEarly) {
      const hoursUntilWindow = Math.ceil((proofWindowStartTime - now) / (1000 * 60 * 60));
      return `Inspection window opens ${windowHours}h before check-in (in ~${hoursUntilWindow}h)`;
    }
    return "Inspection window active! Click to capture photo proof";
  };

  const handleDelete = async () => {
    if (!isDeletable) return;
    try {
      setIsDeleting(true);
      const config = await withAuth();
      await deleteReservationsById({
        ...config,
        path: { id: reservation.id },
      });

      await queryClient.invalidateQueries({
        queryKey: [...QUERY_ACTIONS.RESERVATIONS_GET_BY_APARTMENT, apartmentId],
      });
    } catch {
      setIsDeleting(false);
      setIsConfirmingDelete(false);
    }
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
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-1 rounded bg-red-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors cursor-pointer"
            title="Confirm deletion"
          >
            {isDeleting ? "..." : <Check className="h-3 w-3" />}
            <span>Delete</span>
          </button>
          <button
            type="button"
            onClick={() => setIsConfirmingDelete(false)}
            className="rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-1 text-[11px] font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
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