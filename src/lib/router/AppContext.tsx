import { createContext, useContext, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import type { SessionState, SessionStore } from "./session";
import type { AccessLayer } from "./access";

const SessionContext = createContext<SessionStore | null>(null);

export function SessionProvider({
  session,
  children,
}: {
  session: SessionStore;
  children: ReactNode;
}) {
  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSessionStore(): SessionStore {
  const session = useContext(SessionContext);
  if (!session) {
    throw new Error(
      "[router] useSession was called outside <SessionProvider>. " +
        "Pass the store created by createSessionStore() to SessionProvider in main.tsx.",
    );
  }
  return session;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSession(): SessionState {
  const session = useSessionStore();
  return useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getSnapshot,
  );
}

const AccessContext = createContext<AccessLayer | null>(null);

export function AccessProvider({
  access,
  children,
}: {
  access: AccessLayer;
  children: ReactNode;
}) {
  return (
    <AccessContext.Provider value={access}>{children}</AccessContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAccessStore(): AccessLayer {
  const access = useContext(AccessContext);
  if (!access) {
    throw new Error("[router] useAccessStore was called outside <AccessProvider>.");
  }
  return access;
}
