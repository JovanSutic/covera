/* eslint-disable @typescript-eslint/no-explicit-any */
import Typography from "@/components/Typography";
import { getReservationsApartmentByApartmentId } from "@/api/generated/requests/services.gen";
import { withAuth } from "@/lib/api/api";
import { QUERY_ACTIONS } from "@/lib/api/queryKeys";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

interface ApartmentReservationsManagerProps {
  apartmentId: string;
  onOpenCreateReservation?: () => void;
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

  const reservations = useMemo(() => {
    if (!reservationsResponse) return [];
    // Adjust if API returns { data: [...] } array or direct array
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

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Loading State */}
      {isLoading && (
        <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-8 text-center bg-white dark:bg-transparent">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mb-2"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Loading reservations...
          </p>
        </div>
      )}

      {/* Error State */}
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

      {/* Empty State */}
      {!isLoading && !isError && reservations.length === 0 && (
        <div className="border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center bg-gray-50/50 dark:bg-gray-900/20">
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
      )}

      {/* Data Table */}
      {!isLoading && !isError && reservations.length > 0 && (
        <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-xs bg-white dark:bg-transparent">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3 font-semibold">Guest</th>
                  <th className="px-6 py-3 font-semibold">Check-In</th>
                  <th className="px-6 py-3 font-semibold">Check-Out</th>
                  <th className="px-6 py-3 font-semibold">Platform ID</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {reservations.map((res: any) => (
                  <tr
                    key={res.id}
                    className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {res.guestName}
                      </div>
                      {res.guestEmail && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {res.guestEmail}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatDate(res.checkInDatetime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatDate(res.checkOutDatetime)}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-500 dark:text-gray-400">
                      {res.platformReservationId || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          STATUS_BADGE_CLASSES[res.status] ||
                          "bg-gray-100 text-gray-800 border-gray-200"
                        }`}
                      >
                        {res.status?.replace(/_/g, " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}