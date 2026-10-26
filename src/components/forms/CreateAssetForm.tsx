/* eslint-disable @typescript-eslint/no-explicit-any */
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import Input from "@/components/formItems/Input";
import Select from "@/components/formItems/Select";
import Button from "@/components/formItems/Button";
import { withAuth } from "@/lib/api/api";
import { getAssetsTypes, postAssets } from "@/api/generated/requests/sdk.gen";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_ACTIONS } from "@/lib/api/queryKeys";
import { toast } from "sonner";
import { useEffect, useMemo } from "react";
import type { SelectOption } from "@/types/component.types";
import {
  AGE_BRACKETS,
  ROOM_LOCATIONS,
  SHOT_TYPES,
  VALUE_TIERS,
} from "@/types/assets.types";
import {
  resolveAssetIdentity,
  toAssetTypeOptions,
} from "@/lib/helpers/assetTypes";

const createAssetSchema = z.object({
  assetTypeId: z.string().min(1, "createAssetForm.validation.assetTypeRequired"),
  roomLocation: z.enum(ROOM_LOCATIONS, {
    message: "createAssetForm.validation.roomLocationRequired",
  }),
  photoProofRequirement: z.enum(["SWEEP_ONLY", "CLOSEUP", "FUNCTIONAL_ACTION"]),
  ageBracket: z.union([z.enum(AGE_BRACKETS), z.literal("")]),
  valueTier: z.union([z.enum(VALUE_TIERS), z.literal("")]),
  description: z.string().optional(),
});

type CreateAssetFormValues = z.infer<typeof createAssetSchema>;

interface CreateAssetFormProps {
  onSuccess: () => void;
  isOpen: boolean;
  apartmentId: string;
}

const DEFAULT_FORM_VALUES: CreateAssetFormValues = {
  assetTypeId: "",
  roomLocation: "" as any,
  photoProofRequirement: "SWEEP_ONLY",
  ageBracket: "",
  valueTier: "",
  description: "",
};

export default function CreateAssetForm({
  onSuccess,
  isOpen,
  apartmentId,
}: CreateAssetFormProps) {
  const { t } = useTranslation("assets");

  const { data: assetTypes = [], isLoading: assetTypesLoading } = useQuery({
    queryKey: [...QUERY_ACTIONS.ASSET_TYPES_GET_ALL],
    queryFn: async ({ signal }) => {
      const config = await withAuth({ signal });
      const response = await getAssetsTypes({ ...config });
      return response.data || [];
    },
  });

  const assetTypeOptions: SelectOption[] = useMemo(
    () => toAssetTypeOptions(assetTypes, t),
    [assetTypes, t],
  );

  const ageBracketOptions: SelectOption[] = useMemo(
    () =>
      AGE_BRACKETS.map((bracket) => ({
        value: bracket,
        label: t(`ageBrackets.${bracket}`, bracket),
      })),
    [t],
  );

  const valueTierOptions: SelectOption[] = useMemo(
    () =>
      VALUE_TIERS.map((tier) => ({
        value: tier,
        label: t(`valueTiers.${tier}`, tier),
      })),
    [t],
  );

  const photoProofOptions: SelectOption[] = useMemo(
    () =>
      SHOT_TYPES.map((type) => ({
        value: type,
        label: t(`photoProofs.${type}`, type),
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
      const identity = resolveAssetIdentity(assetTypes, formData.assetTypeId);

      if (!identity) {
        throw new Error(t("createAssetForm.validation.assetTypeRequired"));
      }

      const config = await withAuth();

      const response = await postAssets({
        ...config,
        body: {
          apartmentId,
          name: identity.name,
          category: identity.category,
          assetTypeId: formData.assetTypeId,
          roomLocation: formData.roomLocation,
          description: formData.description || null,
          photoProofRequirement: formData.photoProofRequirement,
          ageBracket: formData.ageBracket || null,
          valueTier: formData.valueTier || null,
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
      <Controller
        name="assetTypeId"
        control={control}
        render={({ field }) => (
          <Select
            label={t("createAssetForm.fields.assetType.label")}
            options={assetTypeOptions}
            disabled={assetTypesLoading}
            error={
              errors.assetTypeId?.message
                ? t(errors.assetTypeId.message)
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

      <Controller
        name="ageBracket"
        control={control}
        render={({ field }) => (
          <Select
            label={t("createAssetForm.fields.ageBracket.label")}
            options={ageBracketOptions}
            error={
              errors.ageBracket?.message
                ? t(errors.ageBracket.message)
                : undefined
            }
            value={field.value}
            onChange={field.onChange}
            ref={field.ref}
          />
        )}
      />

      <Controller
        name="valueTier"
        control={control}
        render={({ field }) => (
          <Select
            label={t("createAssetForm.fields.valueTier.label")}
            options={valueTierOptions}
            error={
              errors.valueTier?.message
                ? t(errors.valueTier.message)
                : undefined
            }
            value={field.value}
            onChange={field.onChange}
            ref={field.ref}
          />
        )}
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
