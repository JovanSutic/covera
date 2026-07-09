import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Input from "@/components/formItems/Input";
import Button from "@/components/formItems/Button";
import { supabase } from "@/lib/supabase";
import { useSupabaseTask } from "@/hooks/supabase";
import { getAuthRole } from "@/lib/auth";
import { useNavigate } from "react-router";

const loginSchema = z.object({
  email: z.email().min(1, "Email is required"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(
      /[^A-Za-z0-9]/,
      "Password must contain at least one special character",
    ),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginForm() {
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
      { successMessage: "Welcome back!" },
    );

    if (sessionData) {
      const role = await getAuthRole();
      if (role !== 'guest') {
        console.log('alo bre')
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
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />
      </div>

      <Button
        type="submit"
        className="w-full py-3 mt-2"
        disabled={isSubmitting}
      >
        {isSubmitting || isLoading ? "Loading..." : "Continue"}
      </Button>
    </form>
  );
}
