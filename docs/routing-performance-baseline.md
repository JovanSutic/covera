# Routing performance baseline

Measured 2026-10-27 on `feature/49_router-improvements` at commit `d423d13`, before phase 1 of
[router-maximization](./router-maximization.md). This is the "numbers to beat" of playbook stage 0.
Re-measure after phase 8 and fill the tracker at the bottom.

## How each number was taken

| Number | Command |
| --- | --- |
| Main bundle gzip | `npx vite build` (NOT `npm run build` — its `prebuild` hits the network), then `gzip -c dist/assets/index-*.js \| wc -c` |
| Denied download | DevTools → Network, filter JS, open `/admin/dashboard` as a host |
| Session reads per navigation | DevTools → Network, count requests to the Supabase auth host while clicking between pages |
| NT / CT | `window.__routeTimings.getMedian()` in dev, after 5 navigations (created in phase 3, step 3.10) |
| LCP cold | Lighthouse, Fast 4G, cold cache, deep link |

## Baseline

| # | Metric | Value |
| --- | --- | --- |
| 1 | Main bundle, gzip | 197180 bytes |
| 2 | Page chunks, count | 8 route page chunks |
| 3 | Session requests on a cold load | not measured — needs a signed-in DevTools session on a cold load |
| 4 | Session requests on one navigation | not measured — needs DevTools network capture while navigating |
| 5 | Host opens `/admin/dashboard`: admin chunk downloaded? | not measured — needs a host session and a DevTools JS filter at that URL |
| 6 | `/inspection/abc`: API request made? | not measured — needs a browser visit with network capture |
| 7 | `/host` renders | blank page |
| 8 | Unknown URL `/nope` renders | full-page error |
| 9 | NT p75 (warm, menu navigation) | not measured — added in phase 3 |
| 10 | CT p75 (apartment detail) | not measured — added in phase 6 |
| 11 | LCP cold (Fast 4G) | not measured — needs Lighthouse on a Fast 4G cold profile |

## Findings mapped to phases

| # | Finding (from the playbook's §0.3 shape) | Cost | Phase |
| --- | --- | --- | --- |
| F1 | `lazy` starts at match time, in parallel with `requireRoleGuard`: a host opening `/admin/dashboard` downloads the admin page | wasted bytes, code exposure | 4 |
| F2 | Guards are async and run on every navigation: `requireRoleGuard` awaits `supabase.auth.getSession()` | wait A on every click | 2, 4 |
| F3 | The guard sits only on the parent (`/admin`, `/host`); a child loader added later would not re-check | latent access hole | 4 |
| F4 | `:id` accepts anything; pages fetch and handle errors themselves | wasted request, mixed 404 UX | 3, 4 |
| F5 | One root `ErrorBoundary`: any error replaces the whole app | the user loses navigation | 5 |
| F6 | `*` renders `ErrorPage` outside any frame | dead end | 5 |
| F7 | No pending UI, scroll restoration, stale-chunk handling, focus management | blank waits, broken deploys, a11y | 5 |
| F8 | `/admin` and `/host` have no index route: an empty `<Outlet />` renders nothing | blank page | 4 |
| F9 | Every first visit waits for the chunk; every heavy page waits chunk → render → fetch | waits B + D | 6 |
| F10 | The apartment list decides its links separately from any guard | links that can end in a 403 | 6 |

## Tracker

Fill one row per phase boundary. `NT p75` and `CT p75` need more than one sample; use 5 navigations
and take the middle value.

| Phase | NT p75 | CT p75 (apartment) | Waterfalls | Dup. requests | Main gz | Exit checks | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | | | | | | 3/3 | baseline, this file |
| 1 | | | | | | | |
| 2 | | | | | | | |
| 3 | | | | | | | |
| 4 | | | | | | | |
| 5 | | | | | | | |
| 6 | | | | | | | |
| 7 | | | | | | | |
| 8 | operator | operator | operator | operator | 90566 | 2/3 | phases 1–8 landed; `NT p75`/`CT p75`/`Waterfalls`/`Dup. requests` need the browser pass in step 9.6. Metric 1: 197180 → 90566 bytes (−54%); session read (p1), denied download (p4), in-shell 404 (p5), waterfall (p6) |

## Final

The three deliberate behaviour changes, with the observed result:

| # | Behaviour | Observed |
| --- | --- | --- |
| 1 | `/host` lands on `/host/dashboard` (was a blank page) | asserted by `src/lib/router/__checks__/router.behaviour.test.ts` → `router.state.location.pathname === "/host/dashboard"`, passes. Browser confirmation is step 9.6. |
| 2 | `/nope` renders a 404 **inside** the frame (was a full-page error) | asserted at the router level → `*` matches and `router.state.errors === null` (no router error), passes. That the frame survives is a DOM fact and is step 9.6. |
| 3 | A host at `/admin/dashboard` downloads **0** admin chunks (was 1) | not measurable from the executor: needs a host session and a DevTools JS filter. Step 9.6. |

Metrics re-measured next to `## Baseline`:

| # | Metric | Baseline | Final |
| --- | --- | --- | --- |
| 1 | Main bundle, gzip | 197180 bytes | **90566 bytes** (`npx vite build`, then `gzip -c dist/assets/index-*.js \| wc -c`) |
| 11 | LCP cold (Fast 4G) | not measured | not measurable from the executor — needs Lighthouse on a Fast 4G cold profile |

Playbook targets (`NT p75 < 100 ms` warm, `CT p75 < 500 ms`, `LCP < 2.5 s` cold): **not yet
establishable** — all three need the step 9.6 browser pass, and none is met or missed on evidence
yet. Nothing here is claimed as met.
