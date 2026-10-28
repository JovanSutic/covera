import type { SectionRoute } from "../defineRoutes";

export const hostRoutes: SectionRoute = {
  path: "host",
  requires: "canOpenHost",
  // R15: apartment data every host page needs, started once for the section.
  // D4/phase 2: this now actually runs on the hover path — the route is a group
  // with no `page`, and the old builder bailed on exactly that shape (hole 1).
  data: [{ resource: "apartmentsHost", params: () => ({}) }],
  children: [
    { index: true, loader: { to: "dashboard" } },
    {
      path: "dashboard",
      page: () => import("@/pages/host/Dashboard"),
      handle: { crumb: "hostDashboard.title" },
    },
    {
      path: "apartments",
      page: () => import("@/pages/host/ApartmentList"),
      handle: { crumb: "hostApartments.title" },
    },
    {
      path: "apartments/:id",
      params: { id: "uuid" },
      page: () => import("@/pages/host/IndividualApartment"),
      // D8: ALL FOUR queries this page reads, not just the apartment. Prefetching
      // one left three mount-time requests after the chunk — the dominant
      // waterfall on this route (hole 2).
      data: [
        { resource: "apartment", params: (params) => ({ id: String(params.id) }) },
        { resource: "assets", params: (params) => ({ apartmentId: String(params.id) }) },
        { resource: "shots", params: (params) => ({ apartmentId: String(params.id) }) },
        { resource: "reservations", params: (params) => ({ apartmentId: String(params.id) }) },
      ],
      handle: { crumb: "apartmentPage.tabs.ariaLabel" },
    },
  ],
};
