# Routing Performance Playbook

The **execution** guide: take a basic React Router v7 data-mode router to the end state of the
[Routing Performance Reference](./routing-performance-reference.md), stage by stage. The reference says _what and why_
(technique ids `R1`…); this file says _in which order, which helpers to build (contracts H1–H17), and when a stage is
done_. Project-agnostic: replace the example's names with your app's.

---

## How to use this file

-   **Order is fixed.** Each stage relies on the previous one. Stage 7 and Stage 8 may run in parallel with 5–6.
-   **One stage = one or a few changes (MRs/PRs).** Never mix a behaviour change with a refactor in one change.
-   **Each stage:** entry criteria, steps, exit checks (`S2.3`…), pitfalls. Done = every exit check passes and its
    numbers are in the tracker (§11).
-   **Helpers** are specified as contracts in the [appendix](#appendix-helper-contracts): what they take, what they
    guarantee, edge cases, tests. Build them in your codebase; the sketches are illustrations, not drop-in code.
-   **Decide** marks a decision to write down (ADR or change description) before the stage's first change.

| Stage | Name                                 | Techniques             | Main win                               |
| ----- | ------------------------------------ | ---------------------- | -------------------------------------- |
| 0     | Baseline and measurement             | §1.4, H14              | numbers to beat                        |
| 1     | Session and synchronous access       | R2, R13                | checks cost 0 ms, no request per click |
| 2     | Route tree and guarded loaders       | R1, R3–R6, §3          | denied = no download, typed params     |
| 2b    | Incremental migration (big apps)     | R37                    | ship stage 2 section by section        |
| 3     | Shell: errors, pending, scroll, a11y | R7–R10, R33            | layout survives errors, no blank waits |
| 4     | Paths, links, preload, menus         | R11, R16, R20          | chunk loaded before the click          |
| 5     | Parallel data                        | §4, R12, R14, R15, R32 | no data waterfall                      |
| 6     | Startup, bundle, caching             | R17–R19, R35, R36      | fast first paint, cached assets        |
| 7     | URL ownership                        | R21–R26                | no hand-built URLs, no hidden routes   |
| 8     | Regression guards                    | R34                    | performance can't silently degrade     |
| 9     | Data-aware loaders                   | R27–R29                | 404/403 for records before render      |
| 10    | Platform                             | R30, R31               | React 19, Router v8, mode decision     |

---

## 0. Baseline and measurement

### 0.1 Entry

React Router v7 data mode (`createBrowserRouter` + `RouterProvider`). On v6: enable all v6 future flags, smoke-test,
upgrade in its own change.

### 0.2 Example starting router

```tsx
const router = createBrowserRouter([
    {
        path: '/',
        ErrorBoundary: ErrorPage,
        children: [
            { index: true, lazy: async () => ({ Component: (await import('./pages/FormPage')).default }) },
            { path: 'login', loader: () => redirectIfAuthenticated(), lazy: /* LoginPage */ },
            { path: 'update-password', lazy: /* PassUpdatePage */ },
            { path: 'inspection/:id', lazy: /* InspectionPage */ },
            { path: 'admin', loader: () => requireRoleGuard('admin'), element: <Outlet />, children: [{ path: 'dashboard', lazy: /* admin/Dashboard */ }] },
            {
                path: 'host',
                loader: () => requireRoleGuard('host'),
                element: <Outlet />,
                children: [
                    { path: 'dashboard', lazy: /* host/Dashboard */ },
                    { path: 'apartments', lazy: /* host/ApartmentList */ },
                    { path: 'apartments/:id', lazy: /* host/IndividualApartment */ },
                ],
            },
            { path: '*', element: <ErrorPage /> },
        ],
    },
]);
```

### 0.3 Findings (write yours in the same shape)

| #   | Finding                                                                                                                      | Cost                              | Stage |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ----- |
| F1  | `lazy` starts at match time, in parallel with `requireRoleGuard`: a host opening `/admin/dashboard` downloads the admin page | wasted bytes, code exposure       | 2     |
| F2  | Guards are async and run on every navigation, search-param changes included                                                  | wait A on every click             | 1, 2  |
| F3  | Guard only on the parent; a child loader added later wouldn't re-check                                                       | latent access hole                | 2     |
| F4  | `:id` params accept anything; pages fetch and handle errors themselves                                                       | wasted request, mixed 404 UX      | 2     |
| F5  | One root `ErrorBoundary`: any error replaces the whole app                                                                   | user loses navigation             | 3     |
| F6  | `*` renders outside any frame                                                                                                | dead end                          | 3     |
| F7  | No pending UI, scroll restoration, stale-chunk handling, focus management                                                    | blank waits, broken deploys, a11y | 3     |
| F8  | `/admin`, `/host` have no index: empty `<Outlet />`                                                                          | blank page                        | 2     |
| F9  | Every first visit waits for the chunk; every page waits chunk → render → fetch                                               | waits B + D                       | 4, 5  |
| F10 | Menus decide visibility separately from guards                                                                               | links that end in 403             | 1, 4  |

### 0.4 Steps

1. Add the navigation timing helper (H14) and content marks on 3 key pages.
2. Record: NT p75, CT p75 (3 pages), waterfall count, duplicate requests, LCP cold (Fast 4G), INP (field, if available),
   main bundle gzip, denied download bytes.
3. Set the bundle budget = current size.
4. Fill the findings table.

### 0.5 Exit checks

| Id   | Check                           |
| ---- | ------------------------------- |
| S0.1 | Tracker row 0 filled            |
| S0.2 | Bundle budget recorded          |
| S0.3 | Every finding mapped to a stage |

---

## 1. Session and synchronous access (R2, R13)

**Entry:** S0 done.

### Steps

1. **Bootstrap once.** Before creating the router: one request for user, role, permissions, modules, flags → session
   store. Anonymous visitors get an empty session, not an error. Render the app only after it.
2. **Access layer (H3):** sources selector, rules per area, `isAllowed`, `useAccessRule`, results snapshot.
3. **Rules for the example:** `public` (every visitor), `canUseApp` (logged in), `canOpenAdmin` (logged in + admin),
   `canOpenHost` (logged in + host). Each rule self-contained.
4. **Lint:** role and permission literals only inside the rule files.
5. **Tests:** names unique and `can…`; a table test for each rule with more than one check.

**Decide:** authentication vs access. Which routes need a login (example: is `update-password` login-only? is the form
public?); what an anonymous user sees on a login-only route: a 403 page with a "Log in" action, or a redirect to
`/login?next=<url>` (the only redirect allowed, since it is about identity, not permission).

### Exit checks

| Id   | Check                                                           |
| ---- | --------------------------------------------------------------- |
| S1.1 | Navigating sends no session/role request                        |
| S1.2 | No role/permission literal outside the rule files (lint passes) |
| S1.3 | Rule tables green                                               |

**Pitfalls:** a rule needing data that arrives after startup; rules importing the API client.

---

## 2. Route tree and guarded loaders (R1, R3–R6)

**Entry:** S1 done. Big app: read §2b first.

### Steps

1. Build H1 (params), H4 (route kinds), H6 (redirects), H5 (`defineRoutes`), following reference §3 for the shape.
2. **Rewrite the config.** The example after:

    ```ts
    const hostRoutes = {
        path: 'host',
        requires: 'canOpenHost',
        layout: () => import('./sections/host/HostLayout'), // frame + sidebar + <Outlet />
        children: [
            { index: true, loader: redirectTo('dashboard') }, // F8
            { path: 'dashboard', page: () => import('./pages/host/Dashboard') },
            { path: 'apartments', page: () => import('./pages/host/ApartmentList') },
            { path: 'apartments/:id', params: { id: 'number' }, page: () => import('./pages/host/IndividualApartment') },
        ],
    } satisfies SectionRoute;

    const appRoutes: AppRoute[] = [
        { index: true, requires: 'public', page: () => import('./pages/FormPage') },
        { path: 'update-password', requires: 'canUseApp', page: () => import('./pages/PassUpdatePage') }, // per S1 decision
        { path: 'inspection/:id', requires: 'public', params: { id: 'uuid' }, page: () => import('./pages/InspectionPage') }, // Decide the type
        adminRoutes,
        hostRoutes,
        { path: '*', requires: 'public', page: () => import('./NotFoundPage') },
    ];

    // public tree, outside the shell; synchronous auth redirect, no request
    const publicRoutes = [{ path: 'login', loader: () => (isAuthenticated() ? redirect('/') : null), lazy: /* or page via defineRoutes with 'public' */ }];
    ```

3. **Static tree test (H13):** section roots have a rule; every `:param` typed; no fixed redirect to a stricter or
   missing child; `firstAllowed` targets consistent; no duplicate sibling paths or ids.
4. **Lint:** ban route `lazy` and `React.lazy` in the router folder (public routes may opt out explicitly).

### Exit checks

| Id   | Check                                                                           |
| ---- | ------------------------------------------------------------------------------- |
| S2.1 | Host opens `/admin/dashboard`: 403 at that URL, 0 bytes of admin page code (F1) |
| S2.2 | `/host/apartments/abc`: 404, no chunk, no API request (F4)                      |
| S2.3 | `/host` lands on `/host/dashboard` (F8)                                         |
| S2.4 | A filter change runs no loader; `navigation.state` stays `idle`                 |
| S2.5 | Layout and page chunks start downloading at the same time                       |
| S2.6 | H13 green; the builder throws on an untyped `:param` and on a duplicate id      |

**Pitfalls:** a child loader checking only its own rule (F3); awaiting data in a loader; `element:` creeping back.

---

## 2b. Incremental migration (R37, big apps only)

**Entry:** S1 done; the app has many sections or nested `<Routes>`.

1. **Wrap first.** Switch to `createBrowserRouter` with one splat route rendering the existing `<Routes>` tree inside the
   shell: `[{ path: '/', element: <Shell/>, children: [{ path: '*', element: <LegacyRoutes/> }] }]`. Behaviour
   unchanged; data APIs (`useNavigation`, `useBlocker`, `ScrollRestoration`) now work.
2. **Move section by section.** For each section: add its config to `appRoutes` (Stage 2 shape); delete it from the
   legacy tree. A section not migrated yet but needing a guard: `{ path: 'x/*', requires: 'canX', page: () =>
import('./legacy/XRoutes') }`.
3. **During the transition**, breadcrumbs/menus read the built tree; legacy sections under `x/*` show their base crumb
   only. Accept it or keep the old breadcrumb source for legacy sections until they move.
4. **Old URLs** that move get redirect routes: one rule, keep the rest of the path and the query; denied → 403, not a
   redirect.
5. **Per-section checklist** (copy into each change): denied user → 403 and no chunk; invalid param → 404; index lands
   where it did; filters don't run loaders; menu shown ⇔ route opens; breadcrumbs unchanged on the deepest pages;
   unsaved-changes prompts still fire.
6. **Done** when the legacy splat is gone.

---

## 3. Shell: errors, pending, scroll, a11y (R7–R10, R33)

**Entry:** S2 (or the 2b wrapper) done.

### Steps

1. **Root tree:** `[...publicRoutes, { id: 'root', path: '/', element: <Shell/>, errorElement: <Backstop/>, children: [{
id: 'root#boundary', errorElement: <RouteError/>, children: defineRoutes(appRoutes, deps) }] }]`. The `*` route lives
   inside, so 404s keep the shell (F6).
2. **Route error element (H12):** 403 / 404 views from thrown statuses; chunk-load error → one reload; anything else →
   crash view + error reporting. Builder adds a boundary under every layout (F5).
3. **Shell:** progress bar after 200 ms of `loading`; `<ScrollRestoration getKey={(l) => l.pathname} />`; `NavLink`
   pending styling; route focus + announcer (H17).
4. **Stale chunks:** bundler preload-error event → same once-per-session reload.

### Exit checks

| Id   | Check                                                                                       |
| ---- | ------------------------------------------------------------------------------------------- |
| S3.1 | Error in `ApartmentList`: host sidebar and header stay                                      |
| S3.2 | Unknown URL: 404 inside the shell                                                           |
| S3.3 | Slow 4G: item highlights at once, bar after ~200 ms, old page stays                         |
| S3.4 | Back/forward restores scroll; new page at top; filter change doesn't scroll                 |
| S3.5 | Deploy with a changed page while a tab is open: one reload, then the page, no loop          |
| S3.6 | Screen reader announces the new page title; focus lands on the main heading; not on filters |

---

## 4. Paths, links, preload, menus (R11, R16, R20)

**Entry:** S3 done. First stage users clearly _feel_.

### Steps

1. **Path definitions (H2)** for every linkable URL: `requires` = every inherited rule, root first; `params` = route types.

    ```ts
    const hostPaths = definePaths({
        section: { pattern: '/host', requires: ['canOpenHost'], params: {} },
        apartment: { pattern: '/host/apartments/:id', requires: ['canOpenHost'], params: { id: 'number' } },
    });
    ```

    Extend H13: each definition matches a route, its inherited rules and its params.

2. **Preload (H7, H8):** registry registered by the router factory; links import only the registry.
3. **Links (H10):** `AccessLink`, `useAccessPath`. Menus/sidebars: items `{ label, path }`, filtered by `canOpenPath`,
   rendered with `NavLink` + `usePreloadRoute`. Delete every visibility condition in menu code (F10).
4. **Convert links by traffic:** menu, sidebars, dashboard tiles, list → detail links first.
5. **Beyond intent (R16):** viewport preload on primary CTAs; idle preload of 2–3 likely next routes (skip on `saveData` / 2G).

### Exit checks

| Id   | Check                                                                |
| ---- | -------------------------------------------------------------------- |
| S4.1 | Hover 100 ms on a menu item: chunk downloads; click: no progress bar |
| S4.2 | Admin sees no host links; links to denied pages render as text       |
| S4.3 | Denied links preload nothing                                         |
| S4.4 | NT p75 < 100 ms on menu/sidebar navigations (warm)                   |
| S4.5 | H13 checks path definitions                                          |

---

## 5. Parallel data (§4 of the reference, R12, R14, R15, R32)

**Entry:** S4 done. **Decide** the data track (reference §4): A query cache, B adopt one, C router data.

### Steps

1. **Track B only:** add a query cache; migrate each heavy page's main load from `useEffect`/`fetch` to it.
2. **Prefetch:** routes declare `prefetch(params)` typed by their path definition; the builder calls it after the
   checks (not awaited) and from `preload`.

    ```ts
    { path: 'apartments/:id', params: { id: 'number' }, page: () => import('./pages/host/IndividualApartment'),
      prefetch: ({ id }) => startQuery(apartmentQuery(id)) } // same key/args as the page's hook; not awaited
    ```

3. **Pick candidates** from S0: main request > 200 ms, or nothing useful renders without it. One prefetch per page,
   main query only.
4. **Section data (R15):** lookups every host page needs → `prefetch` on the host layout route.
5. **Cache settings:** freshness window 10–60 s for prefetched queries; retention ≥ a few minutes.
6. **Track C only:** loaders return `{ main: fetchX(params) }` unawaited; pages use `<Await>` / `use()`; accept that
   hover preloads chunks only.

### Exit checks

| Id   | Check                                                                   |
| ---- | ----------------------------------------------------------------------- |
| S5.1 | Apartment detail: API request starts with the chunk (waterfall count 0) |
| S5.2 | Sent once (no duplicate from the page's hook, no refetch on mount)      |
| S5.3 | Hover then click: data already cached; CT p75 down by ≥ chunk time      |
| S5.4 | Denied or invalid URL starts no request                                 |

---

## 6. Startup, bundle, caching (R17–R19, R35, R36)

**Entry:** S5 done.

### Steps

1. **Bootstrap:** one session request; config, translations, theme in parallel; render as soon as the rules can run.
2. **Shell paints first (R18):** `hydrateFallbackElement={<PageSkeleton/>}` on `root#boundary`; no loader on root or
   shell.
3. **Bundle:** analyse; move heavy imports out of root, shell, route config and access layer; vendor chunks; remove
   library barrels; CI budget (§8).
4. **Server:** immutable caching for hashed assets, `no-cache` for `index.html`, compression.
5. **Beyond (R36):** static shell skeleton + critical CSS in `index.html`; session injected into the HTML; `preconnect`
   to the API.

### Exit checks

| Id   | Check                                                      |
| ---- | ---------------------------------------------------------- |
| S6.1 | Cold deep link: header before the page chunk; no 403 flash |
| S6.2 | One request level before the router starts                 |
| S6.3 | Main bundle below budget by the agreed amount              |
| S6.4 | Repeat visit: only `index.html` and API from the network   |
| S6.5 | LCP cold (Fast 4G) < 2.5 s                                 |

---

## 7. URL ownership (R21–R26)

**Entry:** S4 done. Small changes per area, smallest first.

1. Template-string hrefs → `buildPath` / `AccessLink`; `navigate(x)` → `navigate(buildPath(...))`.
2. `useParams` → `useRouteParams(path)`.
3. Nested `<Routes>` → config children; tabs as routes with `preventScrollReset` and preload.
4. Breadcrumbs and title from `handle` (H15).
5. `useBlockWhenDirty` (H16) for forms.
6. Trial view transitions on one section.
7. Component-level role checks → `useAccessRule`; delete old helpers; lint locks it.

| Id   | Check                                                 |
| ---- | ----------------------------------------------------- |
| S7.1 | No template-string app paths; no `Number(useParams()` |
| S7.2 | No nested `<Routes>` in pages                         |
| S7.3 | No role/permission checks outside the access layer    |

---

## 8. Regression guards (R34)

**Entry:** S6 done (start the bundle budget in S0 already).

1. **CI static checks:** H13 tree test, rule tables, lint rules (no `lazy`, no role literals, no `react-router-dom`
   later).
2. **Router behaviour tests** on a memory router built by the real factory with a test session: 403 without importing
   (spy on the page import), 404 on bad params, redirects, access flip → revalidate, search change → no loader, preload
   skips denied.
3. **Bundle budget** in CI (fail above it).
4. **Lab budget:** Lighthouse CI (or similar) on 3–5 key URLs, cold and with a warm navigation script; budgets for LCP,
   total JS, request count.
5. **Field metrics:** web-vitals (LCP, INP, CLS) + NT/CT from H14 to analytics; dashboard and alert on p75 regressions.

| Id   | Check                                                  |
| ---- | ------------------------------------------------------ |
| S8.1 | A PR that adds a heavy import to the shell fails CI    |
| S8.2 | A PR that adds `lazy` or a role literal fails lint     |
| S8.3 | Field dashboard shows NT, CT, LCP, INP p75 per release |

---

## 9. Data-aware loaders (R27–R29)

**Entry:** S5 and S7 done. **Decide** (relaxes principle 5): loaders may await one record call.

1. Routes for single records declare `recordCheck(params, { signal })`; the builder awaits it **in parallel with the
   import**, after rule and param checks. 404 from "not found", 403 from a record rule (R28).
2. Pages drop their own "not found / not allowed" branches.
3. Middleware (where your version supports it) for analytics page views and H14 timing; never for access.

| Id   | Check                                                                              |
| ---- | ---------------------------------------------------------------------------------- |
| S9.1 | Deleted apartment id → route 404 inside the layout; the page has no own 404 branch |
| S9.2 | One request per record per navigation; interrupted navigation cancels it           |
| S9.3 | NT p75 unchanged on warm (preloaded) navigations                                   |

---

## 10. Platform (R30, R31)

1. React 19 (its own project).
2. React Router v8.
3. **Decide** framework vs data mode: prototype one section both ways; compare S4/S5/S6 numbers; the guard must still
   prevent downloads for denied users.
4. Import only from `react-router`; lint bans `react-router-dom`.
5. R31 only if the tree is very large (measure the config's share of the main bundle first).

---

## Final checklist (top-performant state)

| Area        | Check                                                                                  |
| ----------- | -------------------------------------------------------------------------------------- |
| Access      | 0 requests, ~0 ms checks; denied = 403 in place, 0 bytes downloaded                    |
| Tree        | Four route kinds only; static test green; ids stable; variants filtered by the builder |
| Params      | Every `:param` typed; invalid = 404 before download                                    |
| Code        | Intent preload on every navigation surface; no progress bar on warm navigations        |
| Data        | Heavy pages start their main query with the chunk; one request per query; no refetch   |
| Search      | Filters/paging run no loaders; typing stays responsive                                 |
| Errors      | Layout survives errors; stale chunks recover with one reload                           |
| First load  | Shell paints before page loaders; main bundle under budget; hashed assets immutable    |
| URLs        | No hand-built paths, untyped params or nested `<Routes>`                               |
| A11y        | Focus and announcement on every page change                                            |
| Consistency | Menu shown ⇔ route opens, for every rule                                               |
| Guards      | CI fails on bundle, lint and tree regressions; field p75 alerts                        |
| Metrics     | NT p75 < 100 ms warm, CT p75 < 500 ms, LCP < 2.5 s cold, INP < 200 ms                  |

---

## 11. Progress tracker

| Stage | Changes | NT p75 | CT p75 (3 pages) | Waterfalls | Dup. requests | LCP cold | Main gz | Exit checks | Notes |
| ----- | ------- | ------ | ---------------- | ---------- | ------------- | -------- | ------- | ----------- | ----- |
| 0     |         |        |                  |            |               |          |         |             |       |
| 1     |         |        |                  |            |               |          |         |             |       |
| 2/2b  |         |        |                  |            |               |          |         |             |       |
| 3     |         |        |                  |            |               |          |         |             |       |
| 4     |         |        |                  |            |               |          |         |             |       |
| 5     |         |        |                  |            |               |          |         |             |       |
| 6     |         |        |                  |            |               |          |         |             |       |
| 7     |         |        |                  |            |               |          |         |             |       |
| 8     |         |        |                  |            |               |          |         |             |       |
| 9     |         |        |                  |            |               |          |         |             |       |
| 10    |         |        |                  |            |               |          |         |             |       |

---

## Appendix: helper contracts

Each helper: **purpose**, **contract** (inputs, outputs, guarantees), **edge cases**, **tests**. Names are suggestions.
Keep the router module importable only by the app entry; everything that features need (paths, params, preload
registry, links, access hooks) lives outside it.

### H1. Param types

-   **Purpose:** declare, validate, parse and stringify route params.
-   **Contract:** `ParamType = 'number' | 'uuid' | 'numbersList' | 'name' | { oneOf: readonly string[] }`.
    `isValidParam(value, type)`: `number` = digits within the safe integer range; `uuid` = RFC 4122 shape;
    `numbersList` = `1,2,3`; `name` = `[\w.-]+`; `oneOf` = membership. `parseParam` → `number`, `number[]`, `string` or
    the union. `stringifyParam` reverses it. `areParamsValid(params, types)`, `parseParams(params, types)`.
-   **Edge cases:** missing value is invalid unless the segment is optional (`:x?`) and absent; no free `string` type.
-   **Tests:** table per type with valid/invalid values; round trip parse ↔ stringify.

### H2. Path definitions and `buildPath`

-   **Purpose:** one typed description of each linkable URL.
-   **Contract:** `PathDefinition<P, R> = { pattern: P; requires: readonly R[]; params: { [K in PathParam<P>]: ParamType } }`.
    `definePaths(map)` returns the map unchanged with literal types and **fails to compile** when `params` keys differ
    from the pattern's params. `buildPath(path, params)` stringifies per type and calls `generatePath`; params of
    optional segments may be omitted; paths without params take no argument.
-   **Edge cases:** splat pages are defined by their base pattern; app-relative patterns (no basename).
-   **Tests:** type tests (missing / extra param fails); `buildPath` with optional and list params.

### H3. Access layer

-   **Purpose:** the only code that turns session data into yes/no answers.
-   **Contract:** input `AccessStore<S> = { getSnapshot(): S; subscribe(cb): () => void }` (adapts any store: Redux,
    Zustand, a signal, a plain emitter). `selectSources(S) → AccessSources` (memoized; booleans, sets, ids only).
    `rules: Record<Name, (sources) => boolean>` grouped by area, names unique. Exposes: `isAllowed(name)`,
    `getResults()` (memoized `Record<Name, boolean>`, same object while sources are unchanged), `useAccessRule(name)`
    (`useSyncExternalStore`), `canOpenPath(path)` / `useCanOpenPath(path)` = every rule in `path.requires` passes.
-   **Edge cases:** absent session data maps to `false`/`undefined` in sources, never inside rules; `public` always true.
-   **Tests:** unique names; `can…` naming; a table per combined rule.

### H4. Route kinds

-   **Purpose:** the only shapes app code may write.
-   **Contract:** common fields `requires?: RuleName` (one), `params?: Record<string, ParamType>`, `variants?: string[]`,
    `handle?` (crumb data; never `guard`). **Page** `{ path | index, page: () => Promise<{ default: ComponentType }>,
prefetch?, recordCheck?, children? }`. **Layout** `{ path?, layout: () => Promise<...>, prefetch?, children }`.
    **Group** `{ path, children }`. **Redirect** `{ index: true, loader: RedirectSpec }`. `SectionRoute` = page/layout/group
    with mandatory `path` and `requires`.
-   **Edge cases:** sibling routes with different `params` keys may need a type annotation instead of `satisfies`
    (TypeScript widens the union).

### H5. `defineRoutes(routes, deps)`

-   **Purpose:** turn H4 routes into React Router `RouteObject`s with guards.
-   **Contract:** `deps = { isAllowed(rule): boolean; errorElement: ReactNode; variant?: string; parent? }`. For each
    route: compute full pattern, inherited rules (root first), inherited params, optional params; derive the id; throw
    on a duplicate id or a `:param` / `params` mismatch; write `handle.guard = { pattern, rules, params, optionalParams,
redirect?, preload? }`; set `shouldRevalidate` (R6). Drop routes not in `variant`.

    -   **Page/layout loader:** check all rules → `throw data(null, { status: 403 })`; check present params → 404; call
        `prefetch(parsedParams)` without awaiting; `await Promise.all([loadComponent(), recordCheck?.(parsed, { signal })])`;
        return `null`. `Component` renders the cached module (throws if rendered before its loader: a programming error).
        `preload(params)` = prefetch + `loadComponent()` with errors swallowed (the loader retries).
    -   **Layout:** children wrapped in a pathless `{ id: '<id>#boundary', errorElement, children }`.
    -   **Group:** a loader only when it adds a rule or params.
    -   **Redirect:** loader checks, then `throw redirect(resolveRedirect(spec, params))`.

    ```tsx
    // core of the page/layout branch (illustration)
    const loader = async ({ params, request }) => {
        if (!guard.rules.every(deps.isAllowed)) throw data(null, { status: 403 });
        if (!areParamsValid(params, presentParamTypes(guard, params))) throw data(null, { status: 404 });
        const parsed = parseParams(params, presentParamTypes(guard, params));
        route.prefetch?.(parsed);
        await Promise.all([loadComponent(), route.recordCheck?.(parsed, { signal: request.signal })]);
        return null;
    };
    ```

-   **Tests:** denied → 403 and the import function never called; bad param → 404; parent rule enforced by child loader;
    duplicate id and untyped param throw at build; search-only change doesn't revalidate; variant filtering drops a
    sub-tree when an ancestor isn't marked.

### H6. Redirect specs

-   **Purpose:** collector redirects as data, so tests can check targets.
-   **Contract:** `redirectTo(to, { search? })` — `to` relative (resolved against the parent pattern with current params)
    or absolute app path, or a function for env-based root targets; `search` a static record or a function. Incoming
    search and hash are dropped. `firstAllowed([{ rule, to }])` — first passing target, none → 403.
-   **Tests:** relative/absolute resolution; search preset; `firstAllowed` order and 403.

### H7. Preload registry and preloader

-   **Purpose:** let any link start a route's work without importing the router.
-   **Contract:** registry module: `registerRoutePreloader(fn) → unregister` (unregister leaves a newer one in place),
    `preloadRoute(href)` (no-op without a registered preloader). Preloader: strip search/hash; `matchRoutes(router.routes,
pathname, basename?)`; for every matched route with a guard, run rule and present-param checks; if **all** pass,
    call each `guard.preload(params)`. With R31, run route discovery first.
-   **Tests:** allowed href calls preload; denied or invalid href calls nothing; unknown href is a no-op.

### H8. `usePreloadRoute(href, enabled)`

-   **Contract:** returns `{ onMouseEnter, onMouseLeave, onFocus, onBlur, onPointerDown }`. Hover/focus held 100 ms →
    `preloadRoute(href)`; `pointerdown` → immediately; leave/blur cancels; disabled → no-ops; timers cleared on unmount.
-   **Tests:** fake timers: 100 ms fires, 50 ms + leave doesn't, disabled never.

### H9. `useRouteParams(path)`

-   **Contract:** reads `useParams()`, validates against `path.params`, returns parsed, typed values (memoized). Invalid
    or missing → throws (the hook is used under the wrong route).

### H10. `AccessLink` and `useAccessPath`

-   **Contract:** `useAccessPath(path, params?) → { href, canOpen }`. `AccessLink` props = `Link` props minus `to`, plus
    `to: PathDefinition`, `params` (required when the path has params), `search?`. Renders children as plain text when
    `!canOpen`; otherwise a `Link` with H8 handlers. Menu items and sidebar items are thin variants over `NavLink`.
-   **Tests:** href built; text when denied; search appended; hover preload.

### H11. Router factory

-   **Purpose:** the one place that builds and wires the router.
-   **Contract:** `createAppRouter({ access, routesFactory, basename?, initialEntries? }) → { router, dispose }`.
    `initialEntries` set → `createMemoryRouter` (tests), else `createBrowserRouter`. Wires: H5 tree; access subscription
    that compares `getResults()` with the previous snapshot and calls `router.revalidate()` only on a flip (R13); H7
    preloader registration; bundler preload-error listener (H12); stale-chunk flag clear after a successful idle
    navigation; H14 timing. `dispose` undoes all. Called once at app start, after bootstrap, never at module level.
-   **Tests:** access flip revalidates (denied page shows the page), unrelated session change doesn't.

### H12. Route error element and stale chunks

-   **Contract:** `isRouteErrorResponse` 403/404 → status views. Chunk-load error (message matches the browsers'
    dynamic-import failures) and no reload yet this session → set `sessionStorage` flag, reload, render nothing.
    Otherwise → crash view and report the error once. Flag cleared by H11 after a successful navigation; storage
    failures mean "no reload" (never loop).
-   **Tests:** 403/404 views; chunk error reloads once; second chunk error shows the crash view.

### H13. Static tree checker

-   **Purpose:** catch config mistakes in CI without rendering.
-   **Contract:** build the tree with a stub `isAllowed`; walk every `handle.guard`; return readable problem strings for:
    section root without rules; fixed redirect to a stricter or missing child; `firstAllowed` target whose inherited rules
    ≠ collector rules + its rule; duplicate sibling paths; path definitions whose pattern has no route (splats matched by
    base), whose `requires` ≠ inherited rules, or whose `params` ≠ route params. Run for every build variant. Collect path
    definitions automatically (glob), not by a hand list.
-   **Tests:** each check proven on a small fixture that violates it.

### H14. Navigation timing

-   **Contract:** subscribe to the router; mark on `idle → loading|submitting`, measure on return to `idle`; report
    `{ duration, pathname, pattern }` (pattern from the matched guards, so URLs with ids aggregate). Pages mark content
    time when their main query first has data. Later moved to middleware (R29).

### H15. Breadcrumbs and title from `handle`

-   **Contract:** each route's `handle.crumb` = a translation key, or an entity label resolver for param routes, or
    `false` to skip. `useBreadcrumbs()` maps `useMatches()` to `{ label, href?, canOpen }`; crumbs for routes without a
    page (groups) have no href; denied crumbs are text. Document title = last one or two labels.

### H16. `useBlockWhenDirty(isDirty)`

-   **Contract:** `useBlocker(({ currentLocation, nextLocation }) => isDirty && currentLocation.pathname !==
nextLocation.pathname)`; shows a confirm dialog; proceed/reset. Never mounted twice at once (one blocker per router).

### H17. Route focus and announcer

-   **Contract:** on pathname change (not first render, not search-only), after render: focus the main heading or
    `<main tabIndex={-1}>` without scrolling (`preventScroll`), and write the new document title into a visually hidden
    `aria-live="polite"` region.
-   **Tests:** navigation moves focus and updates the live region; a filter change does neither.
