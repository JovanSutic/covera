# Login redirect — decisions

Every choice the executor would otherwise make mid-flight. Approve the table in one pass, or edit it
in place; do not leave a row in `OPEN`.

**Status values:** `APPROVED` · `OPEN` (blocks execution) · `REJECTED` (kept for the record)

---

## Decisions

| ID | Decision | Rationale | Status |
| --- | --- | --- | --- |
| D1 | **Scope is identity only.** `/login` redirects a signed-in visitor to their role's dashboard. No role/permission redirect is added anywhere; a host at `/admin/dashboard` still gets a 403 in place. | The playbook permits exactly one redirect — `docs/routing-performance-playbook.md:121`: *"a redirect to `/login?next=<url>` (the only redirect allowed, since it is about identity, not permission)"*. This feature is that redirect, inverted. It is not a reversal of the `requireRoleGuard` removal, which existed to stop F1 (`playbook:77`: a host downloaded the admin chunk) and F2 (`playbook:78`: an async guard awaited on every navigation). Neither applies: `isAnonymous` is synchronous, and the deny path throws before the page module is imported. | APPROVED |
| D2 | **D1 of `router-maximization.decisions.md` is untouched.** "Access is synchronous and 403 in place. No cross-role redirect survives." | That row's rationale is scoped to a *role mismatch* (`/admin/dashboard` vs `/host/dashboard`). This feature never fires on a role mismatch, because `isAnonymous` asks only whether a user exists. Nothing in that row needs amending. | APPROVED |
| D3 | **`router-maximization.decisions.md` D3 is amended:** `/login` moves from `public` to `isAnonymous`. `canUseApp` stays as-is. | The old D3 listed `/login` as `public` with the note that `guest` is "a real signed-in user". Making `/login` login-only is the single substantive change this feature makes to that table. `canUseApp` is *not* reused: it passes for a signed-in guest, so it cannot express "anonymous". | APPROVED |
| D4 | **`dashboardPathForRole(role)` stays the only role → path mapping.** The new `denyRedirect` calls it; no new role literal is written outside `src/lib/router/access.ts`. | It already exists (`src/lib/router/access.ts:43`), already returns `/admin/dashboard`, `/host/dashboard` and `/` for the three roles, and is already used by `LoginForm` and `PassUpdateForm`. Adding a second mapping would violate the skill's invariant that role literals live only in the rule file (existing `router-maximization` D7). | APPROVED |
| D5 | **A signed-in guest is redirected to `/`.** No guest dashboard is built. | `dashboardPathForRole("guest")` already returns `/`. `/` is `src/pages/FormPage.tsx`, a placeholder, but it is a real reachable public route — so the redirect always has a valid target and this feature adds no route and no copy. Building a guest dashboard is a separate feature. | APPROVED |
| D6 | **`/update-password` stays `public`.** | It is reached from an emailed invite link before a session exists (`PassUpdatePage` verifies a `token_hash` and listens for `PASSWORD_RECOVERY`). `router-maximization.decisions.md` already rejected making it login-only for exactly this reason. | APPROVED |
| D7 | **No new i18n keys.** The redirect renders nothing, and the sign-out fix reuses the existing `header.signOut`. | A redirect has no user-visible copy. Zero keys means zero locale-parity risk across `en`/`de`/`tr`/`sr-Latn`. (The "already signed in" info panel was considered and dropped — see rejected alternatives R1.) | APPROVED |
| D8 | **New rule name: `isAnonymous`**, defined as `(sources) => !sources.isAuthenticated`. | It reads `AccessSources.isAuthenticated`, which `selectSources` already computes. The name states the condition it passes on, matching `public`/`canOpenAdmin` in being self-contained (existing D7 requires each rule to be self-contained). | APPROVED |
| D9 | **`access.test.ts`'s rule-naming test is widened** to `name === "public" \|\| name === "isAnonymous" \|\| name.startsWith("can")`. | `src/lib/router/access.test.ts:29-33` asserts every rule is named `public` or `can…`. `isAnonymous` fails it. This is the only existing test the new rule breaks, and the fix is the test's predicate, not the rule's name — `canAnonymous` would invert the meaning. | APPROVED |
| D10 | **Mechanism: an optional `denyRedirect` on the route node**, `(sources: AccessSources) => string \| null`, resolved in `defineRoutes`'s loader *before* the `403` throw. `null` means "fall through to the existing 403". | The builder is the only writer of `loader` (existing D13), so the mechanism must live there. Returning `null` rather than requiring a target keeps the 403 the default for every route that declares nothing, so D1's behaviour is preserved by construction. `RedirectSpec.to` cannot carry this: it is `(params) => string` (params only), and the target depends on the session. | APPROVED |
| D11 | **`DefineRoutesDeps` gains `getSources(): AccessSources`**, sourced from `access.getSources()`, which already exists on the `AccessLayer`. | The builder needs the role to resolve `denyRedirect`. `createAccess` already exposes `getSources` (`src/lib/router/access.ts:96`), so this is one field passed through `src/App.tsx`/`createAppRouter.tsx` — no new state and no new subscription. | APPROVED |
| D12 | **The preloader needs no change**; it keeps declining to preload a denied route. | `guardPasses` (`src/lib/router/defineRoutes.tsx:274`) already returns `false` when a rule fails, and `createAppRouter`'s preload chain returns early. Declining the preload is the correct behaviour for a route about to redirect — the signed-in visitor should not download the LoginPage chunk. Only the *loader* changes. | APPROVED |
| D13 | **Sign-out refreshes the session store, and refreshes before navigating.** `Header.handleLogout` becomes `signOut()` → `queryClient.clear()` → `await session.refresh()` → `navigate("/login")`, using `useSessionStore()` (the store, not `useSession()`). | Required for correctness, not tidiness: once `/login` denies signed-in users, navigating *before* the store is refreshed would let the stale "still a host" session deny the anonymous user and bounce them to `/host/dashboard` — logout would appear to do nothing. `Header` currently calls neither `bootstrap` nor `refresh`; only `LoginForm` and `PassUpdateForm` do. Ordering it before the navigation removes the race. | APPROVED |
| D14 | **D13 lands as phase 1, before the rule change, as its own commit.** | It is a pre-existing bug that the rule change promotes from cosmetic to breaking, so it must be green and committed before phase 3 makes `/login` login-only. Landing it first also keeps the feature diff purely about the login page. | APPROVED |
| D15 | **Phase 0 fixes the pre-existing flaky `router.behaviour.test.ts` first.** `settle()` gains an explicit `timeout: 10_000`. | The baseline gate is **red** on a clean tree: `lets an admin into /admin/dashboard` fails with `expected false to be true` at `router.behaviour.test.ts:54`. Measured cause: `vi.waitFor` there has no `timeout`, so it inherits Vitest's 1000 ms default, while the first navigation built in a worker process costs ~1146 ms (later ones ~10 ms) because Vite transforms the lazy page graph cold. Standalone the file passes 6/6 because earlier tests absorb the cost; under the full gate's parallel workers it exceeds 1000 ms. It is unrelated to this feature and to the uncommitted working-tree changes. The skill requires a green baseline before execution. | APPROVED |
| D16 | **Tests:** phase 0 edits `router.behaviour.test.ts`; phase 2 adds rows to `access.test.ts` and widens the naming test (D9); phase 3 adds `defineRoutes` deny-redirect tests; phase 4 adds behaviour tests to `router.behaviour.test.ts` and updates `paths.test.ts` / `routes.test.ts`. Phase 1 (`Header.tsx`) is exempt. | `src/lib/router/**` is pure logic and the skill's test rule requires a test in the phase that introduces it. Phase 1 is component wiring whose only new behaviour is a store call already covered by `session.test.ts`'s `refresh` tests; its end-to-end effect is asserted in phase 4's behaviour tests, which is where it can actually be observed. | APPROVED |
| D17 | **Commit granularity: one commit per phase**, docs separate from code, made by the operator at the phase boundary. | The kickoff skill's division of labour. Nothing enforces it in this repo (no husky hook, no CI), so it is stated rather than assumed. | APPROVED |
| D18 | **The stale `router-maximization.decisions.md` rows are amended in the docs commit, not the code commit:** D3's `/login` entry gains a pointer to D3 here. | The D3 row is now factually wrong about `/login`. Leaving a wrong approved row in the repo is how a future executor re-derives the old behaviour. One-line pointer; the historical rationale stays legible. | APPROVED |

