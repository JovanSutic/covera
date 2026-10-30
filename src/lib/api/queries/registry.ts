import type { ParsedParams } from "@/lib/router/params";
import { apartmentResource, apartmentsHostResource } from "./apartment";
import { assetsResource } from "./assets";
import { shotsResource } from "./shots";
import { reservationsResource } from "./reservations";
import { reservationResource } from "./reservation";
import { inspectionResource } from "./inspection";
import {
  apartmentsAllResource,
  locationsResource,
  usersResource,
} from "./admin";
import type { PrefetchSpec, ResourceDefinition } from "./shared";

/**
 * Every prefetchable resource, by name. A route declares `data: ["assets", …]`
 * and the builder resolves each name here — which is what lets the coverage
 * check (phase 4) see a route's data dependencies as DATA rather than as an
 * opaque callback (D2).
 */
export const QUERY_RESOURCES = {
  apartment: apartmentResource,
  apartmentsHost: apartmentsHostResource,
  apartmentsAll: apartmentsAllResource,
  assets: assetsResource,
  shots: shotsResource,
  reservations: reservationsResource,
  reservation: reservationResource,
  inspection: inspectionResource,
  users: usersResource,
  locations: locationsResource,
} as const satisfies Record<string, ResourceDefinition>;

export type ResourceName = keyof typeof QUERY_RESOURCES;

/**
 * `params` returns the values the resource needs, or `null` when THIS navigation
 * does not need it — the tab-gated case (`?tab=apartments`), where prefetching
 * would waste a request for a tab the user may never open (D9, D13).
 */
export interface ResourceRequest {
  resource: ResourceName;
  params: (
    params: ParsedParams,
    searchParams: URLSearchParams,
  ) => Record<string, unknown> | null;
}

/**
 * Resolves a declaration to a concrete prefetch, or `null` when the declaration
 * declines this navigation. Returning `null` is normal, not an error.
 */
export function resolveResource(
  request: ResourceRequest,
  params: ParsedParams,
  searchParams: URLSearchParams,
): PrefetchSpec | null {
  const values = request.params(params, searchParams);
  if (values === null) return null;

  const definition = QUERY_RESOURCES[request.resource];

  return {
    queryKey: definition.key(values),
    queryFn: ({ signal }) => definition.fetch(values, { signal }),
  };
}
