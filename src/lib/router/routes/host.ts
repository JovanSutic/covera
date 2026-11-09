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
        // Phase 5's `ReservationIncidentSection` reads the apartment's claim list on
        // this page. Declared here, in the phase that owns this file, because
        // `prefetchCoverage.test.ts` requires a page's route chain to declare every
        // hook the page reads — and a declaration with no consumer costs one request
        // on a navigation that is about to make it anyway.
        { resource: "incidents", params: (params) => ({ apartmentId: String(params.id) }) },
        // The photo reads stay declared-but-null (D10/D12): loaded only when the host
        // opens the proof control, and a declaration that returns null is how this
        // registry says "not on this navigation" (registry.ts).
        { resource: "inspection", params: () => null },
        { resource: "reservationPhotos", params: () => null },
      ],
      handle: { crumb: "reservationPage.title" },
    },
    {
      // D3: a THIRD SIBLING, written out in full for the same reason as the node
      // above — `IndividualApartment.tsx` has no <Outlet />, so a nested route would
      // render nothing while passing every check.
      path: "apartments/:id/reservations/:reservationId/incident",
      params: { id: "uuid", reservationId: "uuid" },
      page: () => import("@/pages/host/IncidentPage"),
      // Four declarations, and the reason each is here:
      //   reservation  — the guest's name and the apartment, from the URL alone
      //   assets       — the item picker's options, from the URL alone
      //   incidents    — the apartment's claim list, which is how this page finds
      //                  ITS claim: there is no incident-by-reservation endpoint
      //                  (D11), so the match is client-side over this read
      //   incident     — the claim and its items. `params: () => null` because the
      //                  id is not in the URL and cannot be known until the list
      //                  resolves. This is a declaration for the coverage check, not
      //                  a prefetch, and the page's own `useIncident` owns that read.
      data: [
        { resource: "reservation", params: (params) => ({ id: String(params.reservationId) }) },
        { resource: "assets", params: (params) => ({ apartmentId: String(params.id) }) },
        { resource: "incidents", params: (params) => ({ apartmentId: String(params.id) }) },
        { resource: "incident", params: () => null },
      ],
      handle: { crumb: "incidentPage.title" },
    },
  ],
};