---

## Checklist — close every one of these before approval

**Shape**
- [x] Route path: `/login` — unchanged. No new route is added. Belongs to `outsideRoutes` (outside the shell) and stays there: it is still reached before a session exists.
- [x] Component location: no new component. Edits land in `src/lib/router/access.ts`, `src/lib/router/defineRoutes.tsx`, `src/lib/router/redirects.ts` (types only), `src/lib/router/routes/public.ts`, `src/lib/router/paths.ts`, `src/components/Header.tsx`.
- [x] Server state vs local state: **neither is added.** The role is read from the existing session store snapshot. No `useState`, no react-query.
- [x] `QUERY_ACTIONS` key: n/a — this feature reads no server state and adds no query key.

**API**
- [x] Generated request function: none.
- [x] Does the backend already expose it? **n/a — no API change is needed.** The role is already in the session JWT (`getAuthUserFromJwt` reads `user_metadata.role`). This feature is not blocked on `covera-hono`.
- [x] Does `npm run api:generate` need re-running? **No.** No step touches `src/api/generated/`.
- [x] Auth: n/a — no call is made. Nothing is added to `withAuth()` or `publicApi()`.

**Auth and routing**
- [x] Guard that runs: the new `isAnonymous` rule on `/login`. Deliberately **not** `redirectIfAuthenticated()` — existing D10 deleted that helper as dead, and the redirect now lives in the router layer where D1 put access.
- [x] Every role that may reach `/login`: **anonymous visitors only.** `admin`, `host` and `guest` are all redirected (guest → `/`, D5).
- [x] Deliberately public: `/update-password` (unchanged), `/` (unchanged), `/inspection/:id` (unchanged) — D6.
- [x] Lazy-imported: `/login` already is (`page: () => import("@/pages/LoginPage")`). Unchanged. No step adds `lazy` to a route module (existing D13 forbids it).

