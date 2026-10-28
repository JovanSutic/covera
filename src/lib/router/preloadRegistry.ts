export type RoutePreloader = (href: string) => void;

let registered: RoutePreloader | null = null;

/**
 * D11: which hrefs were preloaded since the last navigation. The timing recorder
 * consumes this to label a sample as warmed or cold — without it, `chunkMs` and
 * `dataMs` cannot be attributed to the prefetch rather than to a fast network.
 */
let preloadedHrefs = new Set<string>();

/**
 * Registered by the router factory so any link can start a route's work without
 * importing the router module (§3, H7). A newer registration replaces an older
 * one; unregistering never clears a preloader registered after it.
 */
export function registerRoutePreloader(preloader: RoutePreloader): () => void {
  registered = preloader;

  return () => {
    if (registered === preloader) registered = null;
  };
}

export function preloadRoute(href: string): void {
  if (!registered) return;

  try {
    registered(href);
    preloadedHrefs.add(href);
  } catch {
    // A preload is best-effort: the loader retries on navigation (R11).
  }
}

/**
 * True when `pathAndSearch` was preloaded, consuming it. Paths are compared
 * loosely because the link's href and the router's location can differ by a
 * trailing slash or an encoded space.
 */
export function consumePreloaded(pathAndSearch: string): boolean {
  return preloadedHrefs.has(pathAndSearch);
}

/** Dev-only reset, so a measurement run starts from a known state. */
export function clearPreloadedHrefs(): void {
  preloadedHrefs = new Set();
}
