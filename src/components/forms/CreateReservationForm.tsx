/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Input from "@/components/formItems/Input";
import Button from "@/components/formItems/Button";
import { withAuth } from "@/lib/api/api";
import { postReservations } from "@/api/generated/requests/services.gen";
import { QUERY_ACTIONS } from "@/lib/api/queryKeys";

// Formats current local date-time into 'YYYY-MM-THH:mm' required by datetime-local min attribute
const getMinDatetimeLocal = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
};

const isFutureDatetime = (val: string) => {
  if (!val) return true;
  return new Date(val).getTime() > Date.now();
};

const createReservationSchema = z
  .object({
    guestName: z
      .string()
      .min(1, "createReservationForm.validation.guestNameRequired"),
    guestEmail: z
      .string()
      .optional()
      .refine(
        (val) => !val || z.string().email().safeParse(val).success,
        "createReservationForm.validation.invalidEmail",
      ),
    platformReservationId: z.string().optional(),
    checkInDatetime: z
      .string()
      .min(1, "createReservationForm.validation.checkInRequired")
      .refine(
        isFutureDatetime,
        "createReservationForm.validation.checkInFuture",
      ),
    checkOutDatetime: z
      .string()
      .min(1, "createReservationForm.validation.checkOutRequired")
      .refine(
        isFutureDatetime,
        "createReservationForm.validation.checkOutFuture",
      ),
    alternativeCheckInDatetime: z
      .string()
      .optional()
      .refine(
        (val) => !val || isFutureDatetime(val),
        "createReservationForm.validation.altCheckInFuture",
      ),
    alternativeCheckOutDatetime: z
      .string()
      .optional()
      .refine(
        (val) => !val || isFutureDatetime(val),
        "createReservationForm.validation.altCheckOutFuture",
      ),
  })
  .refine(
    (data) => {
      if (!data.checkInDatetime || !data.checkOutDatetime) return true;
      return new Date(data.checkOutDatetime) > new Date(data.checkInDatetime);
    },
    {
      message: "createReservationForm.validation.checkOutAfterCheckIn",
      path: ["checkOutDatetime"],
    },
  )
  .refine(
    (data) => {
      if (!data.alternativeCheckInDatetime || !data.alternativeCheckOutDatetime)
        return true;
      return (
        new Date(data.alternativeCheckOutDatetime) >
        new Date(data.alternativeCheckInDatetime)
      );
    },
    {
      message: "createReservationForm.validation.altCheckOutAfterAltCheckIn",
      path: ["alternativeCheckOutDatetime"],
    },
  );

type CreateReservationFormValues = z.infer<typeof createReservationSchema>;

interface CreateReservationFormProps {
  onSuccess: () => void;
  isOpen: boolean;
  apartmentId: string;
}

const DEFAULT_FORM_VALUES: CreateReservationFormValues = {
  guestName: "",
  guestEmail: "",
  platformReservationId: "",
  checkInDatetime: "",
  checkOutDatetime: "",
  alternativeCheckInDatetime: "",
  alternativeCheckOutDatetime: "",
};

