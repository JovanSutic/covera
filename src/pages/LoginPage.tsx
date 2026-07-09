import PageLayout from "@/components/layout/PageLayout";
import LoginForm from "@/components/forms/LoginForm";

export default function LoginPage() {
  return (
    <PageLayout>
      <div className="flex flex-col min-h-screen bg-white p-6 justify-center">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Welcome to Covera
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Log in or sign up to manage your account.
          </p>
        </div>

        <LoginForm />
      </div>
    </PageLayout>
  );
}
