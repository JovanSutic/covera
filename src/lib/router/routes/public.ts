import type { RouteNode } from "../defineRoutes";

// Rendered OUTSIDE the app shell: reached before a session exists, so there is no
// header to show and no section to frame (§3). They share the root backstop.
export const outsideRoutes: readonly RouteNode[] = [
  {
    path: "login",
    requires: "public",
    page: () => import("@/pages/LoginPage"),
    handle: { crumb: "login.welcome" },
  },
  {
    path: "update-password",
    requires: "public",
    page: () => import("@/pages/PassUpdatePage"),
    handle: { crumb: "login.passUpdate.welcomeGeneric" },
  },
];

// Rendered INSIDE the app shell. The `*` route lives here on purpose: an unknown
// URL then renders a 404 with the header and frame intact (F6, D20).
export const appRoutes: readonly RouteNode[] = [
  {
    index: true,
    requires: "public",
    page: () => import("@/pages/FormPage"),
    handle: { crumb: "header.signIn" },
  },
  {
    path: "inspection/:id",
    requires: "public",
    params: { id: "uuid" },
    page: () => import("@/pages/InspectionPage"),
    handle: { crumb: "guest:inspectionIntroduction.title" },
  },
  {
    path: "*",
    requires: "public",
    page: () => import("@/components/router/NotFoundPage"),
    handle: { crumb: "errorPage.notFoundTitle" },
  },
];
