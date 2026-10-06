/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Input from "@/components/formItems/Input";
import Select from "@/components/formItems/Select";
import Button from "@/components/formItems/Button";
import { withAuth } from "@/lib/api/api";
import { postApartments } from "@/api/generated/requests/services.gen";
import { QUERY_ACTIONS } from "@/lib/api/queryKeys";
import type { SelectOption } from "@/types/component.types";

const createApartmentSchema = z.object({
  name: z.string().min(1, "createApartmentForm.validation.nameRequired"),
  address: z.string().min(1, "createApartmentForm.validation.addressRequired"),
  externalId: z.string().optional(),
  owner: z.uuid("createApartmentForm.validation.invalidOwner"),
  location: z.uuid("createApartmentForm.validation.invalidLocation"),
});

type CreateApartmentFormValues = z.infer<typeof createApartmentSchema>;

interface CreateApartmentFormProps {
  onSuccess: () => void;
  isOpen: boolean;
  ownerOptions: SelectOption[];
  locationOptions: SelectOption[];
}

export default function CreateApartmentForm({
  onSuccess,
  isOpen,
  ownerOptions,
  locationOptions,
}: CreateApartmentFormProps) {
  const { t } = useTranslation("host");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty, isValid },
  } = useForm<CreateApartmentFormValues>({
    resolver: zodResolver(createApartmentSchema),
    defaultValues: {
      name: "",
      address: "",
      externalId: "",
      owner: "",
      location: "",
    },
  });

  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (formData: CreateApartmentFormValues) => {
      const config = await withAuth();
      const response = await postApartments({
        ...config,
        body: {
          name: formData.name,
          address: formData.address,
          externalId: formData.externalId || null,
          owner: formData.owner,
          location: formData.location,
        },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...QUERY_ACTIONS.APARTMENTS_GET_ALL],
      });

      toast.success(t("createApartmentForm.toast.success"));
      reset();
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      console.error("Mutation failed:", error);
      toast.error(
        error?.error?.message || t("createApartmentForm.toast.error"),
      );
    },
  });

  const onSubmit = (formData: CreateApartmentFormValues) => {
    mutate(formData);
  };

  useEffect(() => {
    if (!isOpen && isDirty) {
      reset();
    }
  }, [isOpen, reset, isDirty]);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-5 max-w-xl bg-white"
    >
      <Input
        label={t("createApartmentForm.labels.name")}
        type="text"
        placeholder={t("createApartmentForm.placeholders.name")}
        error={errors.name?.message ? t(errors.name.message) : undefined}
        {...register("name")}
      />

      <Input
        label={t("createApartmentForm.labels.address")}
        type="text"
        placeholder={t("createApartmentForm.placeholders.address")}
        error={errors.address?.message ? t(errors.address.message) : undefined}
        {...register("address")}
      />

      <Input
        label={t("createApartmentForm.labels.externalId")}
        type="text"
        placeholder={t("createApartmentForm.placeholders.externalId")}
        error={
          errors.externalId?.message ? t(errors.externalId.message) : undefined
        }
        {...register("externalId")}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label={t("createApartmentForm.labels.owner")}
          options={ownerOptions}
          error={errors.owner?.message ? t(errors.owner.message) : undefined}
          {...register("owner")}
        />

        <Select
          label={t("createApartmentForm.labels.location")}
          options={locationOptions}
          error={
            errors.location?.message ? t(errors.location.message) : undefined
          }
          {...register("location")}
        />
      </div>

      <Button
        type="submit"
        className="w-full py-3 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={isSubmitting || isPending || !isValid}
        isLoading={isPending}
      >
        {isSubmitting || isPending
          ? t("createApartmentForm.button.submitting")
          : t("createApartmentForm.button.submit")}
      </Button>
    </form>
  );
}