**States** — one row per state the screen can be in
- [x] Loading: n/a — the route renders nothing on the redirect path, and the session is already bootstrapped before the router is created (`src/main.tsx:19`), so `isAnonymous` never observes `status: "loading"`. If a signed-in user deep-links `/login`, the loader redirects; `src/components/router/PageSkeleton.tsx` is the hydrate fallback, unchanged.
- [x] Empty: n/a — no list.
- [x] Error: unchanged — a failed rule with no `denyRedirect` still throws a 403, rendered by the existing route error element.
- [x] Success: the anonymous visitor sees `LoginPage` exactly as today.
- [x] Optimistic vs pessimistic: n/a — no mutation.

**Copy and i18n**
- [x] Namespace: `general` (for `header.signOut`, already present). **No new keys** — D7.
- [x] Key names decided now: n/a — none added.
- [x] Translated copy for `de`, `tr`, `sr-Latn`: n/a — `npm run i18n:translate` is not needed.

**Forms** — n/a, this feature has none. `LoginForm`'s schema and submit path are untouched.

**Evidence**
- [x] Does this phase have testable logic? Phases 2, 3 and 4 do. Phase 0 is itself a test fix.
- [x] Exempt phases: **phase 1 only** (`Header.tsx`), reason in D16.
- [x] Where tests live: `*.test.ts` beside the module under `src/lib/router/`; behaviour tests in `src/lib/router/__checks__/`.

**Process**
- [x] Commit granularity: one per phase, docs separate — D17.
- [x] Doc update: `docs/router-maximization.decisions.md` D3 gains a pointer — D18.
- [x] Shared component changed: `src/components/Header.tsx` (the sign-out path). Used on every in-shell page. Called out here and required in the PR description.

---

## Rejected alternatives

