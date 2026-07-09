import { redirect } from "react-router";
import { supabase } from "../lib/supabase";
import { jwtDecode } from "jwt-decode";

export type UserRole = "admin" | "host" | "guest";

interface CustomJwtPayload {
  email?: string;
  role?: UserRole;
  user_metadata?: {
    firstName?: string;
    lastName?: string;
    role: UserRole;
    first_name?: string;
    last_name?: string;
  };
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
}

export async function getAuthUserFromJwt(): Promise<AuthenticatedUser | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token || !session?.user) return null;

  try {
    const decoded = jwtDecode<CustomJwtPayload>(session.access_token);

    console.log(decoded);
    
    return {
      id: session.user.id,
      email: decoded.email || session.user.email || "",
      role: decoded.user_metadata?.role || "guest",
      firstName: decoded.user_metadata?.firstName || decoded.user_metadata?.first_name || "User",
      lastName: decoded.user_metadata?.lastName || decoded.user_metadata?.last_name || "",
    };
  } catch (error) {
    console.error("Failed parsing JWT payloads:", error);
    return null;
  }
}

export async function getAuthRole(): Promise<UserRole | null> {
  const user = await getAuthUserFromJwt();
  return user ? user.role : null;
}

export async function requireRoleGuard(allowedRole: UserRole) {
  const actualRole = await getAuthRole();

  if (!actualRole) {
    return redirect("/login");
  }

  if (actualRole !== allowedRole) {
    return redirect(`/${actualRole}/dashboard`);
  }

  return null;
}