# Routing Performance Reference

The **what and why** of every technique that takes a React Router v7 **data-mode** app (`createBrowserRouter` +
`RouterProvider`) to maximum navigation and load performance: the route tree, guards, loaders, preloading, data,
startup, bundles, errors, URLs and the platform. Project-agnostic: no technique depends on a specific app, store or data
library.

-   **Use with:** [Routing Performance Playbook](./routing-performance-playbook.md), the **execution** guide. The reference
    explains each technique; the playbook orders the work, gives the helper contracts and the exit checks.
-   **Technique ids** (`R1`…) are stable. Playbook stages, MRs and reviews refer to them.
-   **Assumed starting point:** routes with `lazy`, async guard loaders (`requireRoleGuard()`), one root `ErrorBoundary`,
    data fetched inside pages. The playbook's §0 shows such a router.

---

## 0. Versions

| Need                                   | Minimum                    | Notes                                                                  |
| -------------------------------------- | -------------------------- | ---------------------------------------------------------------------- |
| Data mode, `data()`, `HydrateFallback` | React Router 7.0, React 18 | v6 → v7: turn on all v6 future flags first, upgrade in its own change  |
| `patchRoutesOnNavigation` (R31)        | 7.0                        | only for very large trees                                              |
| Route `middleware` (R29)               | 7.9                        | behind `future.v8_middleware`; check the release notes of your version |
| `useBlocker` (R24)                     | data mode                  | one active blocker per router                                          |
| `<Link viewTransition>` (R25)          | 7.0                        | browser support: progressive                                           |
| React Router v8 (R30)                  | React 19                   | upgrade React first                                                    |

Check every API name against the installed version's types before building on it.

---

## 1. The performance model

### 1.1 What a navigation costs

```
click ─▶ [A] checks ─▶ [B] code (chunk) ─▶ [C] render ─▶ [D] data request ─▶ [E] data render
          auth/role      import()            page mounts    query starts        content visible
```

| Wait            | Typical baseline                             | Removed / hidden by                                          |
| --------------- | -------------------------------------------- | ------------------------------------------------------------ |
| A. Checks       | async auth call per navigation (100–500 ms)  | R2 synchronous access, R6 no loaders on search changes       |
| B. Code         | chunk download (50–1000 ms, worse on mobile) | R11/R16 preload, R19 smaller chunks, R35 long-term caching   |
| C. Render       | small; blank screen if nothing stays         | R9 pending UI keeps the old page, R25 view transitions       |
| D. Data request | starts only after B + C: **the waterfall**   | R12/R14 prefetch: D starts with B, or before the click (R16) |
| E. Data render  | skeleton → content                           | skeletons; R27 record checks when 404/403 must win           |

**Goal:** A ≈ 0, B done before the click, D running before the click finished. Warm navigations show no progress bar.

### 1.2 First-load costs

```
HTML ─▶ main bundle ─▶ bootstrap (session, config, i18n) ─▶ match ─▶ loaders + chunks ─▶ page
```

Removed by R17 (one bootstrap request, parallel assets), R18 (shell paints during loaders), R19/R35 (small, cached
bundles), R36 (session in the HTML, static shell skeleton).

### 1.3 The ceiling of data mode

Data mode is a client-rendered SPA: nothing renders before the main bundle runs. A cold first load can't beat
"HTML + main bundle + first chunk". R18, R19, R35 and R36 get close to that floor. Going **below** it (server rendering,
streaming, pre-rendered routes) requires framework mode or another server renderer: that is the R30 decision, not a
data-mode technique. Warm navigations have no such ceiling: with R11–R16 they are effectively instant.

### 1.4 Metrics

| Metric               | Meaning                                           | How                                                          | Target                             |
| -------------------- | ------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------- |
| Navigation time (NT) | `navigation.state` leaves `idle` → back to `idle` | router subscription + `performance.measure` (playbook H14)   | p75 < 100 ms warm                  |
| Content time (CT)    | click → main content rendered with data           | `performance.mark` when the page's main query first has data | p75 < 500 ms                       |
| Waterfall count      | requests that start only after another finished   | Network tab waterfall, per navigation                        | 0 on heavy pages                   |
| LCP (cold)           | largest paint on a deep link                      | Lighthouse / web-vitals                                      | < 2.5 s on Fast 4G                 |
| INP                  | input responsiveness                              | web-vitals (field data)                                      | < 200 ms                           |
| Main bundle (gzip)   | JS needed before the first route renders          | build analysis                                               | budget set at baseline, only falls |
| Denied download      | page code bytes a denied user downloads           | Network tab on a denied URL                                  | 0                                  |
| Duplicate requests   | same endpoint + args twice in one navigation      | Network tab                                                  | 0                                  |

