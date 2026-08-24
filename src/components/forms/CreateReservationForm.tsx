/* eslint-disable @typescript-eslint/no-explicit-any */
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import Input from "@/components/formItems/Input";
import Select from "@/components/formItems/Select";
import Button from "@/components/formItems/Button";
import { withAuth } from "@/lib/api/api";
import { postReservations } from "@/api/generated/requests/services.gen";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_ACTIONS } from "@/lib/api/queryKeys";
import { toast } from "sonner";
import { useEffect, useMemo } from "react";
import type { SelectOption } from "@/types/component.types";

const RESERVATION_STATUSES = [
  "UPCOMING",
  "CHECK_IN_DUE",
  "ACTIVE",
  "CHECK_OUT_DUE",
  "CLOSED",
  "DISPUTED",
] as const;

const createReservationSchema = z
  .object({
    guestName: z.string().min(1, "Guest name is required"),
    guestEmail: z
      .string()
      .optional()
      .refine(
        (val) => !val || z.string().email().safeParse(val).success,
        "Please enter a valid email address",
      ),
    platformReservationId: z.string().optional(),
    checkInDatetime: z.string().min(1, "Check-in date & time is required"),
    checkOutDatetime: z.string().min(1, "Check-out date & time is required"),
    status: z.enum(RESERVATION_STATUSES, {
      message: "Please select a valid status",
    }),
    proofWindowHours: z
      .string()
      .optional()
      .refine(
        (val) => !val || (!isNaN(Number(val)) && Number(val) > 0),
        "Window must be a positive number of hours",
      ),
  })
  .refine(
    (data) => {
      if (!data.checkInDatetime || !data.checkOutDatetime) return true;
      return new Date(data.checkOutDatetime) > new Date(data.checkInDatetime);
    },
    {
      message: "Check-out date must be strictly after Check-in date",
      path: ["checkOutDatetime"],
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
  status: "UPCOMING",
  proofWindowHours: "4",
};

export default function CreateReservationForm({
  onSuccess,
  isOpen,
  apartmentId,
}: CreateReservationFormProps) {
  const { t } = useTranslation("reservations");

  const statusOptions: SelectOption[] = useMemo(
    () =>
      RESERVATION_STATUSES.map((status) => ({
        value: status,
        label: t(`statuses.${status}`, status.replace(/_/g, " ")),
      })),
    [t],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isValid },
  } = useForm<CreateReservationFormValues>({
    resolver: zodResolver(createReservationSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  });

  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (formData: CreateReservationFormValues) => {
      const config = await withAuth();

      const response = await postReservations({
        ...config,
        body: {
          apartmentId,
          guestName: formData.guestName,
          guestEmail: formData.guestEmail || null,
          platformReservationId: formData.platformReservationId || null,
          checkInDatetime: new Date(formData.checkInDatetime).toISOString(),
          checkOutDatetime: new Date(formData.checkOutDatetime).toISOString(),
          status: formData.status,
          proofWindowHours: formData.proofWindowHours
            ? parseInt(formData.proofWindowHours, 10)
            : 4,
        },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...QUERY_ACTIONS.RESERVATIONS_GET_BY_APARTMENT, apartmentId],
      });

      toast.success("Reservation created successfully!");
      reset(DEFAULT_FORM_VALUES);
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      console.error("Mutation failed:", error);
      toast.error(
        error?.error?.message || "An error occurred creating the reservation.",
      );
    },
  });

  const onSubmit = (formData: CreateReservationFormValues) => {
    mutate(formData);
  };

  // Reset form when drawer closes
  useEffect(() => {
    if (!isOpen) {
      reset(DEFAULT_FORM_VALUES);
    }
  }, [isOpen, reset]);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-5 w-full max-w-xl bg-white dark:bg-transparent"
    >
      <Input
        label="Guest Name"
        type="text"
        placeholder="John Doe..."
        error={errors.guestName?.message}
        {...register("guestName")}
      />

      <Input
        label="Guest Email (Optional)"
        type="email"
        placeholder="john.doe@example.com"
        error={errors.guestEmail?.message}
        {...register("guestEmail")}
      />

      <Input
        label="Platform Reservation ID (Optional)"
        type="text"
        placeholder="HM12345678, AIRBNB-XYZ..."
        error={errors.platformReservationId?.message}
        {...register("platformReservationId")}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Check-In Date & Time"
          type="datetime-local"
          error={errors.checkInDatetime?.message}
          {...register("checkInDatetime")}
        />

        <Input
          label="Check-Out Date & Time"
          type="datetime-local"
          error={errors.checkOutDatetime?.message}
          {...register("checkOutDatetime")}
        />
      </div>

      <Select
        label="Status"
        options={statusOptions}
        error={errors.status?.message}
        {...register("status")}
      />

      <Input
        label="Proof Window (Hours)"
        type="number"
        min="1"
        placeholder="4"
        error={errors.proofWindowHours?.message}
        {...register("proofWindowHours")}
      />

      <Button
        type="submit"
        className="w-full py-3 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={isSubmitting || isPending || !isValid}
        isLoading={isPending}
      >
        {isSubmitting || isPending
          ? "Creating Reservation..."
          : "Create Reservation"}
      </Button>
    </form>
  );
}