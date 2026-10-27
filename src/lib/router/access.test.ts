import { describe, expect, it } from "vitest";
import { ACCESS_RULES, createAccess, selectSources } from "./access";
import type { RuleName } from "./access";
import type { SessionState } from "./session";
import type { AuthenticatedUser, UserRole } from "@/lib/auth";

function stateFor(role: UserRole | null): SessionState {
  const user: AuthenticatedUser | null = role
    ? {
        id: `user-${role}`,
        email: `${role}@covera.test`,
        role,
        firstName: role,
        lastName: "User",
      }
    : null;

  return { status: "ready", user, role };
}

const ANONYMOUS = stateFor(null);

describe("rule registry", () => {
  it("gives every rule a unique name", () => {
    const names = Object.keys(ACCESS_RULES);
    expect(new Set(names).size).toBe(names.length);
  });

  it("names every rule can… or public", () => {
    for (const name of Object.keys(ACCESS_RULES)) {
      expect(name === "public" || name.startsWith("can")).toBe(true);
    }
  });
});

describe("rule tables", () => {
  it.each([
    ["public", null, true],
    ["public", "guest", true],
    ["public", "host", true],
    ["public", "admin", true],
    ["canUseApp", null, false],
    ["canUseApp", "guest", true],
    ["canUseApp", "host", true],
    ["canUseApp", "admin", true],
    ["canOpenHost", null, false],
    ["canOpenHost", "guest", false],
    ["canOpenHost", "host", true],
    ["canOpenHost", "admin", false],
    ["canOpenAdmin", null, false],
    ["canOpenAdmin", "guest", false],
    ["canOpenAdmin", "host", false],
    ["canOpenAdmin", "admin", true],
  ] as const)("%s with role %s → %s", (rule, role, expected) => {
    const sources = selectSources(stateFor(role));

    expect(ACCESS_RULES[rule as RuleName](sources)).toBe(expected);
  });
});

describe("selectSources", () => {
  it("maps an absent user to false and null, never to a default role", () => {
    expect(selectSources(ANONYMOUS)).toEqual({
      isAuthenticated: false,
      role: null,
      isAdmin: false,
      isHost: false,
      userId: null,
    });
  });
});

describe("createAccess", () => {
  it("answers synchronously from the snapshot it was built with", () => {
    const access = createAccess(() => stateFor("host"));

    expect(access.isAllowed("canOpenHost")).toBe(true);
    expect(access.isAllowed("canOpenAdmin")).toBe(false);
  });

  it("returns the same results object while the session is unchanged", () => {
    const access = createAccess(() => stateFor("host"));

    expect(access.getResults()).toBe(access.getResults());
  });

  it("requires every inherited rule for canOpenPath", () => {
    const access = createAccess(() => stateFor("host"));

    expect(
      access.canOpenPath({
        pattern: "/host/apartments/:id",
        requires: ["public", "canOpenHost"],
        params: { id: "uuid" },
      }),
    ).toBe(true);

    expect(
      access.canOpenPath({
        pattern: "/admin/dashboard",
        requires: ["public", "canOpenAdmin"],
        params: {},
      }),
    ).toBe(false);
  });

  it("reports a flip only when a result actually changes", () => {
    let state = stateFor("host");
    const access = createAccess(() => state);

    expect(access.syncFromState()).toBe(false);

    state = { ...state };
    expect(access.syncFromState()).toBe(false);

    state = stateFor("admin");
    expect(access.syncFromState()).toBe(true);
    expect(access.isAllowed("canOpenAdmin")).toBe(true);
    expect(access.isAllowed("canOpenHost")).toBe(false);

    expect(access.syncFromState()).toBe(false);
  });

  it("notifies subscribers only on a flip", () => {
    let state = stateFor("host");
    const access = createAccess(() => state);
    let notifications = 0;

    access.subscribe(() => {
      notifications += 1;
    });

    state = { ...state };
    access.syncFromState();
    expect(notifications).toBe(0);

    state = stateFor("admin");
    access.syncFromState();
    expect(notifications).toBe(1);
  });
});
