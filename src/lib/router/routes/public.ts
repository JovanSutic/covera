import type { RouteNode } from "../defineRoutes";
import { dashboardPathForRole } from "../access";

// Rendered OUTSIDE the app shell: reached before a session exists, so there is no
// header to show and no section to frame (§3). They share the root backstop.
export const outsideRoutes: readonly RouteNode[] = [
  {
    path: "login",
    // Login-only: a signed-in visitor is sent to their role's dashboard rather than
    // being offered a form that would sign them in on top of a live session
    // (login-redirect D1). Identity, not permission — the 403-in-place rule for a
    // role mismatch is untouched (D2).
    requires: "isAnonymous",
    page: () => import("@/pages/LoginPage"),
    denyRedirect: (sources) => dashboardPathForRole(sources.role ?? "guest"),
    handle: { crumb: "login.welcome" },
  },
  {
    // Deliberately still public: reached from an emailed invite link BEFORE a
    // session exists, so a login guard would lock out the flow it serves (D6).
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
    // Hole 3: this route had no prefetch at all while the structurally identical
    // apartment route did. D7: the query stays ANONYMOUS — this URL is shared to a
    // guest with no session.
    data: [{ resource: "inspection", params: (params) => ({ id: String(params.id) }) }],
    handle: { crumb: "guest:inspectionIntroduction.title" },
  },
  {
    // D2/D8: TOP LEVEL, not under the `host` section. The section carries
    // `requires: "canOpenHost"` as a rule every child inherits, so a guide page
    // nested there could only ever be host-only without restructuring the section.
    // At top level the route owns its own rule, and the future capability guard
    // (the host-issued `?openFor=` identifier) replaces exactly this line.
    path: "inspection-guide/:apartmentId/:reservationId",
    requires: "canOpenHost",
    params: { apartmentId: "uuid", reservationId: "uuid" },
    page: () => import("@/pages/InspectionGuidePage"),
    // Both reads are declared from URL params alone — which is the whole reason
    // D2 keeps `apartmentId` in the pattern. Without it the shots request could not
    // start until the reservation resolved, serialising the cold load.
    data: [
      { resource: "reservation", params: (params) => ({ id: String(params.reservationId) }) },
      { resource: "shots", params: (params) => ({ apartmentId: String(params.apartmentId) }) },
    ],
    handle: { crumb: "inspectionGuidePage.title" },
  },
  {
    path: "*",
    requires: "public",
    page: () => import("@/components/router/NotFoundPage"),
    handle: { crumb: "errorPage.notFoundTitle" },
  },
];
