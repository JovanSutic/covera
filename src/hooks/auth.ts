import { useQuery } from "@tanstack/react-query";
import { getAuthUserFromJwt, type AuthenticatedUser } from "@/lib/auth";

export function useAuthUser() {
  return useQuery<AuthenticatedUser | null>({
    queryKey: ["auth", "current_user"],
    queryFn: async () => {
      return await getAuthUserFromJwt();
    },
    staleTime: 1000 * 60 * 10,
  });
}