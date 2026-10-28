import {
  getApartments,
  getLocations,
  getUsers,
} from "@/api/generated/requests/sdk.gen";
import { withAuth } from "@/lib/api/api";
import { QUERY_ACTIONS } from "@/lib/api/queryKeys";
import { useQuery } from "@tanstack/react-query";
import type { UserRole } from "@/lib/auth";
import { PREFETCH_STALE_TIME_MS } from "./shared";
import type { ResourceDefinition } from "./shared";

export interface UsersParams {
  role?: UserRole;
}

/** Two shapes exist in the app: the bare key (UsersSection) and `{ role }` (ApartmentsSection). */
export function usersQueryKey({ role }: UsersParams = {}) {
  return role
    ? ([...QUERY_ACTIONS.USERS_GET_ALL, { role }] as const)
    : ([...QUERY_ACTIONS.USERS_GET_ALL] as const);
}

export async function fetchUsers({ role }: UsersParams = {}, signal?: AbortSignal) {
  const config = await withAuth(signal ? { signal } : {});
  const response = await getUsers({
    ...config,
    ...(role ? { query: { role } } : {}),
  });
  return response.data;
}

export function useUsers(params: UsersParams = {}) {
  return useQuery({
    queryKey: usersQueryKey(params),
    queryFn: ({ signal }) => fetchUsers(params, signal),
    staleTime: PREFETCH_STALE_TIME_MS,
  });
}

export function apartmentsAllQueryKey() {
  return [...QUERY_ACTIONS.APARTMENTS_GET_ALL] as const;
}

export async function fetchApartmentsAll(signal?: AbortSignal) {
  const config = await withAuth(signal ? { signal } : {});
  const response = await getApartments(config);
  return response.data;
}

export function useApartmentsAll() {
  return useQuery({
    queryKey: apartmentsAllQueryKey(),
    queryFn: ({ signal }) => fetchApartmentsAll(signal),
    staleTime: PREFETCH_STALE_TIME_MS,
  });
}

export function locationsQueryKey() {
  return [...QUERY_ACTIONS.LOCATIONS_GET_ALL] as const;
}

export async function fetchLocations(signal?: AbortSignal) {
  const config = await withAuth(signal ? { signal } : {});
  const response = await getLocations(config);
  return response.data;
}

export function useLocations() {
  return useQuery({
    queryKey: locationsQueryKey(),
    queryFn: ({ signal }) => fetchLocations(signal),
    staleTime: PREFETCH_STALE_TIME_MS,
  });
}

export const usersResource: ResourceDefinition = {
  action: QUERY_ACTIONS.USERS_GET_ALL,
  key: (params: UsersParams) => usersQueryKey(params),
  fetch: (params: UsersParams, { signal }) => fetchUsers(params, signal),
};

export const apartmentsAllResource: ResourceDefinition = {
  action: QUERY_ACTIONS.APARTMENTS_GET_ALL,
  key: () => apartmentsAllQueryKey(),
  fetch: (_params: unknown, { signal }) => fetchApartmentsAll(signal),
};

export const locationsResource: ResourceDefinition = {
  action: QUERY_ACTIONS.LOCATIONS_GET_ALL,
  key: () => locationsQueryKey(),
  fetch: (_params: unknown, { signal }) => fetchLocations(signal),
};
