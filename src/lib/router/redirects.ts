import { redirect } from "react-router";
import type { ParsedParams } from "./params";
import type { AccessSources, RuleName } from "./access";

export type RedirectTarget = string | ((params: ParsedParams) => string);

export interface RedirectSpec {
  to: RedirectTarget;
  search?: Record<string, string> | ((params: ParsedParams) => Record<string, string>);
}

export function redirectTo(
  to: RedirectTarget,
  options: { search?: RedirectSpec["search"] } = {},
): RedirectSpec {
  return { to, search: options.search };
}

export function resolveRedirect(
  spec: RedirectSpec,
  params: ParsedParams,
): { pathname: string; search: string } {
  const pathname = typeof spec.to === "function" ? spec.to(params) : spec.to;
  const searchRecord =
    typeof spec.search === "function" ? spec.search(params) : spec.search;
  const searchParams = new URLSearchParams(searchRecord ?? {});

  return { pathname, search: searchParams.toString() ? `?${searchParams.toString()}` : "" };
}

/**
 * Why a route was denied, and where the visitor belongs instead. Unlike
 * `RedirectSpec`, the target depends on the SESSION, not on URL params — a signed-in
 * visitor goes to their role's dashboard (login-redirect D10).
 *
 * Returning `null` means "fall through", so the caller throws the usual 403. That is
 * what keeps every route that declares no `denyRedirect` behaving exactly as before.
 */
export type DenyRedirect = (sources: AccessSources) => string | null;

export interface FirstAllowedTarget {
  rule: RuleName;
  to: string;
}

/** The first target whose rule passes; `null` when none does (the caller throws 403). */
export function firstAllowed(
  targets: readonly FirstAllowedTarget[],
  isAllowed: (rule: RuleName) => boolean,
): string | null {
  for (const target of targets) {
    if (isAllowed(target.rule)) return target.to;
  }
  return null;
}

export function redirectResponse(spec: RedirectSpec, params: ParsedParams): Response {
  const { pathname, search } = resolveRedirect(spec, params);
  return redirect(`${pathname}${search}`);
}
