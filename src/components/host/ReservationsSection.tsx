/* eslint-disable @typescript-eslint/no-explicit-any */
import Typography from "@/components/Typography";
import { DataTable } from "@/components/DataTable";
import { getReservationsApartmentByApartmentId } from "@/api/generated/requests/services.gen";
import { withAuth } from "@/lib/api/api";
import { QUERY_ACTIONS } from "@/lib/api/queryKeys";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { ColumnDef } from "@/types/component.types";

interface ApartmentReservationsManagerProps {
  apartmentId: string;
  onOpenCreateReservation?: () => void;
  onSelectReservation?: (reservation: ReservationRow) => void;
}

interface ReservationRow {
  id: string;
  guestName: string;
  guestEmail?: string | null;
  checkInDatetime: string;
  checkOutDatetime: string;
  platformReservationId?: string | null;
  status: string;
  // If your API provides shots directly on the reservation object:
  // shots?: any[];
}

const STATUS_BADGE_CLASSES: Record<string, string> = {
  UPCOMING: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  CHECK_IN_DUE: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  ACTIVE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  CHECK_OUT_DUE: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800",
  CLOSED: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700",
  DISPUTED: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-800",
};

export function ApartmentReservationsManager({
  apartmentId,
  onOpenCreateReservation,
  onSelectReservation,
}: ApartmentReservationsManagerProps) {
  const {
    data: reservationsResponse,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [...QUERY_ACTIONS.RESERVATIONS_GET_BY_APARTMENT, apartmentId],
    queryFn: async () => {
      const config = await withAuth();
      const response = await getReservationsApartmentByApartmentId({
        ...config,
        path: { apartmentId },
      });
      return response.data;
    },
    enabled: !!apartmentId,
  });

  const reservations = useMemo<ReservationRow[]>(() => {
    if (!reservationsResponse) return [];
    return Array.isArray(reservationsResponse)
      ? reservationsResponse
      : (reservationsResponse as any)?.data || [];
  }, [reservationsResponse]);

  const formatDate = (isoString: string) => {
    if (!isoString) return "-";
    return new Date(isoString).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const columns = useMemo<ColumnDef<ReservationRow>[]>(
    () => [
      {
        header: "Guest",
        accessorKey: (row) => (
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {row.guestName}
            </div>
            {row.guestEmail && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {row.guestEmail}
              </div>
            )}
          </div>
        ),
      },
      {
        header: "Check-In",
        accessorKey: (row) => formatDate(row.checkInDatetime),
      },
      {
        header: "Check-Out",
        accessorKey: (row) => formatDate(row.checkOutDatetime),
      },
      {
        header: "Platform ID",
        className: "font-mono text-xs text-gray-500 dark:text-gray-400",
        accessorKey: (row) => row.platformReservationId || "-",
      },
      {
        header: "Status",
        accessorKey: (row) => (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
              STATUS_BADGE_CLASSES[row.status] ||
              "bg-gray-100 text-gray-800 border-gray-200"
            }`}
          >
            {row.status?.replace(/_/g, " ")}
          </span>
        ),
      },
      {
        header: "",
        className: "text-right w-12",
        accessorKey: (row) => (
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => onSelectReservation?.(row)}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
              title="View Inspection Shots"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
                />
              </svg>
            </button>
          </div>
        ),
      },
    ],
    [onSelectReservation]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Typography type="h3">Reservations</Typography>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage guest stays and view upcoming bookings for this apartment.
          </p>
        </div>
        <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
          <button
            onClick={onOpenCreateReservation}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-gray-900 border border-transparent rounded-lg shadow-sm hover:bg-gray-800 transition-colors cursor-pointer dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
          >
            + New Reservation
          </button>
        </div>
      </div>

      {isError && !isLoading && (
        <div className="border border-rose-200 dark:border-rose-900/50 rounded-xl p-6 text-center bg-rose-50/50 dark:bg-rose-950/20">
          <Typography type="h4" className="text-rose-700 dark:text-rose-400 mb-1">
            Failed to load reservations
          </Typography>
          <p className="text-sm text-rose-500 dark:text-rose-400">
            {(error as any)?.message || "An unexpected error occurred."}
          </p>
        </div>
      )}

      {!isError && (
        <DataTable
          data={reservations}
          columns={columns}
          isLoading={isLoading}
          emptyMessage={
            <div className="flex flex-col items-center justify-center py-4">
              <Typography type="h4" className="text-gray-700 dark:text-gray-300 mb-2">
                No reservations found
              </Typography>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
                There are currently no bookings for this apartment. Click below to add your first guest reservation.
              </p>
              <button
                onClick={onOpenCreateReservation}
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-900 dark:text-white bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                + New Reservation
              </button>
            </div>
          }
        />
      )}
    </div>
  );
}