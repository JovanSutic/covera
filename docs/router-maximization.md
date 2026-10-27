# Router maximization

Status: APPROVED

## Intent

`covera` navigates through a React Router 7 data-mode tree that was written by hand in
`src/App.tsx`: every route uses `lazy`, both authenticated sections sit behind an **async**
`requireRoleGuard()` that awaits a Supabase call and then **redirects** on a role mismatch, and every
page renders its own `<Header />`. The result is that a navigation pays an auth round trip before it
does anything, a denied user still downloads the page they were denied, an invalid `:id` reaches the
API, and no page's code or data starts before the click.

This feature rebuilds the routing layer to the end state described in
[the playbook](./routing-performance-playbook.md): a static typed route tree built by a factory, a
synchronous access layer loaded once at startup, guarded loaders that refuse before anything
downloads, intent preload, prefetched data, a shell that survives errors and paints first, and local
regression guards. It follows playbook stages 0–8 in order. Stages 9 (data-aware loaders) and 10
(platform) are out of scope.

The user-visible intent, in the operator's words: **moving between pages should stop making the
app wait, and a page you are not allowed to open should never be downloaded.**

## Behaviour

What is true after this lands. "Guard" is the access rule that protects the URL.

| # | Route | Component | Guard | Data (query key) | States | i18n ns |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `/` | `src/pages/FormPage.tsx` | `public` | none | unchanged | `general` |
| 2 | `/login` | `src/pages/LoginPage.tsx` | `public`, outside the shell | none | unchanged. Authenticated visitor still leaves for their dashboard | `general` |
| 3 | `/update-password` | `src/pages/PassUpdatePage.tsx` | `public`, outside the shell | none | unchanged | `general` |
| 4 | `/inspection/:id` | `src/pages/InspectionPage.tsx` | `public` | `QUERY_ACTIONS.INSPECTION_GET_BY_ID` | unchanged; `:id` is typed `uuid`, so a malformed id is a 404 before the chunk loads | `guest`, `assets` |
| 5 | `/admin/dashboard` | `src/pages/admin/Dashboard.tsx` | `canOpenAdmin` | `QUERY_ACTIONS.USERS_GET_ALL`, `APARTMENTS_GET_ALL` | **new**: a non-admin sees a 403 **at this URL** with 0 bytes of admin code downloaded (was: a redirect to `/host/dashboard`) | `general` |
| 6 | `/host` | index redirect | `canOpenHost` | none | **new**: lands on `/host/dashboard` (was: blank `<Outlet />`) | — |
| 7 | `/host/dashboard` | `src/pages/host/Dashboard.tsx` | `canOpenHost` | `QUERY_ACTIONS.APARTMENTS_GET_HOST` | unchanged | `general`, `assets` |
| 8 | `/host/apartments` | `src/pages/host/ApartmentList.tsx` | `canOpenHost` | `QUERY_ACTIONS.APARTMENTS_GET_HOST` | unchanged | `general`, `assets` |
| 9 | `/host/apartments/:id` | `src/pages/host/IndividualApartment.tsx` | `canOpenHost` | `QUERY_ACTIONS.APARTMENTS_GET_ID` (prefetched), `ASSETS_GET_BY_APARTMENT`, `RESERVATIONS_GET_BY_APARTMENT`, `["APARTMENT_SHOTS_GET_BY_APARTMENT", id]` | unchanged; `:id` typed `uuid`; the main apartment query starts with the chunk instead of after it | `general`, `assets` |
| 10 | `*` | `src/components/router/NotFoundPage.tsx` | `public` | none | **new**: 404 rendered **inside the shell** (was: rendered with no frame) | `general` |

Every row keeps its existing data states (loading / empty / error / success). Rows 5, 6, 9 and 10
are the only observable changes, and each is intended and listed in `decisions.md`.

## Data

No backend change. No regeneration of `src/api/generated/`. Every request the feature touches already
exists:

- `getApartmentsById` — `src/api/generated/requests/sdk.gen.ts`, `GET /apartments/{id}`, `path.id: string`
  with `format: 'uuid'` in `schemas.gen.ts`. This is the request phase 6 prefetches.