Lab numbers (Lighthouse, throttled DevTools) prove a change; field numbers (RUM) prove it for users. Track both.

---

## 2. Principles

They hold in every stage. A technique that breaks one is wrong, however fast.

1. **One static route tree.** Built once at startup from data, never conditional on the user. Access is a property of
   a route, not whether it exists.
2. **Access is synchronous and checked before the page downloads.** Rules are pure functions of a session loaded once.
   A denied user downloads nothing and sees a 403 **at the URL they opened**. Access never redirects; only
   _authentication_ (anonymous user on a login-only route) may send to login.
3. **Params are typed and validated by the router.** Invalid = 404 before any download.
4. **One rule, used everywhere.** Route guard, menu, sidebar, link and button read the same named rule through the same
   path definition. Nothing shows a link that ends in a 403.
5. **The router starts work; the data layer owns data.** Loaders check, start downloads, start queries. They don't hand
   data to components (except R27, to decide 404/403).
6. **Nothing at module level.** A factory builds the router from injected dependencies, so tests build the real tree.
7. **Measure before and after.** No performance change ships without its number.

---

## 3. Forming the route tree

How the tree is shaped decides what can be guarded, preloaded, tested and shown in breadcrumbs. Rules:

-   **Four route kinds, nothing else** (R1): page, layout, group, index redirect. A builder turns them into React Router
    routes. App code never writes `loader`, `lazy`, `element`, `Component` or route ids by hand.
-   **Sections.** Each top-level URL segment is a section: one file (or folder) exporting one route object with `path`
    and a mandatory rule (`public` when open to every visitor). A section over ~150 lines or 3 nesting levels splits by
    URL sub-tree, each file exporting one route object.
-   **Root tree.** `[...publicRoutes, { path: '/', element: <Shell/>, errorElement: <Backstop/>, children: [{ pathless
boundary with errorElement + hydrate fallback, children: [...sections, notFound] }] }]`.
-   **Public tree** (login, password reset, public forms) stays outside the app shell, with its own error element. If
    two router instances exist (anonymous vs logged-in app), the public routes are defined once and shared.
-   **Layouts vs groups.** A layout renders a frame and `<Outlet />` (sidebar, section header, a state gate). A group
    only adds a path segment, a rule or params. Never a layout that renders only `<Outlet />`. Never two sibling layouts
    on the same path.
-   **Pathless layouts** wrap a set of siblings in a frame without adding a segment (a list area with filters vs a
    detail area without).
-   **Index routes.** A URL with no page of its own gets an index redirect (R5). A URL with a page uses an index page.
-   **Params** are declared on the route whose `path` introduces them, typed (R4). Optional segments (`:tab?`) are
    validated only when present.
-   **Splats** (`x/*`) only for a page that owns sub-URLs it can't express in the tree (a third-party widget, a legacy
    sub-app during migration, R37). In v7, relative links and `navigate('x')` inside a splat route resolve from the
    **full** matched URL; build absolute paths from the route's base. Prefer real child routes (R22).
-   **Route ids** are derived from the full pattern (`/host/apartments/:id`), plus `#index`, `#layout`, `#boundary`
    suffixes. Stable ids make `useMatches`, revalidation and tests predictable. Duplicate ids fail the build.
-   **Build variants** (an offline build, a white-label build): a route stays only when it and every ancestor are marked
    for that variant. The tree builder filters; nothing else checks the variant.
-   **The built tree is exposed** (React context or a small registry) to code that renders outside the matched routes:
    breadcrumbs, menus deciding whether a target exists in this build, the preloader. Features never import the router
    module itself.
-   **Every route carries its guard metadata** in `handle` (full pattern, inherited rules, params, redirect, preload
    function). Static tests, the preloader and breadcrumbs read it; app code never writes it.
