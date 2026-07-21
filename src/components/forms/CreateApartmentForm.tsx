/* eslint-disable @typescript-eslint/no-explicit-any */
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Input from "@/components/formItems/Input";
import Select from "@/components/formItems/Select";
import Button from "@/components/formItems/Button";
import { withAuth } from "@/lib/api/api";
import { postApartments } from "@/api/generated/requests/services.gen";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_ACTIONS } from "@/lib/api/queryKeys";
import { toast } from "sonner";
import { useEffect } from "react";
import type { SelectOption } from "@/types/component.types";

const createApartmentSchema = z.object({
  name: z.string().min(1, "Apartment name is required"),
  address: z.string().min(1, "Address is required"),
  externalId: z.string().optional(),
  owner: z.uuid("Please select a valid owner"),
  location: z.uuid("Please select a valid location"),
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

      toast.success("Apartment created successfully!");
      reset();
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      console.error("Mutation failed:", error);
      toast.error(
        error?.error?.message || "An error occurred creating the apartment.",
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
        label="Apartment Name"
        type="text"
        placeholder="Luxury Suite Downtown"
        error={errors.name?.message}
        {...register("name")}
      />

      <Input
        label="Street Address"
        type="text"
        placeholder="123 Main Street, Suite 4B"
        error={errors.address?.message}
        {...register("address")}
      />

      <Input
        label="External Reference ID (Optional)"
        type="text"
        placeholder="EXT-10042"
        error={errors.externalId?.message}
        {...register("externalId")}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Assigned Owner"
          options={ownerOptions}
          error={errors.owner?.message}
          {...register("owner")}
        />

        <Select
          label="Location"
          options={locationOptions}
          error={errors.location?.message}
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
          ? "Registering Property..."
          : "Create Apartment"}
      </Button>
    </form>
  );
}
