/* eslint-disable @typescript-eslint/no-explicit-any */
import { useForm, Controller } from "react-hook-form";
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
  name: z.string().min(1, "createAssetForm.validation.nameRequired"),
  category: z.enum(ASSET_CATEGORIES, {
    message: "createAssetForm.validation.categoryRequired",
  }),
  roomLocation: z.enum(ROOM_LOCATIONS, {
    message: "createAssetForm.validation.roomLocationRequired",
  }),
  description: z.string().optional(),
  photoProofRequirement: z.enum(["SWEEP_ONLY", "CLOSEUP", "FUNCTIONAL_ACTION"]),
  approximateValue: z
    .string()
    .optional()
    .refine(
      (val) => !val || (!isNaN(Number(val)) && Number(val) >= 0),
      "createAssetForm.validation.invalidValue",
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
  category: "" as any,
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
    control,
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

      toast.success(t("createAssetForm.messages.createSuccess"));
      reset(DEFAULT_FORM_VALUES);
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      console.error("Mutation failed:", error);
      toast.error(
        error?.error?.message || t("createAssetForm.messages.createError"),
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
        label={t("createAssetForm.fields.name.label")}
        type="text"
        placeholder={t("createAssetForm.fields.name.placeholder")}
        error={errors.name?.message ? t(errors.name.message) : undefined}
        {...register("name")}
      />

      <Controller
        name="category"
        control={control}
        render={({ field }) => (
          <Select
            label={t("createAssetForm.fields.category.label")}
            options={categoryOptions}
            error={
              errors.category?.message
                ? t(errors.category.message)
                : undefined
            }
            value={field.value}
            onChange={field.onChange}
            ref={field.ref}
          />
        )}
      />

      <Controller
        name="roomLocation"
        control={control}
        render={({ field }) => (
          <Select
            label={t("createAssetForm.fields.roomLocation.label")}
            options={roomLocationOptions}
            error={
              errors.roomLocation?.message
                ? t(errors.roomLocation.message)
                : undefined
            }
            value={field.value}
            onChange={field.onChange}
            ref={field.ref}
          />
        )}
      />

      <Controller
        name="photoProofRequirement"
        control={control}
        render={({ field }) => (
          <Select
            label={t("createAssetForm.fields.photoRequirement.label")}
            options={photoProofOptions}
            error={
              errors.photoProofRequirement?.message
                ? t(errors.photoProofRequirement.message)
                : undefined
            }
            value={field.value}
            onChange={field.onChange}
            ref={field.ref}
          />
        )}
      />

      <Input
        label={t("createAssetForm.fields.approximateValue.label")}
        type="number"
        step="0.01"
        placeholder={t("createAssetForm.fields.approximateValue.placeholder")}
        error={
          errors.approximateValue?.message
            ? t(errors.approximateValue.message)
            : undefined
        }
        {...register("approximateValue")}
      />

      <Input
        label={t("createAssetForm.fields.description.label")}
        type="text"
        placeholder={t("createAssetForm.fields.description.placeholder")}
        error={
          errors.description?.message
            ? t(errors.description.message)
            : undefined
        }
        {...register("description")}
      />

      <Button
        type="submit"
        className="w-full py-3 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={isSubmitting || isPending || !isValid}
        isLoading={isPending}
      >
        {isSubmitting || isPending
          ? t("createAssetForm.buttons.submitting")
          : t("createAssetForm.buttons.submit")}
      </Button>
    </form>
  );
}