-   **Very large trees** (thousands of routes, or a config that is itself heavy): R31.

---

## 4. Data layer tracks

Prefetching (R12, R14–R16, R27) needs a place for the data to land that the page will read. Pick one track per app and
write it down:

| Track                | When                                                 | How prefetch works                                                                                          |
| -------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **A. Query cache**   | the app uses RTK Query, TanStack Query, SWR, Apollo… | loader / preload starts the query in the cache, not awaited; the page's hook joins it                       |
| **B. Adopt a cache** | pages fetch with `useEffect`/`fetch`                 | introduce a query cache (TanStack Query is library-agnostic), migrate heavy pages' main loads first, then A |
| **C. Router data**   | the team won't add a cache                           | loader returns `{ main: fetchX(params) }` **without awaiting**; page reads it with `<Await>` / `use()`      |

Recommendation: **A or B.** Track C works for the click, but hover preload can't fill it (the loader runs on
navigation only), it re-fetches on every revalidation, and data can't be shared between pages. With a cache, hover
preload, prefetch and the page share one request.

Cache settings that decide whether a prefetch is reused:

-   **Same key = same args.** Prefetch and page must use exactly the same endpoint and arguments, or the cache sees two
    entries and fetches twice.
-   **Freshness.** If the cache treats new data as immediately stale (e.g. a stale time of 0), the page's hook refetches
    on mount and the prefetch was for nothing. Give prefetched queries a short freshness window (10–60 s).
-   **Retention.** Unsubscribed entries are dropped after a retention time. Hover preload long before the click needs a
    retention longer than the typical hover-to-click time (default values of 1–5 min are fine).

---

## 5. Techniques

Each: **Problem**, **Technique**, **Pitfalls**, **Verify**. Helper contracts (H-ids) are in the playbook appendix.

### Phase 1: Guarded data router

#### R1. Static route config with four kinds (H4, H5)

-   **Problem:** ad hoc `loader` / `lazy` / `element` / conditional children drift; nobody can see which rule protects
    which URL.
-   **Technique:** routes are data (§3). A `defineRoutes()` builder writes loaders, components, ids, error boundaries and
    `handle.guard` on every route.
-   **Pitfalls:** `element`, `lazy` or hand-written loaders creeping back; `isAdmin && {...}` children.
-   **Verify:** a static test walks the built tree (H13).

#### R2. Synchronous access layer (H3)

-   **Problem:** an async role guard adds a network round trip to every navigation, search-param changes included.
-   **Technique:** load the session once before creating the router. One selector maps it to `AccessSources` (plain
    booleans and sets). Rules are `(sources) => boolean`, named `can<Verb><Thing>`, unique, grouped by area. Getters:
    `isAllowed(name)` for loaders, `useAccessRule(name)` for components. Store-agnostic: the layer only needs
    `getSnapshot()` and `subscribe()`.
-   **Pitfalls:** a rule depending on data loaded later (false 403 on deep links); rules calling the API; AND-ing two
    rules at a call site (make a combined rule).
-   **Verify:** navigating sends no session/role request; a table test per combined rule.

#### R3. Guarded loader; download only after the check (H5)

-   **Problem:** React Router starts every matched route's `lazy` (function or object form) **when the navigation
    matches**, in parallel with loaders and middleware, and caches the `lazy` promise, a rejected one too. So `lazy`
    can't gate anything: a denied user downloads the page, and a deny thrown in `lazy` sticks until reload.
-   **Technique:** per page/layout, one loader: every inherited rule → 403; every inherited param → 404; start prefetch
    (R12); `await import()`; return `null`. The component renders the loaded module. All matched loaders run in
    parallel, so layout and page chunks still download together.
-   **Pitfalls:** checking only the route's own rule (a parent's 403 doesn't stop a child loader already running: each
    loader checks the **whole chain**); awaiting data in the loader.
-   **Verify:** denied URL → 403 inside the layout, **no page chunk** in the Network tab.

#### R4. Typed, validated params (H1, H9)

-   **Technique:** routes declare `params: { id: 'number' }` (`number`, `uuid`, `numbersList`, `name` = backend
    identifier, `oneOf(...)`; no free string). The loader validates (404). Pages read parsed values with
    `useRouteParams(path)`.
-   **Verify:** invalid param → 404, no chunk, no API request.

