# Login redirect

Status: DRAFT

## Intent

Opening `/login` while you already have a live session is bad UX: the form invites you to sign in as
somebody else, and signing in on top of an existing session is not something we allow. A signed-in
user should never be offered the login form.

So `/login` becomes a login-only route. If you are signed in and you open it, you land on the
dashboard for your role. If you are not signed in, you stay on `/login` and the form renders as it
does today.

This is an **identity** redirect, not a permission redirect: it fires on *whether* you are signed
in, never on *whether your role may open a page*. The playbook permits exactly this one
(`docs/routing-performance-playbook.md:121`). The "403 in place, no cross-role redirect" rule (D1)
is about role mismatch and is untouched — see [decisions](./login-redirect.decisions.md) D2, D3.

Signing out must leave no stale user in the session store. Today `Header.handleLogout` signs out of
Supabase but never re-reads the session, so the store keeps the old user. That staleness is
cosmetic while `/login` is `public`; once `/login` denies signed-in users it becomes breaking — you
would click Sign out and be redirected straight back to your dashboard.

## Behaviour

| # | Route | Component | Guard | Data (query key) | States | i18n ns |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `/login` — anonymous visitor | `src/pages/LoginPage.tsx` | `isAnonymous` (new) | none | success (form) | `general` |
| 2 | `/login` — signed-in visitor | *not rendered* | `isAnonymous` denies → redirect | none | n/a — a redirect, no render | — |
| 3 | `/login` — redirect target | `dashboardPathForRole(role)` | — | none | admin → `/admin/dashboard`; host → `/host/dashboard`; guest → `/` | — |
| 4 | Sign out (Header menu) | `src/components/Header.tsx` | n/a | none | session store refreshed, then → `/login` | `general` |

Row 2 renders nothing: the route's loader throws a `redirect` response before the page module is
imported, so no LoginPage chunk is downloaded for a signed-in visitor.

Row 3's guest target is `/` (`FormPage`), which is what `dashboardPathForRole` already returns for
`guest` (`src/lib/router/access.ts:43`). No new route and no new copy — see D5.

`/update-password` is deliberately **not** login-only: it is reached from an emailed invite link
before a session exists (D6).

## Data

none. No generated request function, no `QUERY_ACTIONS` entry, no `api:generate` run. The role comes
from the session store (`SessionState.user.role`), which is a local JWT read via
`getAuthUserFromJwt()` and performs no network call.

## Invariants this must not break

Feature-specific restatements of the skill's invariants; the full list is in
`docs/login-redirect/00-index.md`.

- No hardcoded user-facing strings — every key exists in `en`, `de`, `tr`, and `sr-Latn`. This
  feature adds **no** new keys (D7).
- Query keys come from `QUERY_ACTIONS` — this feature reads no server state.
- `src/api/generated/` is not hand-edited.
- Network calls go through `withAuth()` / `publicApi()` — this feature adds none.
- **Role literals stay inside `src/lib/router/access.ts`.** `dashboardPathForRole` already owns the
  admin/host/guest mapping and is the only place this feature learns a role's destination. No new
  role literal appears anywhere else (D4).
- **The permission rule stays 403-in-place.** A host at `/admin/dashboard` must still get a 403 at
  that URL with 0 bytes of admin code. Phase 3 asserts this did not regress.

## Out of scope

- **Any redirect based on role/permission.** A host opening `/admin/dashboard` still gets a 403 in
  place. Only identity (`isAnonymous`) redirects.
- **`/update-password`.** Stays `public`. Making it login-only would lock out the invite flow it
  exists to serve.
- **A guest dashboard.** Guests are redirected to `/`, the existing placeholder. No new guest page,
  no new route.
- **`?next=<url>`.** The redirect target is always the role's dashboard; the URL the user was
  heading for is not remembered. Nothing in the app produces a `next` param today.
- **Sign-in behaviour.** `LoginForm`'s post-sign-in `navigate(dashboardPathForRole(...))` is
  unchanged.
- **An "already signed in" info panel.** Considered and dropped: with the redirect in place the
  panel is unreachable, and building an unreachable state is dead code (D1, rejected alternatives).
- **`PassUpdatePage` / `PassUpdateForm`** beyond the fact that they must keep working.

## Open questions

None.
