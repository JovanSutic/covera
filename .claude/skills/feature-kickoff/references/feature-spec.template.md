# <Feature>

Status: DRAFT · APPROVED · SHIPPED

## Intent

In the operator's words. What this does and why. No implementation detail.

## Behaviour

One row per user-visible thing this feature makes true. `Route` is the URL as the user sees it;
`Guard` names the function from `src/lib/auth.ts`, or `public`.

| # | Route | Component | Guard | Data (query key) | States | i18n ns |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | | | | | loading / empty / error / success | |

States column: name the ones this feature must handle. `n/a` only for a route that fetches nothing.

## Data

The generated API surface this depends on: the request function from `src/api/generated/requests/`,
its types from `src/api/generated/requests/types.gen`, and any new entry in `QUERY_ACTIONS`.

If the backend does not yet expose an endpoint this needs, **say so here** and make the contract
change the first phase of the plan. If this feature is purely presentational, write `none`.

## Invariants this must not break

Link to the Invariants section of the skill; restate only the feature-specific ones.

- No hardcoded user-facing strings — every key exists in `en`, `de`, `tr`, and `sr-Latn`
- `src/api/generated/` is not hand-edited
- Query keys come from `QUERY_ACTIONS`
- Network calls go through `withAuth()` / `publicApi()`
- Mutations invalidate the keys they changed
- No secret in a `VITE_` env var

## Out of scope

Explicitly not part of this change. The executor must not infer these.

## Open questions

**Must be empty before the plan is written.** Move every entry to `<feature>.decisions.md` as a
numbered decision with a recommendation.