#### R5. Inherited rules and collectors (H6)

-   **Technique:** `requires` (one rule name) is inherited; children add a stricter one. A URL that only redirects to a
    child is a collector: `redirectTo('child')` when every target is open to everyone allowed into the collector,
    otherwise a combined "any of" rule plus `firstAllowed([{ rule, to }])`, which throws 403 when none passes.
-   **Pitfalls:** a fixed redirect to a stricter child (an allowed user lands on a 403).

#### R6. No loaders on search-param changes

-   **Problem:** every `setSearchParams` is a navigation that re-runs all matched loaders: filters and paging get
    pending UI and checks.
-   **Technique:** default `shouldRevalidate`: same href (explicit `revalidate()`) → React Router's default; otherwise
    only when **path** params changed. Write filter changes with `replace: true`; debounce text inputs.
-   **Verify:** a filter change sends only the page's API request; `navigation.state` stays `idle`.

#### R7. Error boundaries that keep the layout (H12)

-   **Technique:** root error element = backstop without the shell. A pathless boundary under the shell renders errors
    **inside** it. The builder wraps every layout's children in a pathless route with its own error element, so an error
    in a tab keeps the section frame.
-   **Verify:** throw in a page: the sidebar stays.

#### R8. Stale-chunk recovery (H12)

-   **Problem:** after a deploy, `import()` of an old hashed file fails.
-   **Technique:** the error element recognises chunk-load errors and reloads **once**, guarded by a `sessionStorage`
    flag cleared after the next successful navigation. The bundler's preload-error event (`vite:preloadError` in Vite)
    goes through the same handler.
-   **Verify:** deploy with a changed page while a tab is open: one reload, then the page; no loop.

#### R9. Pending UI

-   **Technique:** the old page stays during navigation. A global progress bar appears only when
    `useNavigation().state === 'loading'` lasts > 200 ms. `NavLink` styles `isPending` like `isActive`, so the clicked
    item highlights at once.

#### R10. Scroll restoration

-   **Technique:** `<ScrollRestoration getKey={(location) => location.pathname} />`: back/forward restore, new pages
    start at top, search changes don't scroll. Tabs use `<Link preventScrollReset>`.
-   **Pitfalls:** it restores window scroll only; a custom scroll container needs its own handling.

#### R11. Intent preload (H7, H8)

-   **Problem:** wait B on every first visit.
-   **Technique:** `<Link prefetch>` is framework-mode only, so: each guard carries a `preload(params)` (starts the
    imports and prefetch, never throws). A registry `preloadRoute(href)` matches the href against the built tree, runs
    the same rule and param checks, then calls `preload` on every matched route. `usePreloadRoute(href, enabled)` fires it
    after ~100 ms hover/focus, and immediately on `pointerdown`.
-   **Pitfalls:** preloading denied links; `useFetcher().load` (runs only the leaf loader; its error renders on the
    current page).
-   **Verify:** hover 100 ms → chunk downloads; click → no progress bar.

#### R12. Prefetch hook on routes

-   **Problem:** wait D starts after B and C.
-   **Technique:** a route may declare `prefetch(params)` typed by its path definition. The loader calls it after the
    checks and **never awaits it**; preload (R11) calls it too. The page's hook joins the running request (§4).
-   **Pitfalls:** different args than the page (duplicate request); prefetching secondary queries; data freshness 0 (§4).

#### R13. Live access changes without reload (H11)

-   **Technique:** subscribe to the session; on change, compute every rule result and compare with the previous results;
    only when one flips call `router.revalidate()`. A lost page shows 403, a gained one shows the page.
-   **Pitfalls:** revalidating on every session change (compare results, not object identity).

### Phase 2: Fast navigation

#### R14. Parallel data on heavy pages

-   **Technique:** move each heavy page's main load into the cache (§4 track A/B), then add R12. Candidates: main request
    > 200 ms, or nothing useful renders without it.

#### R15. Parallel section data

-   **Technique:** data every page of a section needs → `prefetch` on the section's layout route, not a query per page or
    a blocking effect in the layout.

#### R16. Preload everywhere

