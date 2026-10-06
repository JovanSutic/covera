/* eslint-disable @typescript-eslint/no-explicit-any */
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import Input from "@/components/formItems/Input";
import Button from "@/components/formItems/Button";
import { postUsersUpdatePassword } from "@/api/generated/requests/services.gen";
import { withAuth } from "@/lib/api/api";
import { getAuthRole } from "@/lib/auth";

const passwordSchema = z
  .string()
  .min(1, "passUpdateForm.validation.passwordRequired")
  .min(8, "passUpdateForm.validation.passwordMinLength")
  .regex(/[A-Z]/, "passUpdateForm.validation.passwordUppercase")
  .regex(/[a-z]/, "passUpdateForm.validation.passwordLowercase")
  .regex(/[0-9]/, "passUpdateForm.validation.passwordNumber")
  .regex(/[^A-Za-z0-9]/, "passUpdateForm.validation.passwordSpecialChar");

const updatePasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z
      .string()
      .min(1, "passUpdateForm.validation.confirmPasswordRequired"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "passUpdateForm.validation.passwordsMustMatch",
    path: ["confirmPassword"],
  });

type UpdatePasswordFormValues = z.infer<typeof updatePasswordSchema>;

export default function PassUpdateForm() {
  const { t } = useTranslation("general");
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdatePasswordFormValues>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (formData: UpdatePasswordFormValues) => {
      const config = await withAuth();
      const response = await postUsersUpdatePassword({
        ...config,
        body: {
          password: formData.password,
          confirmPassword: formData.password,
        },
      });
      return response.data;
    },
    onSuccess: async () => {
      toast.success(t("passUpdateForm.toast.success"));
      reset();

      const role = await getAuthRole();
      if (role !== "guest") {
        navigate(`/${role}/dashboard`);
      } else {
        navigate("/");
      }
    },
    onError: (error: any) => {
      console.error("Mutation failed:", error);
      toast.error(
        error?.error?.message || t("passUpdateForm.toast.error"),
      );
    },
  });

  const onSubmit = (formData: UpdatePasswordFormValues) => {
    mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <Input
          label={t("passUpdateForm.labels.password")}
          type="password"
          autoComplete="new-password"
          error={
            errors.password?.message ? t(errors.password.message) : undefined
          }
          {...register("password")}
        />
        <Input
          label={t("passUpdateForm.labels.confirmPassword")}
          type="password"
          autoComplete="new-password"
          error={
            errors.confirmPassword?.message
              ? t(errors.confirmPassword.message)
              : undefined
          }
          {...register("confirmPassword")}
        />
      </div>

      <Button
        type="submit"
        className="w-full py-3 mt-2"
        disabled={isSubmitting || isPending}
      >
        {isSubmitting || isPending
          ? t("passUpdateForm.button.submitting")
          : t("passUpdateForm.button.submit")}
      </Button>
    </form>
  );
}