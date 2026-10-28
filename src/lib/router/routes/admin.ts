import type { SectionRoute } from "../defineRoutes";

export const adminRoutes: SectionRoute = {
  path: "admin",
  requires: "canOpenAdmin",
  children: [
    { index: true, loader: { to: "dashboard" } },
    {
      path: "dashboard",
      page: () => import("@/pages/admin/Dashboard"),
      // D9: the default tab's data always; the other tab's only when the URL names
      // it. `Tabs` renders only the active tab, so eagerly prefetching both would
      // waste a request for a tab the viewer may never open.
      data: [
        {
          resource: "users",
          params: (_params, searchParams) =>
            (searchParams.get("tab") ?? "users") === "users" ? {} : null,
        },
        {
          resource: "apartmentsAll",
          params: (_params, searchParams) =>
            searchParams.get("tab") === "apartments" ? {} : null,
        },
        {
          resource: "locations",
          params: (_params, searchParams) =>
            searchParams.get("tab") === "apartments" ? {} : null,
        },
      ],
      handle: { crumb: "adminDashboard.title" },
    },
  ],
};
