/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "./supabase";
const BASE_URL = import.meta.env.VITE_BASE_URL;

export function publicApi(extraOptions: Record<string, any> = {}) {
  return {
    baseUrl: BASE_URL,
    throwOnError: true,
    ...extraOptions,
    headers: {
      ...extraOptions?.headers,
    },
  };
}

export async function withAuth(extraOptions: Record<string, any> = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  return {
    baseUrl: BASE_URL,
    throwOnError: true,
    ...extraOptions,
    headers: {
      ...extraOptions?.headers,
      Authorization: `Bearer ${token}`,
    },
  };
}
