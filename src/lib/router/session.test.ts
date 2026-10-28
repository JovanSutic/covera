import { describe, expect, it, vi } from "vitest";
import { createSessionStore } from "./session";
import type { AuthenticatedUser } from "@/lib/auth";

const HOST: AuthenticatedUser = {
  id: "user-1",
  email: "host@covera.test",
  role: "host",
  firstName: "Host",
  lastName: "User",
};

describe("createSessionStore", () => {
  it("starts loading with no user and no role", () => {
    const store = createSessionStore({ readUser: async () => null });

    expect(store.getSnapshot()).toEqual({
      status: "loading",
      user: null,
      role: null,
    });
  });

  it("maps an anonymous reader to a ready snapshot with no user", async () => {
    const store = createSessionStore({ readUser: async () => null });

    await expect(store.bootstrap()).resolves.toEqual({
      status: "ready",
      user: null,
      role: null,
    });
  });

  it("derives the role from the authenticated user", async () => {
    const store = createSessionStore({ readUser: async () => HOST });

    const state = await store.bootstrap();

    expect(state.status).toBe("ready");
    expect(state.user).toEqual(HOST);
    expect(state.role).toBe("host");
  });

  it("notifies subscribers once per change and stops after unsubscribe", async () => {
    const store = createSessionStore({ readUser: async () => HOST });
    const listener = vi.fn();

    const unsubscribe = store.subscribe(listener);
    await store.bootstrap();
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    await store.refresh();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("reads the user again on refresh, so a role change is observable", async () => {
    const readUser = vi
      .fn<() => Promise<AuthenticatedUser | null>>()
      .mockResolvedValueOnce(HOST)
      .mockResolvedValueOnce({ ...HOST, role: "admin" });

    const store = createSessionStore({ readUser });

    await store.bootstrap();
    expect(store.getSnapshot().role).toBe("host");

    await store.refresh();
    expect(store.getSnapshot().role).toBe("admin");
    expect(readUser).toHaveBeenCalledTimes(2);
  });

  it("clears the user on refresh after a sign-out, so a stale role cannot leak", async () => {
    let user: AuthenticatedUser | null = HOST;

    const store = createSessionStore({ readUser: async () => user });
    await store.bootstrap();

    expect(store.getSnapshot().user?.role).toBe("host");

    // What supabase.auth.signOut() leaves behind: the next read returns no user.
    // handleLogout awaits this before navigating to /login.
    user = null;
    const after = await store.refresh();

    expect(after.user).toBeNull();
    expect(after.role).toBeNull();
    expect(store.getSnapshot().user).toBeNull();
  });
});
