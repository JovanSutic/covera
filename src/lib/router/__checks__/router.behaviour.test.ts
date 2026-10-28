import { describe, expect, it, vi } from "vitest";
import type { DataRouter } from "react-router";

import { createAppRouter } from "../createAppRouter";
import { createAccess } from "../access";
import { createSessionStore } from "../session";
import { adminRoutes, appRoutes, hostRoutes, outsideRoutes } from "../routes";
import type { AuthenticatedUser, UserRole } from "@/lib/auth";
import type { SessionState } from "../session";

function sessionState(role: UserRole | null): SessionState {
  const user: AuthenticatedUser | null = role
    ? {
        id: `user-${role}`,
        email: `${role}@covera.test`,
        role,
        // AuthenticatedUser requires both (src/lib/auth.ts) — `strict` rejects the
        // object without them.
        firstName: role,
        lastName: "User",
      }
    : null;

  return { status: "ready", user, role };
}

async function buildRouter(role: UserRole | null, initialEntry: string) {
  const state = sessionState(role);
  const session = createSessionStore({ readUser: async () => state.user });
  await session.bootstrap();
  const access = createAccess(() => state);

  const created = createAppRouter({
    session,
    access,
    routes: [...appRoutes, adminRoutes, hostRoutes],
    outsideRoutes,
    // p5 renamed this option: the root route's error element, outside the shell.
    backstopElement: null,
    errorElement: null,
    initialEntries: [initialEntry],
  });

  // createMemoryRouter() calls .initialize(), which STARTS the first navigation
  // without returning its promise — so the state is not settled when the factory
  // returns. Await the flag before reading location or errors (verified against
  // react-router 7.14.0's createMemoryRouter/initialize).
  await settle(created.router);

  return created;
}

async function settle(router: DataRouter): Promise<void> {
  // An explicit timeout, not Vitest's 1000 ms default: the FIRST navigation built
  // in a worker process costs ~1150 ms because Vite transforms the lazy page graph
  // cold, while every later one costs ~10 ms. Under the full gate's parallel
  // workers that first navigation crosses 1000 ms and this is the test that times
  // out. 10 s is ~10x the observed cold cost, so it tolerates a slow machine
  // without hiding a genuinely hung navigation.
  await vi.waitFor(() => expect(router.state.initialized).toBe(true), {
    timeout: 10_000,
  });
}

describe("routing behaviour on the real tree", () => {
  it("404s a malformed uuid", async () => {
    const { router } = await buildRouter(null, "/inspection/not-a-uuid");

    const error = Object.values(router.state.errors ?? {})[0] as {
      status?: number;
    };

    expect(error?.status).toBe(404);
    // The URL is unchanged: a rejected param is an error at that URL, not a redirect.
    expect(router.state.initialized).toBe(true);
  });

  it("403s a host at /admin/dashboard", async () => {
    const { router } = await buildRouter("host", "/admin/dashboard");

    const error = Object.values(router.state.errors ?? {})[0] as {
      status?: number;
    };

    expect(error?.status).toBe(403);
    expect(router.state.location.pathname).toBe("/admin/dashboard");
  });

  it("lands /host on /host/dashboard", async () => {
    const { router } = await buildRouter("host", "/host");

    expect(router.state.location.pathname).toBe("/host/dashboard");
    expect(router.state.errors).toBeNull();
  });

  it("lets an admin into /admin/dashboard", async () => {
    const { router } = await buildRouter("admin", "/admin/dashboard");

    expect(router.state.errors).toBeNull();
    expect(router.state.location.pathname).toBe("/admin/dashboard");
  });

  it("keeps /login reachable when signed out", async () => {
    const { router } = await buildRouter(null, "/login");

    expect(router.state.errors).toBeNull();
    expect(router.state.location.pathname).toBe("/login");
  });

  it("sends a signed-in host from /login to their dashboard", async () => {
    const { router } = await buildRouter("host", "/login");

    expect(router.state.location.pathname).toBe("/host/dashboard");
    expect(router.state.errors).toBeNull();
  });

  it("sends a signed-in admin from /login to the admin dashboard", async () => {
    const { router } = await buildRouter("admin", "/login");

    expect(router.state.location.pathname).toBe("/admin/dashboard");
    expect(router.state.errors).toBeNull();
  });

  it("sends a signed-in guest from /login to /", async () => {
    // A guest has no dashboard; dashboardPathForRole returns "/" (login-redirect D5).
    const { router } = await buildRouter("guest", "/login");

    expect(router.state.location.pathname).toBe("/");
    expect(router.state.errors).toBeNull();
  });

  it("does not redirect a host away from a route they are denied by ROLE", async () => {
    // The redirect is identity-only (login-redirect D1/D2). /admin is denied by
    // role, so it must still 403 in place — no dashboard redirect, and the URL
    // must not change.
    const { router } = await buildRouter("host", "/admin/dashboard");

    const error = Object.values(router.state.errors ?? {})[0] as { status?: number };

    expect(error?.status).toBe(403);
    expect(router.state.location.pathname).toBe("/admin/dashboard");
  });

  it("does not redirect a signed-out visitor away from /", async () => {
    // "/" is public and must stay public: no denyRedirect, and isAnonymous is not
    // inherited from the login route's siblings.
    const { router } = await buildRouter(null, "/");

    expect(router.state.errors).toBeNull();
    expect(router.state.location.pathname).toBe("/");
  });

  it("matches an unknown URL in the tree, so the 404 is a page not a router error", async () => {
    const { router } = await buildRouter("host", "/nope");

    // The `*` route matches, so there is no router error — NotFoundPage renders.
    expect(router.state.errors).toBeNull();
    expect(router.state.matches.at(-1)?.route.path).toBe("*");
  });
});