| ID | Alternative | Why rejected |
| --- | --- | --- |
| R1 | An "already signed in" info panel on `/login`: hide the form, show the role, offer a dashboard link and a sign-out button. | Unreachable once the redirect lands — a signed-in visitor never renders `LoginPage`. Keeping both means shipping a state no user can see. The operator raised it as the fallback if a redirect were considered worse; it is not, and the redirect is the option the playbook explicitly permits. |
| R2 | Reuse `canUseApp` for `/login` (i.e. negate it at the call site). | `canUseApp` passes for a signed-in guest, so inverting it means inverting it *in the guard*, putting a negation at a call site instead of in a self-contained named rule (existing D7). A separate `isAnonymous` rule is one line and keeps every rule independently testable. |
| R3 | Add `denyRedirect` to `RedirectSpec` and reuse the index-redirect path. | `RedirectSpec.to` is `string \| ((params: ParsedParams) => string)`; the redirect target depends on the session, not on URL params. Widening it to take both would make one type mean two things. The index-redirect path also throws `403` for a failed rule *before* it could redirect, so it would need the same branch anyway. |
| R4 | Rename the rule to `canLogin` so `access.test.ts`'s existing `can…` predicate passes untouched. | Saves editing one test predicate at the cost of a name that reads backwards: the rule passes precisely when the visitor *cannot* log in. `isAnonymous` states the condition; widening the test's allowlist (D9) is the honest fix. |
| R5 | Redirect from inside `LoginPage` with `<Navigate>` or a `useEffect` + `navigate()`. | The page module would have to be downloaded before the redirect could render, so a signed-in visitor pays for the LoginPage chunk — the same wasted-bytes class as F1 (`playbook:77`). It would also flash the form before redirecting. The builder's loader throws before the import. |
| R6 | Add `?next=<url>` so a redirected user returns to the page they wanted. | Nothing in the app produces a `next` param, and the redirect only ever fires for a signed-in user who deliberately opened `/login` — whose intended destination *is* their dashboard. It would add a URL contract with no consumer. |
| R7 | Fix the flaky `settle()` by raising Vitest's global `testTimeout` instead of the `waitFor` timeout. | The failing wait is `vi.waitFor`'s own 1000 ms default, which `testTimeout` does not govern; the test passed in ~1050 ms and failed inside `settle`, not on the test timeout. A global bump would also mask genuinely slow tests. The narrow fix is the explicit `timeout` (D15). |

---

## Facts verified while writing this (with the command that verified them)

| Fact | Verified by | Result |
| --- | --- | --- |
| `isAnonymous` does not exist; four rules do | `grep -n "public:\|canUseApp:\|canOpenAdmin:\|canOpenHost:\|isAnonymous" src/lib/router/access.ts` | `public`, `canUseApp`, `canOpenAdmin`, `canOpenHost` at lines 26, 27, 28, 30. No `isAnonymous`. |
| `dashboardPathForRole` maps all three roles, guest → `/` | `sed -n '43,46p' src/lib/router/access.ts` | `if (role === "admin" \|\| role === "host") return \`/${role}/dashboard\`; return "/"` |
| `appPaths.login` is `public` today | `sed -n '68,70p' src/lib/router/paths.ts` | `login: { pattern: "/login", requires: ["public"], params: {} }` |
| The rule-naming test will break on a new rule name | `sed -n '29,33p' src/lib/router/access.test.ts` | `expect(name === "public" \|\| name.startsWith("can")).toBe(true)` |
| `firstAllowed` exists and has no call sites | `grep -rn "firstAllowed" src/` | Definition (`redirects.ts:37`) + re-export (`index.ts:11`) only. Built, never wired. |
| The builder throws 403 unconditionally on a failed rule | `grep -n "throw data(null, { status: 403 })" src/lib/router/defineRoutes.tsx` | `defineRoutes.tsx:169` (index-redirect branch) and `:303` (loader branch). |
| `AccessLayer` already exposes `getSources` | `grep -n "getSources" src/lib/router/access.ts` | Declared `:52`, implemented `:97`. |
| `dashboardPathForRole` is at the line D4 cites | `sed -n '42,47p' src/lib/router/access.ts` | Function at `:43`, body `:44-45`. |
| `Header` never refreshes the session store | `grep -rn "session.refresh\|bootstrap()" src/ \| grep -v "\.test\."` | `session.ts:12` (declaration), `main.tsx:19` (`bootstrap`), `LoginForm.tsx:34,61`, `PassUpdateForm.tsx:43,74`. `Header.tsx` absent. |
| The baseline gate is red, and it is the flake | `npm run gate` on a stashed clean tree | `Tests 1 failed \| 140 passed`; `lets an admin into /admin/dashboard 1037ms`. Passes 6/6 when that file runs alone. |
| `/login` is outside the shell and stays there | `grep -n "login" src/lib/router/routes/public.ts` | `outsideRoutes` entry, `requires: "public"`, crumb `login.welcome`. |
| No locale key is needed | `grep -n "signOut" public/locales/en/general.json` | `"signOut": "Sign out"` at line 95 — reused as-is. |
