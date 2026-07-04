import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { getUsers } from "@/api/generated/requests/services.gen";
import { withAuth } from "@/lib/api";
import { useSupabaseTask } from "@/hooks/supabase";
import { supabase } from "@/lib/supabase";
import PageLayout from "@/components/PageLayout";
import Button from "@/components/Button";

export default function DashboardPage() {
  const navigate = useNavigate();

  const { data: users, isLoading: usersIsLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async ({ signal }) => {
      const config = await withAuth({ signal });
      const response = await getUsers(config);
      
      return response.data;
    },
  });

  console.log(users);
  console.log(usersIsLoading);
  
  const { execute, isLoading } = useSupabaseTask();

  const handleLogout = async () => {
    await execute(
      () => supabase.auth.signOut(),
      { successMessage: "Successfully logged out." }
    );

    navigate("/login");
  };

  return (
    <PageLayout>
      <div className="flex flex-col min-h-screen bg-white p-6 justify-between">
        <div className="my-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
              Covera
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              This is a Dashboard Page
            </p>
          </div>
        </div>

        <div className="w-full pb-4">
          <Button
            variant="secondary"
            className="w-full py-3 text-red-600 border-red-200 hover:bg-red-50"
            onClick={handleLogout}
            disabled={isLoading}
          >
            {isLoading ? "Signing out..." : "Log Out"}
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}
