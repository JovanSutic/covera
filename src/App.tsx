import { RouterProvider } from "react-router";

import { useSessionStore } from "./lib/router/AppContext";
import { AccessProvider } from "./lib/router/AppContext";
import { createAccess } from "./lib/router/access";
import { createAppRouter } from "./lib/router/createAppRouter";
import {
  adminRoutes,
  appRoutes,
  hostRoutes,
  outsideRoutes,
} from "./lib/router/routes";
import { Shell } from "./components/router/Shell";
import { RouteError } from "./components/router/RouteError";
import { PageSkeleton } from "./components/router/PageSkeleton";
import { ErrorPage } from "./pages/ErrorPage";

export default function App() {
  const session = useSessionStore();
  const access = createAccess(session.getSnapshot);

  const { router } = createAppRouter({
    session,
    access,
    routes: [...appRoutes, adminRoutes, hostRoutes],
    outsideRoutes,
    errorElement: <RouteError />,
    backstopElement: <ErrorPage />,
    shellElement: <Shell />,
    hydrateFallbackElement: <PageSkeleton />,
  });

  return (
    <AccessProvider access={access}>
      <RouterProvider router={router} />
    </AccessProvider>
  );
}
