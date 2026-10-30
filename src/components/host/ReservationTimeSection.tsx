/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import Input from "@/components/formItems/Input";
import Button from "@/components/formItems/Button";
import Typography from "@/components/Typography";
import { patchReservationsById } from "@/api/generated/requests/services.gen";
import { withAuth } from "@/lib/api/api";
import { QUERY_ACTIONS } from "@/lib/api/queryKeys";
import {
  alternativeDatesSchema,
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from "@/lib/validations/reservationDates";
import type { AlternativeDatesValues } from "@/lib/validations/reservationDates";

interface ReservationTimeSectionProps {
  reservationId: string;
  apartmentId: string;
  checkInDatetime: string;
  checkOutDatetime: string;
  alternativeCheckInDatetime: string | null;
  alternativeCheckOutDatetime: string | null;
  /** The page's answer: alternative dates are editable only before the effective check-in. */
  canEdit: boolean;
}

function formatInstant(
  iso: string | null | undefined,
  fallback: string,
): string {
  if (!iso) return fallback;

  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return fallback;

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/**
 * The Time section, with the alternative dates editable in place (D12). The page
 * passes `canEdit`; this component does not re-derive it — the effective check-in
 * is `getProofWindowState`'s business, and the page already has that answer
 * (invariant 9).
 */
export function ReservationTimeSection({
  reservationId,
  apartmentId,
  checkInDatetime,
  checkOutDatetime,
  alternativeCheckInDatetime,
  alternativeCheckOutDatetime,
  canEdit,
}: ReservationTimeSectionProps) {
  const { t } = useTranslation("host");
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const emptyValues: AlternativeDatesValues = {
    alternativeCheckInDatetime: toDatetimeLocalValue(alternativeCheckInDatetime),
    alternativeCheckOutDatetime: toDatetimeLocalValue(
      alternativeCheckOutDatetime,
    ),
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AlternativeDatesValues>({
    resolver: zodResolver(alternativeDatesSchema),
    defaultValues: emptyValues,
    mode: "onChange",
  });

  // The reservation is the source of truth for the fields, so a refetch must not
  // leave stale text behind. `isEditing` is deliberately NOT a dependency:
  // including it would reset the form to the server values the moment the host
  // opened the editor, discarding what they had typed.
  useEffect(() => {
    reset({
      alternativeCheckInDatetime: toDatetimeLocalValue(
        alternativeCheckInDatetime,
      ),
      alternativeCheckOutDatetime: toDatetimeLocalValue(
        alternativeCheckOutDatetime,
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alternativeCheckInDatetime, alternativeCheckOutDatetime, reset]);

  const saveMutation = useMutation({
    mutationFn: async (values: AlternativeDatesValues) => {
      const config = await withAuth();

      // No cast: `UpdateReservation` makes every field optional, so a two-field
      // partial is already a legal body. (`CreateReservationForm` casts because
      // the CREATE type marks its dates required-nullable — different type,
      // different problem.)
      const response = await patchReservationsById({
        ...config,
        path: { id: reservationId },
        body: {
          alternativeCheckInDatetime: fromDatetimeLocalValue(
            values.alternativeCheckInDatetime,
          ),
          alternativeCheckOutDatetime: fromDatetimeLocalValue(
            values.alternativeCheckOutDatetime,
          ),
        },
      });
      return response.data;
    },
    onSuccess: () => {
      // Both keys: the list's row shows the effect of the effective dates, and the
      // detail entry is what this page renders.
      queryClient.invalidateQueries({
        queryKey: [...QUERY_ACTIONS.RESERVATIONS_GET_BY_APARTMENT, apartmentId],
      });
      queryClient.invalidateQueries({
        queryKey: [...QUERY_ACTIONS.RESERVATIONS_GET_ID, reservationId],
      });
      toast.success(t("reservationPage.time.toast.saveSuccess"));
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast.error(
        error?.error?.message || t("reservationPage.time.toast.saveError"),
      );
    },
  });

  const onSubmit = (values: AlternativeDatesValues) => {
    saveMutation.mutate(values);
  };

  const fieldRow = (
    labelKey: string,
    value: string | null | undefined,
    emptyKey: string,
  ) => (
    <div>
      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        {t(labelKey)}
      </dt>
      <dd className="text-sm text-gray-900 dark:text-gray-100 mt-1">
        {formatInstant(value, t(emptyKey))}
      </dd>
    </div>
  );

  return (
    <section className="border border-gray-200 dark:border-gray-800 rounded-xl p-5 bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between gap-4 mb-4">
        <Typography type="h3">{t("reservationPage.time.title")}</Typography>

        {canEdit && !isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer"
          >
            {t("reservationPage.time.editAlternatives")}
          </button>
        )}
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fieldRow(
          "reservationPage.time.checkIn",
          checkInDatetime,
          "reservationPage.notAvailable",
        )}
        {fieldRow(
          "reservationPage.time.checkOut",
          checkOutDatetime,
          "reservationPage.notAvailable",
        )}
      </dl>

      {isEditing ? (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t("reservationPage.time.alternativeCheckIn")}
              type="datetime-local"
              error={
                errors.alternativeCheckInDatetime?.message
                  ? t(errors.alternativeCheckInDatetime.message)
                  : undefined
              }
              {...register("alternativeCheckInDatetime")}
            />

            <Input
              label={t("reservationPage.time.alternativeCheckOut")}
              type="datetime-local"
              error={
                errors.alternativeCheckOutDatetime?.message
                  ? t(errors.alternativeCheckOutDatetime.message)
                  : undefined
              }
              {...register("alternativeCheckOutDatetime")}
            />
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" isLoading={saveMutation.isPending}>
              {saveMutation.isPending
                ? t("reservationPage.time.saving")
                : t("reservationPage.time.save")}
            </Button>

            <button
              type="button"
              onClick={() => {
                reset(emptyValues);
                setIsEditing(false);
              }}
              disabled={saveMutation.isPending}
              className="text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-40 cursor-pointer transition-colors"
            >
              {t("reservationPage.time.cancel")}
            </button>
          </div>
        </form>
      ) : (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5 pt-5 border-t border-gray-100 dark:border-gray-800">
          {fieldRow(
            "reservationPage.time.alternativeCheckIn",
            alternativeCheckInDatetime,
            "reservationPage.time.noAlternative",
          )}
          {fieldRow(
            "reservationPage.time.alternativeCheckOut",
            alternativeCheckOutDatetime,
            "reservationPage.time.noAlternative",
          )}
        </dl>
      )}
    </section>
  );
}
