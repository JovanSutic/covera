import { useNavigate } from "react-router";
import { useSupabaseTask } from "@/hooks/supabase";
import { supabase } from "@/lib/supabase";
import PageLayout from "@/components/layout/PageLayout";
import Button from "@/components/formItems/Button";

export default function DashboardPage() {
  const navigate = useNavigate();
  
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
              Host Dashboard
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
