import type { AuthenticatedUser, UserRole } from "@/lib/auth";

export interface SessionState {
  status: "loading" | "ready";
  user: AuthenticatedUser | null;
  role: UserRole | null;
}

export interface SessionStore {
  getSnapshot(): SessionState;
  subscribe(listener: () => void): () => void;
  bootstrap(): Promise<SessionState>;
  refresh(): Promise<SessionState>;
}

export interface SessionStoreOptions {
  readUser: () => Promise<AuthenticatedUser | null>;
}

const LOADING: SessionState = { status: "loading", user: null, role: null };

export function createSessionStore({
  readUser,
}: SessionStoreOptions): SessionStore {
  let state: SessionState = LOADING;
  const listeners = new Set<() => void>();

  const emit = () => {
    for (const listener of [...listeners]) listener();
  };

  const load = async (): Promise<SessionState> => {
    const user = await readUser();
    state = { status: "ready", user, role: user?.role ?? null };
    emit();
    return state;
  };

  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    bootstrap: load,
    refresh: load,
  };
}
