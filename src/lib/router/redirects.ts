import { redirect } from "react-router";
import type { ParsedParams } from "./params";
import type { RuleName } from "./access";

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
