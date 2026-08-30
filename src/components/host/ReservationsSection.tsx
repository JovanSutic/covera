/* eslint-disable @typescript-eslint/no-explicit-any */
import Typography from "@/components/Typography";
import { DataTable } from "@/components/DataTable";
import { getReservationsApartmentByApartmentId } from "@/api/generated/requests/services.gen";
import { withAuth } from "@/lib/api/api";
import { QUERY_ACTIONS } from "@/lib/api/queryKeys";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { ColumnDef, ReservationRow } from "@/types/component.types";
import { ReservationActionsCell } from "./ReservationActionsCell";

interface ApartmentReservationsManagerProps {
  apartmentId: string;
  onOpenCreateReservation?: () => void;
  onSelectReservation?: (reservation: ReservationRow) => void;
}

const STATUS_BADGE_CLASSES: Record<string, string> = {
  PENDING_PROOF:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  COVERED:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  DISPUTED:
    "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  RESOLVED:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  CLOSED:
    "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700",
};

export function ApartmentReservationsManager({
  apartmentId,
  onOpenCreateReservation,
  onSelectReservation,
}: ApartmentReservationsManagerProps) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const {
    data: reservationsResponse,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [
      ...QUERY_ACTIONS.RESERVATIONS_GET_BY_APARTMENT,
      apartmentId,
      page,
      limit,
      "checkInDatetime",
      "asc",
    ],
    queryFn: async () => {
      const config = await withAuth();
      const response = await getReservationsApartmentByApartmentId({
        ...config,
        path: { apartmentId },
        query: {
          page,
          limit,
          sortBy: "checkInDatetime",
          order: "asc", // 'asc' puts nearest/earliest check-in dates first
        },
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
        className: "text-right w-36",
        accessorKey: (row) => (
          <ReservationActionsCell
            reservation={row}
            onSelectReservation={onSelectReservation}
            apartmentId={apartmentId}
          />
        ),
      },
    ],
    [apartmentId, onSelectReservation],
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
          <Typography
            type="h4"
            className="text-rose-700 dark:text-rose-400 mb-1"
          >
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
          pagination={{
            page,
            limit,
            total: reservationsResponse?.pagination.totalItems || 0,
            onPageChange: setPage,
            onLimitChange: (newLimit: number) => {
              setLimit(newLimit);
              setPage(1); // Reset to page 1 on limit change
            },
          }}
          emptyMessage={
            <div className="flex flex-col items-center justify-center py-4">
              <Typography
                type="h4"
                className="text-gray-700 dark:text-gray-300 mb-2"
              >
                No reservations found
              </Typography>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
                There are currently no bookings for this apartment. Click below
                to add your first guest reservation.
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
