import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router";
import Input from "@/components/formItems/Input";
import Button from "@/components/formItems/Button";
import { supabase } from "@/lib/supabase";
import { useSupabaseTask } from "@/hooks/supabase";
import { getAuthRole } from "@/lib/auth";

const passwordSchema = z
  .string()
  .min(1, "Password is required")
  .min(8, "Password must be at least 8 characters long")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[^A-Za-z0-9]/,
    "Password must contain at least one special character",
  );

const updatePasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type UpdatePasswordFormValues = z.infer<typeof updatePasswordSchema>;

export default function PassUpdateForm() {
  const navigate = useNavigate();
  const { execute, isLoading } = useSupabaseTask();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdatePasswordFormValues>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (formData: UpdatePasswordFormValues) => {
    const result = await execute(
      () =>
        supabase.auth.updateUser({
          password: formData.password,
        }),
      { successMessage: "Password updated successfully!" }
    );

    if (result) {
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
          label="New Password"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register("password")}
        />
        <Input
          label="Confirm Password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
      </div>

      <Button
        type="submit"
        className="w-full py-3 mt-2"
        disabled={isSubmitting || isLoading}
      >
        {isSubmitting || isLoading ? "Updating..." : "Set Password"}
      </Button>
    </form>
  );
}