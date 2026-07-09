/* eslint-disable @typescript-eslint/no-explicit-any */
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Input from "@/components/formItems/Input";
import Select from "@/components/formItems/Select";
import Button from "@/components/formItems/Button";
import { withAuth } from "@/lib/api/api";
import { postUsers } from "@/api/generated/requests/services.gen";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_ACTIONS } from "@/lib/api/queryKeys";
import { toast } from "sonner";
import { useEffect } from "react";

const createUserSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.email("Invalid email address").min(1, "Email is required"),
  role: z.enum(["admin", "host", "guest"], {
    message: "Please select a valid system role",
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

      toast.success("User profile created successfully!");
      reset();
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      console.error("Mutation failed:", error);
      toast.error(error?.error?.message || "An auth error occurred.");
    },
  });

  const onSubmit = (formData: CreateUserFormValues) => {
    mutate(formData);
  };

  const roleOptions = [
    { value: "guest", label: "Guest" },
    { value: "host", label: "Host" },
    { value: "admin", label: "Administrator" },
  ];

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
          label="First Name"
          type="text"
          placeholder="John"
          error={errors.firstName?.message}
          {...register("firstName")}
        />
        <Input
          label="Last Name"
          type="text"
          placeholder="Doe"
          error={errors.lastName?.message}
          {...register("lastName")}
        />
      </div>

      <Input
        label="Email Address"
        type="email"
        placeholder="name@example.com"
        autoComplete="off"
        error={errors.email?.message}
        {...register("email")}
      />

      <Select
        label="System Access Role"
        options={roleOptions}
        error={errors.role?.message}
        {...register("role")}
      />

      <Button
        type="submit"
        className="w-full py-3 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={isSubmitting || isPending || !isValid}
      >
        {isSubmitting || isPending ? "Creating Account..." : "Create User"}
      </Button>
    </form>
  );
}
