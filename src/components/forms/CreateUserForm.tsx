/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo } from "react";
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
import { postUsers } from "@/api/generated/requests/services.gen";
import { QUERY_ACTIONS } from "@/lib/api/queryKeys";

const createUserSchema = z.object({
  firstName: z.string().min(1, "createUserForm.validation.firstNameRequired"),
  lastName: z.string().min(1, "createUserForm.validation.lastNameRequired"),
  email: z
    .string()
    .min(1, "createUserForm.validation.emailRequired")
    .email("createUserForm.validation.invalidEmail"),
  role: z.enum(["admin", "host", "guest"], {
    message: "createUserForm.validation.invalidRole",
  }),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;

interface CreateUserFormProps {
  onSuccess: () => void;
  isOpen: boolean;
}

export default function CreateUserForm({
  onSuccess,
  isOpen,
}: CreateUserFormProps) {
  const { t } = useTranslation("general");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty, isValid },
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      role: "host",
    },
  });

  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (formData: CreateUserFormValues) => {
      const config = await withAuth();
      const response = await postUsers({
        ...config,
        body: formData,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...QUERY_ACTIONS.USERS_GET_ALL],
      });

      toast.success(t("createUserForm.toast.success"));
      reset();
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      console.error("Mutation failed:", error);
      toast.error(error?.error?.message || t("createUserForm.toast.error"));
    },
  });

  const onSubmit = (formData: CreateUserFormValues) => {
    mutate(formData);
  };

  const roleOptions = useMemo(
    () => [
      { value: "guest", label: t("createUserForm.roles.guest") },
      { value: "host", label: t("createUserForm.roles.host") },
      { value: "admin", label: t("createUserForm.roles.admin") },
    ],
    [t],
  );

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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label={t("createUserForm.labels.firstName")}
          type="text"
          placeholder={t("createUserForm.placeholders.firstName")}
          error={
            errors.firstName?.message ? t(errors.firstName.message) : undefined
          }
          {...register("firstName")}
        />
        <Input
          label={t("createUserForm.labels.lastName")}
          type="text"
          placeholder={t("createUserForm.placeholders.lastName")}
          error={
            errors.lastName?.message ? t(errors.lastName.message) : undefined
          }
          {...register("lastName")}
        />
      </div>

      <Input
        label={t("createUserForm.labels.email")}
        type="email"
        placeholder={t("createUserForm.placeholders.email")}
        autoComplete="off"
        error={errors.email?.message ? t(errors.email.message) : undefined}
        {...register("email")}
      />

      <Select
        label={t("createUserForm.labels.role")}
        options={roleOptions}
        error={errors.role?.message ? t(errors.role.message) : undefined}
        {...register("role")}
      />

      <Button
        type="submit"
        className="w-full py-3 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={isSubmitting || isPending || !isValid}
      >
        {isSubmitting || isPending
          ? t("createUserForm.button.submitting")
          : t("createUserForm.button.submit")}
      </Button>
    </form>
  );
}