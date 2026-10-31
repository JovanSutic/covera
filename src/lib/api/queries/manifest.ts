import * as admin from "./admin";
import * as apartment from "./apartment";
import * as assets from "./assets";
import * as inspection from "./inspection";
import * as reservation from "./reservation";
import * as reservationPhotos from "./reservationPhotos";
import * as reservations from "./reservations";
import * as shots from "./shots";
import { QUERY_RESOURCES } from "./registry";

/**
 * D12: every data-reading hook the app has, named. The coverage check
 * (`src/lib/router/__checks__/prefetchCoverage.test.ts`) treats a page's imports
 * of these names as its data surface, and requires the page's route to declare
 * them.
 *
 * The value is the **resource name**, not the module basename. It has to be: the
 * check compares it against the `resource: "…"` literals a route declares, and
 * those are drawn from `QUERY_RESOURCES`' key space (`ResourceName`). A module
 * basename is a different vocabulary — `admin.ts` alone owns three resources
 * (`users`, `apartmentsAll`, `locations`) — so pairing them would let a page that
 * reads `useApartmentsAll` pass on a route declaring only `users`.
 *
 * This is a module map, not a hand-written list: a new query module is added here
 * once, and from then on any page that forgets to declare it fails the gate.
 */
const MODULES = { admin, apartment, assets, inspection, reservation, reservationPhotos, reservations, shots } as const;

/** The definition object → the resource name `QUERY_RESOURCES` registers it under. */
const RESOURCE_NAME_BY_DEFINITION = new Map<unknown, string>(
  Object.entries(QUERY_RESOURCES).map(([name, definition]) => [definition, name]),
);

/**
 * resource name → the module basename whose exports include its definition.
 * Matched by object identity: `QUERY_RESOURCES` holds the very objects the query
 * modules export, so this reads the ownership rather than restating it.
 */
function resourceOwners(): Record<string, string> {
  const owners: Record<string, string> = {};

  for (const [moduleName, moduleExports] of Object.entries(MODULES)) {
    for (const value of Object.values(moduleExports)) {
      const name = RESOURCE_NAME_BY_DEFINITION.get(value);
      if (name) owners[name] = moduleName;
    }
  }

  return owners;
}

function collectHooks(): Record<string, string> {
  const owners = resourceOwners();
  const hooks: Record<string, string> = {};

  for (const [moduleName, moduleExports] of Object.entries(MODULES)) {
    for (const [exportName, value] of Object.entries(moduleExports)) {
      // A query hook is a `useX` function — `use` followed by an uppercase letter.
      // NOT `startsWith("use")`: `usersQueryKey` and `usersResource` both begin
      // with those three letters, and crediting a page that imports a key builder
      // with a data read is precisely the vacuous match D22 exists to reject.
      // Fetchers (`fetchX`) and key builders (`xQueryKey`) are likewise not data
      // surface: a component that builds a key for an invalidation is not starting
      // a request (§4).
      if (!/^use[A-Z]/.test(exportName) || typeof value !== "function") continue;

      // `useApartmentsHost` reads the resource `apartmentsHost`. The name is
      // VERIFIED against `QUERY_RESOURCES`, not assumed: the resource must be
      // registered AND its definition must be exported by this same module. A
      // hook that does not resolve throws here, at load, rather than quietly
      // crediting a page with the wrong resource — the failure D22 guards against.
      const bare = exportName.slice("use".length);
      const resource = bare.charAt(0).toLowerCase() + bare.slice(1);

      if (owners[resource] !== moduleName) {
        throw new Error(
          `[manifest] ${moduleName}.${exportName} does not resolve to a registered ` +
            `resource: expected "${resource}" to be defined in ${moduleName}.ts ` +
            `(found ${owners[resource] ? `it in ${owners[resource]}.ts` : "no such resource"}). ` +
            `Rename the hook to match its resource, or register the resource in QUERY_RESOURCES.`,
        );
      }

      hooks[exportName] = resource;
    }
  }

  return hooks;
}

/** hook name → the resource name whose data it reads. */
export const QUERY_HOOKS: Readonly<Record<string, string>> = collectHooks();
