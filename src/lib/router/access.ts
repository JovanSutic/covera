import type { SessionState } from "./session";
import type { ParamsDeclaration } from "./params";
import type { UserRole } from "@/lib/auth";

export interface AccessSources {
  isAuthenticated: boolean;
  role: UserRole | null;
  isAdmin: boolean;
  isHost: boolean;
  userId: string | null;
}

export function selectSources(state: SessionState): AccessSources {
  const role = state.user?.role ?? null;

  return {
    isAuthenticated: state.user !== null,
    role,
    isAdmin: role === "admin",
    isHost: role === "host",
    userId: state.user?.id ?? null,
  };
}

export const ACCESS_RULES = {
  public: () => true,
  /**
   * The complement of `canUseApp`, and deliberately not a reuse of it: a signed-in
   * GUEST passes `canUseApp`, so that rule cannot express "no session". /login is
   * the only route that requires this (login-redirect D8).
   */
  isAnonymous: (sources: AccessSources) => !sources.isAuthenticated,
  canUseApp: (sources: AccessSources) => sources.isAuthenticated,
  canOpenAdmin: (sources: AccessSources) =>
    sources.isAuthenticated && sources.isAdmin,
  canOpenHost: (sources: AccessSources) =>
    sources.isAuthenticated && sources.isHost,
} as const;

export type RuleName = keyof typeof ACCESS_RULES;

export interface PathRequirement {
  pattern: string;
  requires: readonly RuleName[];
  params: ParamsDeclaration;
}

/** Where a signed-in user of this role belongs after signing in (D9). */
export function dashboardPathForRole(role: UserRole): string {
  if (role === "admin" || role === "host") return `/${role}/dashboard`;
  return "/";
}

export interface AccessLayer {
  isAllowed(rule: RuleName): boolean;
  canOpenPath(path: PathRequirement): boolean;
  getResults(): Record<RuleName, boolean>;
  getSources(): AccessSources;
  subscribe(listener: () => void): () => void;
  syncFromState(): boolean;
}

export function createAccess(getState: () => SessionState): AccessLayer {
  let state = getState();
  let sources = selectSources(state);
  let results = evaluate(sources);
  const listeners = new Set<() => void>();

  function evaluate(nextSources: AccessSources): Record<RuleName, boolean> {
    const evaluated = {} as Record<RuleName, boolean>;
    for (const name of Object.keys(ACCESS_RULES) as RuleName[]) {
      evaluated[name] = ACCESS_RULES[name](nextSources);
    }
    return evaluated;
  }

  // Re-reads the session and recomputes every result. Returns true only when at
  // least one boolean flipped — the router revalidates on that, never on
  // object identity (R13).
  function syncFromState(): boolean {
    const nextState = getState();
    if (nextState === state) return false;

    state = nextState;
    sources = selectSources(nextState);
    const nextResults = evaluate(sources);
    const flipped = (Object.keys(nextResults) as RuleName[]).some(
      (name) => nextResults[name] !== results[name],
    );
    results = nextResults;

    if (flipped) {
      for (const listener of [...listeners]) listener();
    }

    return flipped;
  }

  return {
    isAllowed: (rule) => results[rule],
    canOpenPath: (path) => path.requires.every((rule) => results[rule]),
    getResults: () => results,
    getSources: () => sources,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    syncFromState,
  };
}
