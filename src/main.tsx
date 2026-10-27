import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

import App from "./App";
import "./index.css";
import "./i18n.tsx";
import { getAuthUserFromJwt } from "./lib/auth";
import { createSessionStore } from "./lib/router/session";
import { SessionProvider } from "./lib/router/AppContext";
import { queryClient } from "./lib/api/queryClient";

async function start() {
  const session = createSessionStore({ readUser: getAuthUserFromJwt });

  // One session read, before the router exists. Every access check reads this
  // snapshot synchronously; none of them performs a request.
  await session.bootstrap();

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <Toaster closeButton position="top-center" richColors />
        <SessionProvider session={session}>
          <App />
        </SessionProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
}

void start();