-   **Technique:** every navigation surface preloads with intent: header menu, sidebars, dashboard tiles, list → detail
    links, buttons (`useAccessPath` + `usePreloadRoute`). Beyond intent:
    -   **Viewport preload** for the 1–3 primary links of a page (IntersectionObserver, once per href, chunk only).
    -   **Idle preload** of the 2–3 most likely next routes after first load (`requestIdleCallback`), skipped when
        `navigator.connection?.saveData` or `effectiveType` is 2G.
-   **Pitfalls:** preloading data for long link lists (chunks only there; data on intent).

#### R17. Faster startup

-   **Technique:** one bootstrap request for the session; config, translations and theme in parallel with it; block the
    first render only on what the rules and the first route need.
-   **Verify:** one request level before the router starts.

#### R18. Shell paints during first-load loaders

-   **Problem:** on a cold load nothing renders until the matched loaders finish.
-   **Technique:** React Router renders the matched routes down to the closest route with a `HydrateFallback` /
    `hydrateFallbackElement` at or above the first route whose loader hasn't run, and shows that fallback there. Put a
    page-area skeleton as `hydrateFallbackElement` on the pathless boundary **inside** the shell, and give the root and
    shell routes no loader: header and menu paint at once.
-   **Verify:** cold deep link: header visible before the page chunk; no 403 flash.

#### R19. Smaller main bundle

-   **Technique:** analyse the build (e.g. `rollup-plugin-visualizer`, `source-map-explorer`); pages and layouts only as
    `() => import()`; route config, root, shell and access layer import nothing heavy (type-only imports where
    possible); vendor chunks for stable libraries so deploys don't invalidate them; no barrels that pull whole libraries
    into main; a CI size budget.

### Phase 3: The router owns the URL

#### R20. Path definitions and typed links (H2, H10)

-   **Technique:** every linkable URL has `{ pattern, requires: [...every inherited rule, root first], params }`.
    `buildPath(path, params)` is the only href builder. `AccessLink` renders plain text when the viewer can't open the
    target and preloads when they can; `useAccessPath` gives `{ href, canOpen }` for buttons and `navigate()`. A static
    test checks each definition against the tree (H13).

#### R21. Parsed params everywhere

-   `useParams` → `useRouteParams(path)`: typed, already validated; a mismatch is a programming error and throws.

#### R22. No nested `<Routes>`

-   Pages with their own `<Routes>` hide URLs from guards, preload and breadcrumbs. Turn them into config children; tabs
    become routes with `<Link preventScrollReset>` and preload.

#### R23. Breadcrumbs and document title from `handle` (H15)

-   Each route's `handle` carries its crumb (static label key, or a hook name for an entity label); `useMatches()` builds
    the trail and the title. Crumbs the viewer can't open render as text. No hand-maintained route list.

#### R24. Unsaved-changes blocking (H16)

-   One `useBlocker`-based hook (`useBlockWhenDirty(isDirty)`). The blocker decides before loaders run. One active blocker
    per router.

#### R25. View transitions

-   `<Link viewTransition>` / `navigate(to, { viewTransition: true })` on one section first; CSS-only crossfade; off
    under `prefers-reduced-motion`. Keep only if it feels faster.

#### R26. Access layer everywhere

-   Component-level role/permission reads → `useAccessRule`; delete the old helpers; lint bans role and permission
    literals outside the rule files.

### Phase 4: Loaders that know about data

Relaxes principle 5; decide it explicitly.

#### R27. Record checks in loaders

-   **Technique:** a route may declare `recordCheck(params, { signal })`: the loader awaits **one** cache call for the main
    record **in parallel with the import**, and throws 404 / 403 from the result. The page reads the same cache entry.
-   **Pitfalls:** blocks the navigation on data, so pair with R11/R16 (hover starts the same query); more than one awaited
    call is a waterfall; pass `request.signal` so an interrupted navigation cancels it.

#### R28. Record-based access as rules

-   Rules that need the record (owner, record type) take a typed second input, shared by the loader (R27) and the page.

#### R29. Middleware for cross-cutting work

-   Analytics page views and navigation timing in route middleware. **Not for access**: route `lazy` starts in parallel
    with middleware, and the guarded loader stays the boundary.

### Phase 5: Platform

#### R30. React 19, React Router v8, mode decision, lint lock

