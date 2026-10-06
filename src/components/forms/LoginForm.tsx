import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import Input from "@/components/formItems/Input";
import Button from "@/components/formItems/Button";
import { supabase } from "@/lib/supabase";
import { useSupabaseTask } from "@/hooks/supabase";
import { getAuthRole } from "@/lib/auth";
import { useNavigate } from "react-router";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "loginForm.validation.emailRequired")
    .email("loginForm.validation.invalidEmail"),
  password: z
    .string()
    .min(1, "loginForm.validation.passwordRequired")
    .min(8, "loginForm.validation.passwordMinLength")
    .regex(/[A-Z]/, "loginForm.validation.passwordUppercase")
    .regex(/[a-z]/, "loginForm.validation.passwordLowercase")
    .regex(/[0-9]/, "loginForm.validation.passwordNumber")
    .regex(/[^A-Za-z0-9]/, "loginForm.validation.passwordSpecialChar"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const { t } = useTranslation("general");
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const { execute, isLoading } = useSupabaseTask();

  const onSubmit = async (formData: LoginFormValues) => {
    const sessionData = await execute(
      () =>
        supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        }),
      { successMessage: t("loginForm.messages.welcomeBack") },
    );

    if (sessionData) {
      const role = await getAuthRole();
      if (role !== "guest") {
        navigate(`/${role}/dashboard`);
      } else {
        navigate("/");
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <Input
          label={t("loginForm.labels.email")}
          type="email"
          autoComplete="email"
          error={errors.email?.message ? t(errors.email.message) : undefined}
          {...register("email")}
        />
        <Input
          label={t("loginForm.labels.password")}
          type="password"
          autoComplete="current-password"
          error={
            errors.password?.message ? t(errors.password.message) : undefined
          }
          {...register("password")}
        />
      </div>

      <Button
        type="submit"
        className="w-full py-3 mt-2"
        disabled={isSubmitting || isLoading}
      >
        {isSubmitting || isLoading
          ? t("loginForm.buttons.loading")
          : t("loginForm.buttons.continue")}
      </Button>
    </form>
  );
}