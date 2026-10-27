export type RoutePreloader = (href: string) => void;

let registered: RoutePreloader | null = null;

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
  } catch {
    // A preload is best-effort: the loader retries on navigation (R11).
  }
}
