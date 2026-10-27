# Router data prefetch — closing the coverage holes

Status: DRAFT

## Intent

The router already starts a page's work before the click: `AccessLink` → 100 ms hover →
`preloadRoute` → `matchRoutes` → rule/param checks → `guard.preload`. That mechanism is sound, but
its **data coverage** is not. Five holes mean the green light often arrives too late to matter:

1. `buildPreload` returns `undefined` for a route with no `page`/`layout`, so a **group** route's
   `prefetch` (e.g. the `host` section's apartments query) never runs on the intent path. It still
   runs in `makeLoader` at click time, so the hover window is wasted.
2. Only **one query per page** is declared. `/host/apartments/:id` prefetches the apartment, but
   assets, shots and reservations start on mount — after the chunk resolves and the route commits.
   That is a real waterfall.
3. `inspection/:id` has **no prefetch at all**, while the structurally identical `apartment/:id`
   does.
4. Prefetches use `staleTime: 30_000` while `queryClient` defaults to 15 min, so a hover after 30 s
   refetches a query the page still considers fresh — a wasted request.
5. `navigationTiming` closes its sample on `idle`, which is **chunk** time. The recorded numbers
   cannot show whether data arrived early, so the prefetch work is unverifiable.

This feature closes all five **and makes the coverage non-regressable**: a route's data
dependencies become declarative, and `npm run gate` fails when a page mounts a query that no route
in its match chain prefetches.

## Behaviour

No user-visible route, guard or component changes. What changes is *when* requests start. The
observable effect is a waterfall count of 0 and no loading skeleton on a warmed navigation.

| # | Route | Component | Guard | Data (query key) | States | i18n ns |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `/host/*` (section) | — (group) | `canOpenHost` | `APARTMENTS_GET_HOST` | n/a (no render) | n/a |
| 2 | `/host/dashboard` | `host/Dashboard` → `ApartmentSection` | `canOpenHost` | `APARTMENTS_GET_HOST` (inherited) | loading / empty / error / success | `general`, `assets` |
| 3 | `/host/apartments` | `host/ApartmentList` → `ApartmentSection` | `canOpenHost` | `APARTMENTS_GET_HOST` (inherited) | loading / empty / error / success | `general`, `assets` |
| 4 | `/host/apartments/:id` | `host/IndividualApartment` | `canOpenHost` | `APARTMENTS_GET_ID`, `ASSETS_GET_BY_APARTMENT`, `APARTMENT_SHOTS_GET_BY_APARTMENT`, `RESERVATIONS_GET_BY_APARTMENT` | loading / empty / error / success | `general`, `host` |
| 5 | `/admin/dashboard` | `admin/Dashboard` | `canOpenAdmin` | `USERS_GET_ALL` (default tab) + tab-conditional | loading / empty / error / success | `general` |
| 6 | `/inspection/:id` | `InspectionPage` | `public` | `INSPECTION_GET_BY_ID` | loading / error / success (no empty: an id always resolves or errors) | `assets`, `guest` |

## Data

No new endpoints. Every function already exists in `src/api/generated/requests/sdk.gen.ts`:
`getApartmentsHostMe`, `getApartmentsById`, `getAssetsApartmentByApartmentId`,
`getApartmentShotsApartmentByApartmentId`, `getReservationsApartmentByApartmentId`, `getInspectionsById`,
`getUsers`, `getApartments`, `getLocations`.

One `QUERY_ACTIONS` entry is added: `APARTMENT_SHOTS_GET_BY_APARTMENT` (today a string literal in
`IndividualApartment.tsx`, which invariant 5 forbids — closing hole 2 is the moment to register it).

All calls keep going through `withAuth()` — **except `/inspection/:id`, which must stay anonymous**
(D7). The inspection URL is shared by a host as a copy-link to a guest with no session, so
`withAuth()` there would attach `Bearer undefined`. Its prefetch therefore reproduces the page's
existing anonymous request exactly, which is what §4 requires.

Pre-existing and deliberately **not** changed (D20): the authenticated flows override `baseUrl` with
`VITE_BASE_URL`, while `/inspection/:id` and `postInspectionsByIdFlags` fall back to the generated
client's hardcoded host. Two different origins is a backend-contract question, not a prefetch one;
it is recorded and reported rather than silently unified.

## Invariants this must not break

The nine repo invariants in the kickoff skill. Feature-specific additions:

- **Route files stay data.** No route object gains `lazy`, `element`, `Component`, `ErrorBoundary`,
  or a hand-written `loader`. `prefetch` remains the only data hook a route file may declare.
- **Entry chunk stays under budget (94,208 bytes gzip).** A prefetch added to a route file pulls
  its request function into the eagerly-imported route module. The generated SDK is *already* in
  the entry chunk (verified: `apartments/host` and `apartments/{id}` literals are present in
  `dist/assets/index-*.js`), so the marginal cost is small — but it is measured, not assumed.
- **A prefetch never throws into the router.** Every prefetch is fire-and-forget (`void`) and
  catches, so a failed prefetch degrades to a normal in-page fetch — never a broken navigation.

## Out of scope

- Dropping the dead `recordCheck` capability from `defineRoutes` (declared, wired, used by no
  route). Decision D10.
- API-side cache tuning, timeouts, HTTP cache headers.
- A service worker precaching route chunks.
- Making `ProgressBar` reflect query-loading state — it stays navigation-only.
- Any change to route paths, guards, or the access rules.

## Open questions

None.
