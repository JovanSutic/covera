/* eslint-disable @typescript-eslint/no-explicit-any */
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Input from "@/components/formItems/Input";
import Button from "@/components/formItems/Button";
import { withAuth } from "@/lib/api/api";
import { postReservations } from "@/api/generated/requests/services.gen";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_ACTIONS } from "@/lib/api/queryKeys";
import { toast } from "sonner";
import { useEffect, useState } from "react";

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
    guestName: z.string().min(1, "Guest name is required"),
    guestEmail: z
      .string()
      .optional()
      .refine(
        (val) => !val || z.string().email().safeParse(val).success,
        "Please enter a valid email address",
      ),
    platformReservationId: z.string().optional(),
    checkInDatetime: z
      .string()
      .min(1, "Check-in date & time is required")
      .refine(isFutureDatetime, "Check-in time must be in the future"),
    checkOutDatetime: z
      .string()
      .min(1, "Check-out date & time is required")
      .refine(isFutureDatetime, "Check-out time must be in the future"),
    alternativeCheckInDatetime: z
      .string()
      .optional()
      .refine(
        (val) => !val || isFutureDatetime(val),
        "Alternative check-in time must be in the future",
      ),
    alternativeCheckOutDatetime: z
      .string()
      .optional()
      .refine(
        (val) => !val || isFutureDatetime(val),
        "Alternative check-out time must be in the future",
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
      message:
        "Alternative check-out date must be strictly after alternative check-in date",
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

      // Build body dynamically and omit keys when not provided
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

      toast.success("Reservation created successfully!");
      reset(DEFAULT_FORM_VALUES);
      setShowAlternativeDates(false);
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
          min={minDatetime}
          error={errors.checkInDatetime?.message}
          {...register("checkInDatetime")}
        />

        <Input
          label="Check-Out Date & Time"
          type="datetime-local"
          min={selectedCheckIn || minDatetime}
          error={errors.checkOutDatetime?.message}
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
            ? "- Remove alternative dates"
            : "+ Alternative arrival or departure?"}
        </button>

        {showAlternativeDates && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 animate-in fade-in duration-150">
            <Input
              label="Alternative Check-In (Optional)"
              type="datetime-local"
              min={minDatetime}
              error={errors.alternativeCheckInDatetime?.message}
              {...register("alternativeCheckInDatetime")}
            />

            <Input
              label="Alternative Check-Out (Optional)"
              type="datetime-local"
              min={selectedAltCheckIn || minDatetime}
              error={errors.alternativeCheckOutDatetime?.message}
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
          ? "Creating Reservation..."
          : "Create Reservation"}
      </Button>
    </form>
  );
}