export default function CreateReservationForm({
  onSuccess,
  isOpen,
  apartmentId,
}: CreateReservationFormProps) {
  const { t } = useTranslation("host");
  const [showAlternativeDates, setShowAlternativeDates] = useState(false);
  const [minDatetime, setMinDatetime] = useState(getMinDatetimeLocal());

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting, isValid },
  } = useForm<CreateReservationFormValues>({
    resolver: zodResolver(createReservationSchema),
    defaultValues: DEFAULT_FORM_VALUES,
    mode: "onChange",
  });

  const selectedCheckIn = watch("checkInDatetime");
  const selectedAltCheckIn = watch("alternativeCheckInDatetime");

  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (formData: CreateReservationFormValues) => {
      const config = await withAuth();

      const body: Record<string, any> = {
        apartmentId,
        guestName: formData.guestName,
        checkInDatetime: new Date(formData.checkInDatetime).toISOString(),
        checkOutDatetime: new Date(formData.checkOutDatetime).toISOString(),
      };

      if (formData.guestEmail?.trim()) {
        body.guestEmail = formData.guestEmail.trim();
      }

      if (formData.platformReservationId?.trim()) {
        body.platformReservationId = formData.platformReservationId.trim();
      }

      if (showAlternativeDates) {
        if (formData.alternativeCheckInDatetime) {
          body.alternativeCheckInDatetime = new Date(
            formData.alternativeCheckInDatetime,
          ).toISOString();
        }
        if (formData.alternativeCheckOutDatetime) {
          body.alternativeCheckOutDatetime = new Date(
            formData.alternativeCheckOutDatetime,
          ).toISOString();
        }
      }

      const response = await postReservations({
        ...config,
        body: body as any,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...QUERY_ACTIONS.RESERVATIONS_GET_BY_APARTMENT, apartmentId],
      });

      toast.success(t("createReservationForm.toast.success"));
      reset(DEFAULT_FORM_VALUES);
      setShowAlternativeDates(false);
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      console.error("Mutation failed:", error);
      toast.error(
        error?.error?.message || t("createReservationForm.toast.error"),
      );
    },
  });

  const onSubmit = (formData: CreateReservationFormValues) => {
    mutate(formData);
  };

  const toggleAlternativeDates = () => {
    if (showAlternativeDates) {
      setValue("alternativeCheckInDatetime", "");
      setValue("alternativeCheckOutDatetime", "");
    }
    setShowAlternativeDates((prev) => !prev);
  };

  useEffect(() => {
    if (isOpen) {
      setMinDatetime(getMinDatetimeLocal());
    } else {
      reset(DEFAULT_FORM_VALUES);
      setShowAlternativeDates(false);
    }
  }, [isOpen, reset]);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-5 w-full max-w-xl bg-white dark:bg-transparent"
    >
      <Input
        label={t("createReservationForm.labels.guestName")}
        type="text"
        placeholder={t("createReservationForm.placeholders.guestName")}
        error={errors.guestName?.message ? t(errors.guestName.message) : undefined}
        {...register("guestName")}
      />

      <Input
        label={t("createReservationForm.labels.guestEmail")}
        type="email"
        placeholder={t("createReservationForm.placeholders.guestEmail")}
        error={
          errors.guestEmail?.message ? t(errors.guestEmail.message) : undefined
        }
        {...register("guestEmail")}
      />

      <Input
        label={t("createReservationForm.labels.platformReservationId")}
        type="text"
        placeholder={t(
          "createReservationForm.placeholders.platformReservationId",
        )}
        error={
          errors.platformReservationId?.message
            ? t(errors.platformReservationId.message)
            : undefined
        }
        {...register("platformReservationId")}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label={t("createReservationForm.labels.checkInDatetime")}
          type="datetime-local"
          min={minDatetime}
          error={
            errors.checkInDatetime?.message
              ? t(errors.checkInDatetime.message)
              : undefined
          }
          {...register("checkInDatetime")}
        />

        <Input
          label={t("createReservationForm.labels.checkOutDatetime")}
          type="datetime-local"
          min={selectedCheckIn || minDatetime}
          error={
            errors.checkOutDatetime?.message
              ? t(errors.checkOutDatetime.message)
              : undefined
          }
          {...register("checkOutDatetime")}
        />
      </div>

      <div>
        <button
          type="button"
          onClick={toggleAlternativeDates}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors cursor-pointer"
        >
          {showAlternativeDates
            ? t("createReservationForm.toggleAlternativeDates.hide")
            : t("createReservationForm.toggleAlternativeDates.show")}
        </button>

        {showAlternativeDates && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 animate-in fade-in duration-150">
            <Input
              label={t(
                "createReservationForm.labels.alternativeCheckInDatetime",
              )}
              type="datetime-local"
              min={minDatetime}
              error={
                errors.alternativeCheckInDatetime?.message
                  ? t(errors.alternativeCheckInDatetime.message)
                  : undefined
              }
              {...register("alternativeCheckInDatetime")}
            />

            <Input
              label={t(
                "createReservationForm.labels.alternativeCheckOutDatetime",
              )}
              type="datetime-local"
              min={selectedAltCheckIn || minDatetime}
              error={
                errors.alternativeCheckOutDatetime?.message
                  ? t(errors.alternativeCheckOutDatetime.message)
                  : undefined
              }
              {...register("alternativeCheckOutDatetime")}
            />
          </div>
        )}
      </div>

      <Button
        type="submit"
        className="w-full py-3 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={isSubmitting || isPending || !isValid}
        isLoading={isPending}
      >
        {isSubmitting || isPending
          ? t("createReservationForm.button.submitting")
          : t("createReservationForm.button.submit")}
      </Button>
    </form>
  );
}