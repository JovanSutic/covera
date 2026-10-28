/* eslint-disable @typescript-eslint/no-explicit-any */
import { queryClient } from "@/lib/api/queryClient";

/**
 * D5: ONE freshness window, shared by a route's prefetch and the page hook that
 * reads the same key. Prefetches used 30 s while `queryClient` defaulted to
 * 15 min, so a hover after 30 s refetched a query the page still considered
 * fresh — a wasted request (hole 4). The value stays 30 s rather than 15 min: a
 * prefetch is speculative, and it must not pin stale data on screen.
 */
export const PREFETCH_STALE_TIME_MS = 30_000;

export interface PrefetchSpec {
  queryKey: readonly unknown[];
  queryFn: (ctx: { signal: AbortSignal }) => Promise<unknown>;
}

/**
 * D14: a prefetch is best-effort. It must never reject into the router, and a
 * failure must never surface as a route error — the page's own `useQuery`
 * retries it and owns the error branch. `preloadRegistry` catches synchronously;
 * this catches the promise.
 */
export function prefetchQuietly(spec: PrefetchSpec): void {
  void queryClient
    .prefetchQuery({
      queryKey: spec.queryKey,
      queryFn: spec.queryFn,
      staleTime: PREFETCH_STALE_TIME_MS,
    })
    .catch(() => undefined);
}

/**
 * One resource = one key builder + one fetcher, defined together so a route's
 * prefetch and a page's hook cannot drift (§4: same key = same args, or the
 * cache sees two entries and fetches twice).
 *
 * `params` is deliberately loose at this boundary: each module keeps a precise
 * hook signature for its own callers, while the registry only forwards a bag.
 */
export interface ResourceDefinition {
  action: readonly string[];
  key: (params: any) => readonly unknown[];
  fetch: (params: any, ctx: { signal: AbortSignal }) => Promise<unknown>;
}
