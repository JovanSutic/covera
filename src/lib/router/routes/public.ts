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
  {
    // D4: the zero-auth field portal, rendered OUTSIDE the app shell — the same
    // tree as /login and /update-password, and for the same reason: it is reached
    // before any session exists. Blueprint View B requires "completely isolated
    // views lacking navigation panels"; in `appRoutes` this page would carry the
    // Header, its nav links and its language switcher.
    //
    // `requires: "public"` rather than a bespoke rule: the 32-hex token in the path
    // is the only credential, and the API authenticates it (`404 FIELD_TOKEN_INVALID`
    // for unknown, expired and already-used alike). A malformed token never reaches
    // the API — `hex32` (D6) rejects it in the loader, so the router's own 404
    // renders instead of the portal's "link unusable" screen. Those are different
    // states and the user must be able to tell them apart.
    path: "field/incident/:token",
    requires: "public",
    params: { token: "hex32" },
    page: () => import("@/pages/FieldIncidentPage"),
    // D12: the read is anonymous and every parameter it needs is in the URL, so it
    // starts on the cold load rather than after the chunk. This is the ONLY
    // declaration the portal needs — the two writes it makes are mutations, and a
    // prefetch of a write is meaningless (D13).
    data: [{ resource: "fieldIngest", params: (params) => ({ token: String(params.token) }) }],
    handle: { crumb: "fieldIncidentPage.title" },
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
