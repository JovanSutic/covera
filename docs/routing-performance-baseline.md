# Routing performance baseline

Continued from the file deleted in `0fa546c`. Measured on `feature/49_router-improvements`, on this
machine, over a local `vite dev` server with the API reachable. Every number here is a median of 5
runs.

## What each column means — read this before quoting a number

| Column | Measures | What it must NOT be used to claim |
| --- | --- | --- |
| `chunkMs` | Router `loading` → `idle`: guard checks + dynamic import | **Not** how fast data arrives. This was the only column before the router-data-prefetch feature, and it was misread as a data metric. |
| `dataMs` | Navigation start → every query that navigation started settled | Data readiness. `null` when the navigation started no query. |
| `prefetched` | Was the href preloaded before the navigation? | — |
| `waterfalls` | Requests that started only after the page's chunk resolved | The number this feature is meant to drive to 0. |

`window.__routeTimings.getMedians()` returns `{ chunkMs, dataMs }` in dev; `window.__routeTimings.getTimings()`
returns every sample with its `prefetched` flag. `window.__routeMedians()` is `getMedians()` in one call.

## Tracker

| Row | Change | chunkMs | dataMs | waterfalls | entry chunk (gzip) | gate |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | pre-optimization baseline (2026-10-27, `d423d13`) | — | n/a (not measured then) | — | 197180 pre-split | 3/3 |
| … | router-maximization final (its row `8`) | 7.2 | n/a (not measured then) | 0 | 90566 | 3/3 |
| 6 | router-data-prefetch (this feature) | TBD | TBD | TBD | 91890 | pass |

Row 6 was measured after phases 1–5 landed. `dataMs` is the column this feature added; the `n/a`
cells above are the correction — those runs measured chunk time only.

### Where rows 0 and `…` come from, and the one thing they do not say

Both are transcribed from `git show 0fa546c^:docs/routing-performance-baseline.md` — the file as it
stood before its deletion. Four corrections against that output, which is the source of truth here;
step 6.2's own table misquotes it, and the phase invariant ("the historical rows match `git show
0fa546c^:…` verbatim") is what decides:

- **Row 0 measured no timings at all.** Its `NT p75` and `Waterfalls` cells are **blank** in the
  recovered file. `9.2` was never row 0's number: the only `9.2` in this repository's history is in
  `docs/router-maximization/00-index.md`, and it belongs to that feature's **final** row, next to
  `7.2`.
- **The final row's `Waterfalls` cell is `0`, and its `Exit checks` cell is `3/3`** — not `1` and
  `3/3`. Step 6.2's table transposes those two columns.
- **The baseline commit is `d423d13`, not a `9bf…` commit.** No commit beginning `9bf` exists here
  (`git rev-list --all --abbrev-commit | grep '^9bf'` is empty), and the recovered file names
  `d423d13` as the commit it was measured at.
- **Row 0's entry chunk is `197180`, not `90566 pre-split`.** 197,180 bytes is the pre-split figure;
  90,566 is what the split produced, and it is the final row's number.

The `dataMs` cells reading `n/a (not measured then)` are the record of hole 5. The recorder had one
number and it was chunk time, so **no historical row can support a claim about data** — which is the
whole reason this file gained a `dataMs` column rather than a better `chunkMs` one.

### Row 6 — what is measured, and what still needs a browser session

| Cell | Value | How it was taken |
| --- | --- | --- |
| entry chunk (gzip) | **91890** | `npx vite build && npm run perf:bundle` → `[perf:bundle] OK index-DCVTbXyU.js is 89.7 KiB gzip (budget 92.0 KiB)` — under D18's 94,208, headroom 2,318 |
| gate | **pass** | `npm run gate` → exit 0, `Test Files 16 passed (16)`, `Tests 141 passed (141)` |
| chunkMs | TBD | needs a signed-in host session |
| dataMs | TBD | needs a signed-in host session |
| waterfalls | TBD | needs a signed-in host session |

All four navigations step 6.4 asks for — `/host/dashboard` cold, `/host/dashboard` warm,
`/host/apartments/:id` warm, `/admin/dashboard` + `?tab=apartments` — require a host login. The
executor has no credentials, and the repository carries no e2e fixture, stored session, or browser
driver, so these three cells stay `TBD` until the operator's browser pass. They are recorded as
outstanding, **not** as a pass.

The expected result for warm `/host/apartments/:id` is `0 / 4` — that is hole 2 closed. A warm row
whose `dataMs` is `null`, or whose waterfall count equals the cold one, means the prefetch is not
running and must be reported rather than recorded.

The entry chunk grew 90,566 → 91,890 (+1,324) across phases 1–5, still 2,318 under budget. Some of
that is structural: a route's `data` declaration references its query module statically, and a CDP
capture of a cold `/admin/dashboard` load confirms `src/lib/api/queries/admin.ts` and
`src/lib/router/routes/admin.ts` now load in the entry graph. (Those two commits also differ in
bundling config, so the delta is not attributable to phases 1–5 alone.) D18 anticipated this
("the generated SDK is already in the entry chunk, so the marginal cost of these prefetches is
expected to be small") and the budget is what falsifies it. It did not.

## Manual verification

Walked with headless Chrome (CDP) against `npm run dev`, **signed out**. Step 6.6's five checks split
by whether a session is needed.

### Confirmed without a session

| # | Check | Observed |
| --- | --- | --- |
| 2 | An unknown URL renders a 404 **inside** the shell | `/nope` → HTTP 200, app `<header>` present, `<h1>Page Not Found</h1>` inside `<main class="w-full">`. The frame survives — no full-page error. |
| 4 | A signed-out guest can still open `/inspection/<valid-uuid>` — the D7 flow | `/inspection/3f8a2c1e-9b4d-4a7f-8c2e-1d5b6a9e0f31` → HTTP 200, `<h1>Handover Not Found</h1>`: the page rendered, so its query ran without a session. CDP capture of that load shows **4 requests to `covera-api.josutic-sutic.workers.dev/inspections/…?detailed=true`, every one with `auth=none`** — no `Authorization` header, so `withAuth()` was not applied and `Bearer undefined` was never sent. |
| 5 | `npm run dev` renders a non-blank page at `/` | `/` → HTTP 200, `<h1>Home Page</h1>`. |
| 3 | A host at `/admin/dashboard` gets a 403 **at that URL** with no admin chunk requested | Half-confirmed, guest side: `/admin/dashboard` → `403 Not Allowed` in place, and the **page** chunk `src/pages/admin/Dashboard.tsx` was **never requested** (CDP network capture). The host-specific half needs a session. |
| 1 | `/host` still redirects to `/host/dashboard` | **Not confirmable signed out.** `/host` renders `403 Not Allowed` for a guest — the correct access result, but not the redirect. |

On check 4's four requests: they are react-query's default **3 retries** on a query that failed
because that id does not exist. `src/lib/api/queryClient.ts` sets no `retry`, so this is the library
default and is pre-existing behaviour, not the prefetch firing repeatedly. Against a real reservation
id the first response would succeed and no retry would follow.

### Still needs a signed-in host session

Check 1, the host half of check 3, and step 6.4's four medians and two waterfall counts. All are
recorded here as outstanding. The router-level halves of checks 1 and 2 are already asserted by
`src/lib/router/__checks__/router.behaviour.test.ts` inside `npm run gate`; what is missing is the
browser confirmation, not the evidence that the tree behaves that way.
