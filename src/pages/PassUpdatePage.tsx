/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router";
import PageLayout from "@/components/layout/PageLayout";
import PassUpdateForm from "@/components/forms/PassUpdateForm";
import Button from "@/components/formItems/Button";
import { supabase } from "@/lib/supabase";
import { useSupabaseTask } from "@/hooks/supabase";
import { getAuthUserFromJwt } from "@/lib/auth"; // Adjust path to match your helper's location

export default function PassUpdatePage() {
  const navigate = useNavigate();
  const [isReady, setIsReady] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { execute } = useSupabaseTask();

  const resolveUserSession = useCallback(async () => {
    const user = await getAuthUserFromJwt();
    if (user) {
      const name =
        user.firstName && user.firstName !== "User"
          ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
          : null;
      setUserName(name);
      setIsReady(true);
      return true;
    }
    return false;
  }, []);

  const evaluateAuthState = useCallback(async () => {
    const searchParams = new URLSearchParams(window.location.search);
    const cleanHash = window.location.hash.replace(/^#\/?/, "");
    const hashParams = new URLSearchParams(cleanHash);

    const errorDescription =
      hashParams.get("error_description") ||
      searchParams.get("error_description");

    if (errorDescription) {
      setErrorMsg(decodeURIComponent(errorDescription).replace(/\+/g, " "));
      return;
    }

    const tokenHash =
      searchParams.get("token_hash") || searchParams.get("token");
    const type = searchParams.get("type") || hashParams.get("type");

    if (tokenHash) {
      const data = await execute(() =>
        supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: (type as any) || "invite",
        })
      );

      if (data?.session) {
        const resolved = await resolveUserSession();
        if (resolved) {
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );
          return;
        }
      }
    }

    const sessionData = await execute(() => supabase.auth.getSession());
    if (sessionData?.session) {
      const resolved = await resolveUserSession();
      if (resolved) return;
    }

    setErrorMsg("Invalid or missing invitation link.");
  }, [execute, resolveUserSession]);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (
          (event === "SIGNED_IN" || event === "PASSWORD_RECOVERY") &&
          session
        ) {
          await resolveUserSession();
          setErrorMsg(null);
        }
      }
    );

    evaluateAuthState();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [evaluateAuthState, resolveUserSession]);

  return (
    <PageLayout>
      <div className="flex flex-col min-h-screen bg-white p-6 justify-center max-w-md mx-auto w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            {isReady && userName
              ? `Welcome to Covera, ${userName}`
              : "Welcome to Covera"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isReady
              ? "Set up your new password to activate your account."
              : "Update your password."}
          </p>
        </div>

        {errorMsg ? (
          <div className="flex flex-col gap-4">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700">
              {errorMsg}
            </div>
            <Button onClick={() => navigate("/login")} className="w-full py-3">
              Go to Login
            </Button>
          </div>
        ) : isReady ? (
          <PassUpdateForm />
        ) : (
          <div className="text-center py-6 text-sm text-gray-500">
            Verifying invitation details...
          </div>
        )}
      </div>
    </PageLayout>
  );
}