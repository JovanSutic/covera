/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";

import Typography from "@/components/Typography";
import { DataTable } from "@/components/DataTable";
import { AccessLink } from "@/components/router/AccessLink";
import { useReservations } from "@/lib/api/queries/reservations";
import { appPaths, buildPath } from "@/lib/router";
import type { ColumnDef, ReservationRow } from "@/types/component.types";
import { ReservationActionsMenu } from "./ReservationActionsMenu";

interface ReservationsTableProps {
  apartmentId: string;
  onOpenCreateReservation?: () => void;
  onTakeProofs?: (reservation: ReservationRow) => void;
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

/**
 * D15: `ReservationsSection`'s view and query, extracted and renamed. It owns the
 * page/limit state and the read — the same `useReservations` call the route
 * prefetches, so this is a cache read, not a second request.
 */
export function ReservationsTable({
  apartmentId,
  onOpenCreateReservation,
  onTakeProofs,
}: ReservationsTableProps) {
  const { t } = useTranslation("host");
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const {
    data: reservationsResponse,
    isLoading,
    isError,
    error,
  } = useReservations({ apartmentId, page, limit });

  const isPastDate = (dateString: string): boolean => {
    if (!dateString) return false;
    return new Date(dateString).getTime() < Date.now();
  };

  const reservations = useMemo<ReservationRow[]>(() => {
    if (!reservationsResponse) return [];
    return Array.isArray(reservationsResponse)
      ? reservationsResponse
      : (reservationsResponse as any)?.data || [];
  }, [reservationsResponse]);

  const formatDate = useCallback((isoString: string) => {
    if (!isoString) return "-";
    return new Date(isoString).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  // D14: the row click. `AccessLink` in the guest cell is what gives the row a real
  // <a> — keyboard, middle-click and the 100 ms hover preload — while this handler
  // covers the rest of the row's width.
  const openReservation = useCallback(
    (reservation: ReservationRow) => {
      navigate(
        buildPath(appPaths.hostReservation, {
          id: apartmentId,
          reservationId: reservation.id,
        }),
      );
    },
    [apartmentId, navigate],
  );

  const columns = useMemo<ColumnDef<ReservationRow>[]>(
    () => [
      {
        header: t("apartmentReservationsManager.columns.guest"),
        accessorKey: (row) => (
          <div>
            <AccessLink
              to={appPaths.hostReservation}
              params={{ id: apartmentId, reservationId: row.id }}
              className="font-medium text-gray-900 dark:text-gray-100 hover:underline"
            >
              {row.guestName}
            </AccessLink>
            {row.guestEmail && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {row.guestEmail}
              </div>
            )}
          </div>
        ),
      },
      {
        header: t("apartmentReservationsManager.columns.checkIn"),
        accessorKey: (row) => formatDate(row.checkInDatetime),
      },
      {
        header: t("apartmentReservationsManager.columns.checkOut"),
        accessorKey: (row) => formatDate(row.checkOutDatetime),
      },
      {
        header: t("apartmentReservationsManager.columns.platformId"),
        className: "font-mono text-xs text-gray-500 dark:text-gray-400",
        accessorKey: (row) => row.platformReservationId || "-",
      },
      {
        header: t("apartmentReservationsManager.columns.status"),
        accessorKey: (row) => {
          const statusLabel = t(
            `apartmentReservationsManager.status.${row.status}`,
            { defaultValue: row.status?.replace(/_/g, " ") },
          );

          return (
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                STATUS_BADGE_CLASSES[row.status] ||
                "bg-gray-100 text-gray-800 border-gray-200"
              }`}
            >
              {statusLabel}
            </span>
          );
        },
      },
      {
        header: "",
        className: "text-right w-20",
        accessorKey: (row) => (
          <ReservationActionsMenu
            reservation={row}
            apartmentId={apartmentId}
            onTakeProofs={(reservation) => onTakeProofs?.(reservation)}
          />
        ),
      },
    ],
    [t, formatDate, apartmentId, onTakeProofs],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Typography type="h3">
            {t("apartmentReservationsManager.title")}
          </Typography>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t("apartmentReservationsManager.description")}
          </p>
        </div>
        <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={onOpenCreateReservation}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-gray-900 border border-transparent rounded-lg shadow-sm hover:bg-gray-800 transition-colors cursor-pointer dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
          >
            {t("apartmentReservationsManager.newReservationButton")}
          </button>
        </div>
      </div>

      {isError && !isLoading && (
        <div className="border border-rose-200 dark:border-rose-900/50 rounded-xl p-6 text-center bg-rose-50/50 dark:bg-rose-950/20">
          <Typography
            type="h4"
            className="text-rose-700 dark:text-rose-400 mb-1"
          >
            {t("apartmentReservationsManager.error.title")}
          </Typography>
          <p className="text-sm text-rose-500 dark:text-rose-400">
            {(error as any)?.message ||
              t("apartmentReservationsManager.error.defaultMessage")}
          </p>
        </div>
      )}

      {!isError && (
        <DataTable
          data={reservations}
          columns={columns}
          isLoading={isLoading}
          isRowDisabled={(reservation) => isPastDate(reservation.checkOutDatetime)}
          onRowClick={openReservation}
          pagination={{
            page,
            limit,
            total: reservationsResponse?.pagination.totalItems || 0,
            onPageChange: setPage,
            onLimitChange: (newLimit: number) => {
              setLimit(newLimit);
              setPage(1);
            },
          }}
          emptyMessage={
            <div className="flex flex-col items-center justify-center py-4">
              <Typography
                type="h4"
                className="text-gray-700 dark:text-gray-300 mb-2"
              >
                {t("apartmentReservationsManager.empty.title")}
              </Typography>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
                {t("apartmentReservationsManager.empty.description")}
              </p>
              <button
                type="button"
                onClick={onOpenCreateReservation}
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-900 dark:text-white bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                {t("apartmentReservationsManager.newReservationButton")}
              </button>
            </div>
          }
        />
      )}
    </div>
  );
}
