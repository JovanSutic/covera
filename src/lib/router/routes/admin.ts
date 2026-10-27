import type { SectionRoute } from "../defineRoutes";

export const adminRoutes: SectionRoute = {
  path: "admin",
  requires: "canOpenAdmin",
  children: [
    { index: true, loader: { to: "dashboard" } },
    {
      path: "dashboard",
      page: () => import("@/pages/admin/Dashboard"),
      handle: { crumb: "adminDashboard.title" },
    },
  ],
};
