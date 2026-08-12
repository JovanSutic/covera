/* eslint-disable @typescript-eslint/no-explicit-any */
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import Input from "@/components/formItems/Input";
import Select from "@/components/formItems/Select";
import Button from "@/components/formItems/Button";
import { withAuth } from "@/lib/api/api";
import { postAssets } from "@/api/generated/requests/services.gen";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_ACTIONS } from "@/lib/api/queryKeys";
import { toast } from "sonner";
import { useEffect, useMemo } from "react";
import type { SelectOption } from "@/types/component.types";
import {
  ASSET_CATEGORIES,
  ROOM_LOCATIONS,
  SHOT_TYPES,
} from "@/types/assets.types";

const createAssetSchema = z.object({
  name: z.string().min(1, "Asset name is required"),
  category: z.enum(ASSET_CATEGORIES, {
    message: "Please select a valid category",
  }),
  roomLocation: z.enum(ROOM_LOCATIONS, {
    message: "Please select a room location",
  }),
  description: z.string().optional(),
  photoProofRequirement: z.enum(["SWEEP_ONLY", "CLOSEUP", "FUNCTIONAL_ACTION"]),
  approximateValue: z
    .string()
    .optional()
    .refine(
      (val) => !val || (!isNaN(Number(val)) && Number(val) >= 0),
      "Value must be a valid non-negative number",
    ),
});

type CreateAssetFormValues = z.infer<typeof createAssetSchema>;

interface CreateAssetFormProps {
  onSuccess: () => void;
  isOpen: boolean;
  apartmentId: string;
}

const DEFAULT_FORM_VALUES: CreateAssetFormValues = {
  name: "",
  category: "" as any, // Use empty string instead of undefined for controlled selects
  roomLocation: "" as any,
  description: "",
  photoProofRequirement: "SWEEP_ONLY",
  approximateValue: "",
};

export default function CreateAssetForm({
  onSuccess,
  isOpen,
  apartmentId,
}: CreateAssetFormProps) {
  const { t } = useTranslation("assets");

  const photoProofOptions: SelectOption[] = useMemo(
    () =>
      SHOT_TYPES.map((type) => ({
        value: type,
        label: t(`photoProofs.${type}`, type),
      })),
    [t],
  );

  const categoryOptions: SelectOption[] = useMemo(
    () =>
      ASSET_CATEGORIES.map((cat) => ({
        value: cat,
        label: t(`categories.${cat}`, cat),
      })),
    [t],
  );

  const roomLocationOptions: SelectOption[] = useMemo(
    () =>
      ROOM_LOCATIONS.map((room) => ({
        value: room,
        label: t(`roomLocations.${room}`, room),
      })),
    [t],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isValid },
  } = useForm<CreateAssetFormValues>({
    resolver: zodResolver(createAssetSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  });

  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (formData: CreateAssetFormValues) => {
      const config = await withAuth();

      const approximateValueCents = formData.approximateValue
        ? Math.round(parseFloat(formData.approximateValue) * 100)
        : null;

      const response = await postAssets({
        ...config,
        body: {
          name: formData.name,
          category: formData.category,
          roomLocation: formData.roomLocation,
          apartmentId,
          description: formData.description || null,
          photoProofRequirement: formData.photoProofRequirement,
          approximateValueCents,
        },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...QUERY_ACTIONS.ASSETS_GET_BY_APARTMENT, apartmentId],
      });

      toast.success("Asset created successfully!");
      reset(DEFAULT_FORM_VALUES);
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      console.error("Mutation failed:", error);
      toast.error(
        error?.error?.message || "An error occurred creating the asset.",
      );
    },
  });

  const onSubmit = (formData: CreateAssetFormValues) => {
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
      className="flex flex-col gap-5 w-full max-w-xl bg-white"
    >
      <Input
        label="Asset Name"
        type="text"
        placeholder="Smart TV, Leather Sofa, Espresso Machine..."
        error={errors.name?.message}
        {...register("name")}
      />

      <Select
        label="Category"
        options={categoryOptions}
        error={errors.category?.message}
        {...register("category")}
      />

      <Select
        label="Room Location"
        options={roomLocationOptions}
        error={errors.roomLocation?.message}
        {...register("roomLocation")}
      />

      <Select
        label="Photo Requirement"
        options={photoProofOptions}
        error={errors.photoProofRequirement?.message}
        {...register("photoProofRequirement")}
      />

      <Input
        label="Approximate Value (Optional)"
        type="number"
        step="0.01"
        placeholder="250.00"
        error={errors.approximateValue?.message}
        {...register("approximateValue")}
      />

      <Input
        label="Description / Inspection Notes (Optional)"
        type="text"
        placeholder="Located on the east wall, inspect remote control..."
        error={errors.description?.message}
        {...register("description")}
      />

      <Button
        type="submit"
        className="w-full py-3 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={isSubmitting || isPending || !isValid}
        isLoading={isPending}
      >
        {isSubmitting || isPending ? "Registering Asset..." : "Create Asset"}
      </Button>
    </form>
  );
}