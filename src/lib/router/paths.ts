import { generatePath } from "react-router";
import type { PathParam, ParamsDeclaration, ParamType } from "./params";
import { stringifyParam } from "./params";
import type { RuleName } from "./access";

export interface PathDefinition<
  P extends string = string,
  R extends readonly RuleName[] = readonly RuleName[],
> {
  pattern: P;
  requires: R;
  params: ParamsDeclaration;
}

/** Compile-time guard: the declared params must be exactly the pattern's params. */
type ParamKeysMatch<
  P extends string,
  Decl extends ParamsDeclaration,
> = PathParam<P> extends never
  ? keyof Decl extends never
    ? true
    : { error: "params declared for a pattern with no :params" }
  : Exclude<PathParam<P>, keyof Decl> extends never
    ? Exclude<keyof Decl, PathParam<P>> extends never
      ? true
      : { error: "params has a key the pattern does not contain" }
    : { error: "a :param in the pattern has no declared type" };

export function definePaths<
  const M extends Record<string, { pattern: string; requires: readonly RuleName[]; params: ParamsDeclaration }>,
>(
  map: M & { [K in keyof M]: ParamKeysMatch<M[K]["pattern"], M[K]["params"]> extends true ? unknown : ParamKeysMatch<M[K]["pattern"], M[K]["params"]> },
): M {
  return map;
}

export type ParamsFor<D extends PathDefinition> = {
  [K in keyof D["params"]]: D["params"][K] extends "number" | "numbersList"
    ? number | number[]
    : string;
};

/**
 * The only href builder in the app. `params` is required exactly when the
 * pattern has `:params`; a pattern without params takes no second argument.
 */
export function buildPath<D extends PathDefinition>(
  definition: D,
  ...args: keyof D["params"] extends never ? [] : [params: ParamsFor<D>]
): string {
  const params = (args[0] ?? {}) as Record<string, string | number | number[]>;
  const typed: Record<string, string> = {};

  for (const [key, type] of Object.entries(definition.params) as [string, ParamType][]) {
    const value = params[key];
    typed[key] = stringifyParam(value, type);
  }

  return generatePath(definition.pattern, typed);
}

/**
 * Every linkable URL (H2). `requires` lists the full inherited chain, so a menu can
 * ask one question and never render a link that ends in a 403.
 * The H13 static check (phase 9) asserts each of these against the built tree.
 */
export const appPaths = definePaths({
  root: { pattern: "/", requires: ["public"], params: {} },
  login: { pattern: "/login", requires: ["isAnonymous"], params: {} },
  updatePassword: { pattern: "/update-password", requires: ["public"], params: {} },
  inspection: {
    pattern: "/inspection/:id",
    requires: ["public"],
    params: { id: "uuid" },
  },
  inspectionGuide: {
    pattern: "/inspection-guide/:apartmentId/:reservationId",
    requires: ["canOpenHost"],
    params: { apartmentId: "uuid", reservationId: "uuid" },
  },
  adminDashboard: {
    pattern: "/admin/dashboard",
    requires: ["canOpenAdmin"],
    params: {},
  },
  hostDashboard: {
    pattern: "/host/dashboard",
    requires: ["canOpenHost"],
    params: {},
  },
  hostApartments: {
    pattern: "/host/apartments",
    requires: ["canOpenHost"],
    params: {},
  },
  hostApartment: {
    pattern: "/host/apartments/:id",
    requires: ["canOpenHost"],
    params: { id: "uuid" },
  },
  hostReservation: {
    pattern: "/host/apartments/:id/reservations/:reservationId",
    requires: ["canOpenHost"],
    params: { id: "uuid", reservationId: "uuid" },
  },
  // D3: the claim page, a THIRD SIBLING under `host` — not a child of
  // `hostReservation`. Same reason the reservation route is not a child of
  // `apartments/:id`: a child renders into its parent's <Outlet />, and
  // `IndividualApartment.tsx` has no <Outlet /> (grep -rn "Outlet" src/ finds one
  // occurrence, in Shell.tsx). Nesting would match the URL, run the loader, and
  // render nothing — a blank screen that passes every gate check. The URL nests
  // because the pattern is written out in full.
  incidentClaim: {
    pattern: "/host/apartments/:id/reservations/:reservationId/incident",
    requires: ["canOpenHost"],
    params: { id: "uuid", reservationId: "uuid" },
  },
  // D4/D6: the zero-auth field portal. `public` is the honest rule — the token in
  // the path IS the credential, and there is no session to check. It lives in
  // `outsideRoutes` (routes/public.ts), which is the tree rendered without the app
  // shell, so this entry's built route has no inherited rules and `requires` is
  // exactly `["public"]` (tree.test.ts asserts that equality).
  fieldIncident: {
    pattern: "/field/incident/:token",
    requires: ["public"],
    params: { token: "hex32" },
  },
} as const);
