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
    {
      // A SIBLING of apartments/:id, not a child of it — and this is load-bearing.
      // A child route renders into its parent's <Outlet />, and
      // IndividualApartment.tsx has no <Outlet /> (grep -rn "Outlet" src/ finds one
      // occurrence, in Shell.tsx). Nested as a child, this route's loader would run,
      // the URL would match, and the page would never mount — a blank screen that
      // still passes every gate check. The URL still NESTS because the pattern is
      // written out in full.
      path: "apartments/:id/reservations/:reservationId",
      params: { id: "uuid", reservationId: "uuid" },
      page: () => import("@/pages/host/ReservationPage"),
      // The photo reads are declared but resolve to null (D10/D12): the photos are
      // loaded only when the host opens the proof control, and a declaration that
      // returns null is how this registry says "not on this navigation" (registry.ts).
      data: [
        { resource: "reservation", params: (params) => ({ id: String(params.reservationId) }) },
        { resource: "inspection", params: () => null },
        { resource: "reservationPhotos", params: () => null },
      ],
      handle: { crumb: "reservationPage.title" },
    },
  ],
};