-   React 19 first, then React Router v8.
-   **Decide** framework mode (route modules, typegen, `<Link prefetch>`, SSR / pre-rendering) vs staying in data mode
    with these helpers. Framework mode lifts the §1.3 ceiling; it must still keep "no download when denied".
-   Import only from `react-router`; ban `react-router-dom`.

### Cross-cutting and conditional

#### R31. Lazy route discovery (conditional)

-   **When:** the tree has thousands of routes, or building it pulls noticeable code into the main bundle.
-   **Technique:** `patchRoutesOnNavigation({ path, patch, signal })` adds a section's routes on its first navigation (the
    section's config is itself `import()`ed). The preloader must call the same discovery before matching.
-   **Otherwise:** skip. With pages as `() => import()`, a normal tree is a few KB.

#### R32. Navigation edge cases

-   **Interrupted navigations:** React Router aborts the older navigation's `request.signal`. Imports keep running (they
    are cached, so that's fine); awaited record checks (R27) must pass the signal. Fire-and-forget prefetches don't need it.
-   **Races:** a slow navigation finishing after a newer one is discarded by the router; never navigate from inside a
    loader's `.then`.
-   **Revalidation after mutations:** without `action`, the data layer invalidates its own cache; call
    `router.revalidate()` only when access or route-level state changed.
-   **Search writes and rendering:** heavy lists behind a filter use `useDeferredValue` / transitions so typing stays
    responsive (INP).

#### R33. Accessible navigation

-   **Technique:** after a pathname change (not search-only changes, not the first load), move focus to the page's main
    heading or `<main tabIndex={-1}>` and announce the new title in a polite `aria-live` region. Document title from the
    matched routes (R23). Back/forward restores scroll (R10) and still announces.

#### R34. Regression guards

-   Static tree test (H13), access rule table tests, router behaviour tests on a memory router, a CI bundle budget, a lab
    performance budget (Lighthouse CI or similar) on 3–5 key URLs, field metrics (web-vitals → analytics) with an alert on
    NT / LCP / INP regressions. Details in playbook §8.

#### R35. Long-term asset caching

-   Hashed assets: `Cache-Control: public, max-age=31536000, immutable`; `index.html`: `no-cache`; brotli/gzip; HTTP/2+.
    Optional: a service worker that precaches route chunks for repeat visits (must not serve a stale `index.html`).

#### R36. First paint before JS (beyond data mode's usual floor)

-   Inline critical CSS and a static shell skeleton in `index.html`, replaced when React mounts.
-   The server injects the session (or a signed bootstrap payload) into the HTML, removing the bootstrap request (R17).
-   `<link rel="modulepreload">` for the main entry (bundlers do it), `preconnect` to the API origin.

#### R37. Incremental migration

-   A big app can't switch in one change. The data router first mounts the old tree whole under a splat; sections then
    move into the config one by one, each guarded by a group route with its rule. Playbook §2b.

---

## 6. Available but not used

| API                                          | Why not                                                                                  |
| -------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Route `lazy` (function or object form)       | Starts downloading in parallel with loaders and caches rejections: can't be a gate (R3). |
| `action`, `<Form>`, `useFetcher` (mutations) | With a query cache, its mutations and invalidation do it; two systems would compete.     |
| Loader data + `<Await>`                      | Only on track C (§4); a cache does the same and works with hover preload.                |
| `dataStrategy`                               | Full control over loader execution; no use case once loaders are guards.                 |
| `useFetcher().load` for preload              | Runs only the leaf loader; its error renders on the current page.                        |
| `patchRoutesOnNavigation`                    | Only for very large trees (R31).                                                         |

---

## 7. Glossary

| Term            | Meaning                                                                          |
| --------------- | -------------------------------------------------------------------------------- |
| Rule            | `(sources) => boolean`, named `can<Verb><Thing>`; `public` = every visitor       |
| Inherited chain | every `requires` from the root down to a route, root first                       |
| Guard           | `handle.guard` written by the builder: pattern, rules, params, redirect, preload |
| Path definition | `{ pattern, requires, params }` for a linkable URL, checked against the tree     |
| Collector       | a URL that only redirects to a child                                             |
| Preload         | start a route's chunks (and prefetch) before the click                           |
| Prefetch        | start a route's main query from its loader or preload, not awaited               |
| Warm navigation | the target's chunks are already loaded                                           |