- `getApartmentsHostMe`, `getApartmentsById`, `getAssetsApartmentByApartmentId`,
  `getReservationsApartmentByApartmentId`, `getApartmentShotsApartmentByApartmentId`,
  `getInspectionsById`.
- No new `QUERY_ACTIONS` entry is needed. Phase 6 adds `src/lib/api/queries/apartment.ts`, which
  re-exports the apartment detail query's `queryKey` + `queryFn` so that the route `prefetch` and the
  page's `useQuery` use **one** definition (the "same key = same args" rule, playbook §4).

## Invariants this feature must not break

1. `src/api/generated/` is not hand-edited.
2. No hardcoded user-facing string: every label goes through `t()`, and every key exists in `en`,
   `de`, `tr` and `sr-Latn`. This feature adds exactly four keys (`errorPage.forbiddenTitle`,
   `errorPage.forbiddenSubtitle`, `errorPage.reloadFailedTitle`, `errorPage.reloadFailedSubtitle`) to
   `general.json` in all four locales, with the translations given verbatim in phase 4.
3. No secret in a `VITE_` env var.
4. **Invariant 4 is deliberately replaced** (D5): routes no longer live in `src/App.tsx` and
   authenticated branches are no longer behind `requireRoleGuard()`. Routes live in
   `src/lib/router/routes/*.ts` as typed data; access is enforced by the guarded loader the builder
   writes. `src/App.tsx` survives as the component that mounts the router. This is the one
   established rule this feature changes, and it must be called out in the PR.
5. Query keys come from `QUERY_ACTIONS`; no string literals at call sites. (`IndividualApartment`'s
   `["APARTMENT_SHOTS_GET_BY_APARTMENT", id]` predates this feature and is left alone — see D19.)
6. Network calls go through `withAuth()` / `publicApi()`.
7. Mutations invalidate what they changed.
8. Forms validate with a zod schema through `@hookform/resolvers`.
9. **Feature-specific:** a role or permission literal appears only inside `src/lib/router/access.ts`
   (D7); no route in `src/lib/router/` uses `lazy`, `element`, `Component`, `ErrorBoundary` or a
   hand-written `loader` outside `defineRoutes` (D8); every `:param` has a declared `ParamType` (D4);
   nothing in the router module is created at module level (D6).

## Out of scope

- **Playbook stage 9** — data-aware loaders (`recordCheck`, R27–R29). No loader awaits data.
- **Playbook stage 10** — the React Router v8 upgrade (v8 is not installed; the lockfile has 7.14.0),
  the framework-mode-vs-data-mode decision, and `patchRoutesOnNavigation` (R31).
- **Playbook stage 2b** — incremental migration (R37). The app has 13 routes and no nested
  `<Routes>`, so there is nothing to migrate incrementally (D23).
- **Tabs become routes** (R22's tab clause). `src/components/Tabs.tsx` keeps its `?tab=` search param
  with `replace: true`; R6 makes it loader-free, which is the part that costs time. Recorded as D20.
- **View transitions** (R25) — deferred, D21.
- **Unsaved-changes blocking** (R24 / H16) — deferred. No form in this app currently blocks, and
  adding blocking to a drawer form is a behaviour change nobody asked for. Recorded as D22.
- **i18n delivery changes.** Locale JSON keeps loading over the network through
  `i18next-http-backend`; `src/i18n.tsx` is not modified. Recorded as D23.
- **Breadcrumb *UI*.** The app has no breadcrumb component, so H15 lands only as document-title
  derivation from `handle`, which is the visible half. Recorded as D24.
- **Server-side caching headers** (R35). There is no deploy config in this repo
  (no netlify/vercel/Dockerfile/nginx), so phase 7 documents the headers and does not configure a
  host. Recorded as D25.
- **A new CI pipeline.** The repo has no CI and no git hooks. Guards land as tests inside `npm run
  gate` plus one standalone `npm run perf:bundle`. Recorded as D26.

## Open questions

None.
