import { createBrowserRouter, createMemoryRouter } from "react-router";
import type { DataRouter, InitialEntry, RouteObject } from "react-router";
import { matchRoutes } from "react-router";
import { registerRoutePreloader } from "./preloadRegistry";
import { areParamsValid } from "./params";
import type { ParsedParams } from "./params";
import type { GuardMeta } from "./defineRoutes";

import { defineRoutes } from "./defineRoutes";
import type { DefineRoutesDeps, RouteNode } from "./defineRoutes";
import { createNavigationTiming } from "./navigationTiming";
import type { AccessLayer } from "./access";
import type { SessionStore } from "./session";
import { clearStaleChunkFlag } from "@/components/router/RouteError";

export interface CreateAppRouterOptions {
  session: SessionStore;
  access: AccessLayer;
  errorElement: React.ReactNode;
  pendingElement?: React.ReactNode;
  routes: readonly RouteNode[];
  basename?: string;
  variant?: string;
  /** Present → a memory router, for tests. Absent → a browser router. */
  initialEntries?: InitialEntry[];
  /** Public URLs rendered outside the shell. Built by the same builder. */
  outsideRoutes?: readonly RouteNode[];
  /** The root route's error element — outside the shell (D25). */
  backstopElement?: React.ReactNode;
  /** The element that frames the app tree, with `<Outlet />` inside it. */
  shellElement?: React.ReactNode;
  /** Shown inside the shell while the first page's loader runs (R18, phase 8). */
  hydrateFallbackElement?: React.ReactNode;
}

export interface AppRouter {
  router: DataRouter;
  access: AccessLayer;
  dispose(): void;
}

export function createAppRouter({
  session,
  access,
  errorElement,
  pendingElement,
  routes,
  basename,
  variant,
  initialEntries,
  outsideRoutes,
  backstopElement,
  shellElement,
  hydrateFallbackElement,
}: CreateAppRouterOptions): AppRouter {
  let previousResults = access.getResults();

  const deps: DefineRoutesDeps = {
    isAllowed: (rule) => access.isAllowed(rule),
    // D11: the builder resolves a denied route's redirect target from the session,
    // so the access layer's already-computed sources are passed straight through.
    getSources: () => access.getSources(),
    errorElement,
    pendingElement,
    variant,
  };

  const appTree = defineRoutes(routes, deps);
  const outsideTree = outsideRoutes ? defineRoutes(outsideRoutes, deps) : [];

  const tree: RouteObject[] = [
    ...outsideTree,
    {
      id: "root",
      path: "/",
      element: shellElement,
      errorElement: backstopElement,
      // No loader on root or shell: the header and frame paint at once (R18).
      children: [
        {
          id: "root#hydrate",
          hydrateFallbackElement: hydrateFallbackElement ?? null,
          children: appTree,
        },
      ],
    },
  ];

  const router = initialEntries
    ? createMemoryRouter(tree, { initialEntries, basename })
    : createBrowserRouter(tree, { basename });

  // R11: match the href against the built tree, run the SAME rule and param checks
  // the loader would, and only then start each matched route's imports. A denied or
  // invalid href preloads nothing (principle 2).
  const unregisterPreloader = registerRoutePreloader((href) => {
    const url = new URL(href, window.location.origin);
    const matches = matchRoutes(router.routes, url.pathname, basename);

    if (!matches) return;

    // Pass 1: every matched route's whole rule chain and every present param must
    // pass before ANY preload runs. This is what stops one route's chunk
    // downloading when another route in the same match chain is denied.
    for (const match of matches) {
      const guard = (match.route.handle as { guard?: GuardMeta } | undefined)?.guard;
      if (!guard) continue;

      for (const rule of guard.rules) {
        if (!access.isAllowed(rule)) return;
      }

      const present: Record<string, string | undefined> = {};
      for (const key of Object.keys(guard.params)) present[key] = match.params[key];

      if (!areParamsValid(present, guard.params)) return;
    }

    // Pass 2: the checks passed for the whole chain, so start the work.
    // D3: the href's search params go with it, so a declaration can gate on
    // `?tab=` — `Tabs` renders only the active tab, so a tab-scoped query is
    // otherwise unreachable by path params alone.
    for (const match of matches) {
      const guard = (match.route.handle as { guard?: GuardMeta } | undefined)?.guard;
      if (!guard) continue;

      const present: Record<string, string | undefined> = {};
      for (const key of Object.keys(guard.params)) present[key] = match.params[key];

      guard.preload?.(present as ParsedParams, url.searchParams);
    }
  });

  // A successful navigation means the running bundle is current, so the
  // once-per-session stale-chunk guard is released (R8).
  const unsubscribeIdle = router.subscribe((state) => {
    if (state.navigation.state === "idle") clearStaleChunkFlag();
  });

  // R13: revalidate only when an access answer flips — never on session
  // identity. A denied page becomes reachable (or the reverse) without a reload.
  const unsubscribeSession = session.subscribe(() => {
    const flipped = access.syncFromState();
    if (flipped) void router.revalidate();
    previousResults = access.getResults();
  });

  // R33: dev-only timing. Guarded so a production bundle keeps neither the
  // recorder nor its buffer.
  const timing = import.meta.env.DEV ? createNavigationTiming() : null;
  const uninstallTiming = timing ? timing.install(router) : null;

  if (timing && typeof window !== "undefined") {
    (window as unknown as { __routeTimings?: unknown }).__routeTimings = timing;
    // D11: one call an operator can paste during a measurement run (phase 6).
    (window as unknown as { __routeMedians?: unknown }).__routeMedians = () =>
      timing.getMedians();
  }

  return {
    router,
    access,
    dispose() {
      unsubscribeSession();
      unsubscribeIdle();
      unregisterPreloader();
      uninstallTiming?.();
      void previousResults;
    },
  };
}
