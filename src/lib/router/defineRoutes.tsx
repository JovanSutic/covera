/* eslint-disable @typescript-eslint/no-explicit-any */
import { data, redirect } from "react-router";
import type { RouteObject } from "react-router";
import type { ComponentType } from "react";
import { createElement, lazy, Suspense } from "react";

import { areParamsValid, parseParams } from "./params";
import type { ParamsDeclaration, ParsedParams } from "./params";
import type { AccessSources, RuleName } from "./access";
import { redirectResponse } from "./redirects";
import type { DenyRedirect, RedirectSpec } from "./redirects";
import { resolveResource } from "@/lib/api/queries/registry";
import type { ResourceRequest } from "@/lib/api/queries/registry";
import { prefetchQuietly } from "@/lib/api/queries/shared";

export type Crumb = string;

export interface GuardMeta {
  pattern: string;
  rules: readonly RuleName[];
  params: ParamsDeclaration;
  redirect?: RedirectSpec;
  preload?: (params: ParsedParams, searchParams: URLSearchParams) => void;
}

export interface Handle {
  guard: GuardMeta;
  crumb?: Crumb;
}

/**
 * A route's data dependencies, as data (D2). `data` is what the coverage check
 * reads; `prefetch` stays for anything a descriptor cannot express.
 */
export interface RouteBase {
  requires?: RuleName;
  params?: ParamsDeclaration;
  variants?: readonly string[];
  data?: readonly ResourceRequest[];
  /**
   * Where a visitor goes when `requires` denies them. Returning `null` falls
   * through to the usual 403, so declaring nothing changes nothing
   * (login-redirect D10).
   */
  denyRedirect?: DenyRedirect;
  handle?: { crumb?: Crumb };
}

export type PageModule = { default: ComponentType<any> };

export interface PageRoute extends RouteBase {
  path?: string;
  index?: boolean;
  page: () => Promise<PageModule>;
  prefetch?: (params: ParsedParams, searchParams: URLSearchParams) => void;
  children?: RouteNode[];
}

export interface LayoutRoute extends RouteBase {
  path?: string;
  layout: () => Promise<PageModule>;
  prefetch?: (params: ParsedParams, searchParams: URLSearchParams) => void;
  children: RouteNode[];
}

export interface GroupRoute extends RouteBase {
  path: string;
  children: RouteNode[];
}

export interface RedirectRoute extends RouteBase {
  index: true;
  loader: RedirectSpec;
}

export type RouteNode = PageRoute | LayoutRoute | GroupRoute | RedirectRoute;

export type SectionRoute = (PageRoute | LayoutRoute | GroupRoute) & {
  path: string;
  requires: RuleName;
};

export interface DefineRoutesDeps {
  isAllowed(rule: RuleName): boolean;
  /** The session-derived facts a `denyRedirect` resolves its target from (D11). */
  getSources(): AccessSources;
  errorElement: React.ReactNode;
  /** Rendered by `<Suspense>` while a route's module resolves. */
  pendingElement?: React.ReactNode;
  variant?: string;
  parent?: ParentContext;
}

interface ParentContext {
  pattern: string;
  rules: readonly RuleName[];
  params: ParamsDeclaration;
  id: string;
}

const EMPTY_PARENT: ParentContext = {
  pattern: "",
  rules: [],
  params: {},
  id: "root",
};

function joinPattern(prefix: string, path: string | undefined): string {
  const segments = [prefix.replace(/\/$/, ""), (path ?? "").replace(/^\//, "")].filter(Boolean);
  const joined = segments.join("/");
  return joined.startsWith("/") ? joined : `/${joined}`;
}

function indexId(pattern: string): string {
  return pattern === "/" ? "/#index" : `${pattern}#index`;
}

function routeId(pattern: string, suffix: string): string {
  return `${pattern}#${suffix}`;
}

export function defineRoutes(routes: readonly RouteNode[], deps: DefineRoutesDeps): RouteObject[] {
  return buildLevel(routes, deps.parent ?? EMPTY_PARENT, deps);
}

function buildLevel(
  routes: readonly RouteNode[],
  parent: ParentContext,
  deps: DefineRoutesDeps,
): RouteObject[] {
  const built: RouteObject[] = [];
  const seenIds = new Set<string>();

  for (const node of routes) {
    if (deps.variant && node.variants && !node.variants.includes(deps.variant)) continue;

    const pattern = joinPattern(parent.pattern, (node as any).path);
    const rules: readonly RuleName[] = node.requires
      ? [...parent.rules, node.requires]
      : parent.rules;
    const params: ParamsDeclaration = { ...parent.params, ...(node.params ?? {}) };

    assertParamsDeclared(pattern, params);

    const children = (node as any).children as RouteNode[] | undefined;
    const isRedirect = (node as any).index === true && (node as any).loader !== undefined;
    const isLayout = (node as any).layout !== undefined;
    const isGroup = !isLayout && !isRedirect && (node as any).page === undefined;

    const id = isRedirect
      ? indexId(parent.pattern)
      : routeId(pattern, isLayout ? "layout" : isGroup ? "group" : "page");

    if (seenIds.has(id)) {
      throw new Error(`[router] duplicate route id "${id}" among siblings of "${parent.pattern}".`);
    }
    seenIds.add(id);

    const guard: GuardMeta = {
      pattern,
      rules,
      params,
      redirect: isRedirect ? ((node as any).loader as RedirectSpec) : undefined,
      preload: buildPreload(node, deps),
    };

    const handle: Handle = { guard, crumb: node.handle?.crumb };

    if (isRedirect) {
      const spec = (node as any).loader as RedirectSpec;
      built.push({
        id,
        index: true,
        handle,
        loader: () => {
          for (const rule of rules) {
            if (!deps.isAllowed(rule)) throw data(null, { status: 403 });
          }
          throw redirectResponse(spec, {});
        },
      });
      continue;
    }

    const childParent: ParentContext = { pattern, rules, params, id };
    const childRoutes = children ? buildLevel(children, childParent, deps) : [];

    if (isLayout) {
      built.push({
        id,
        path: (node as any).path,
        handle,
        loader: makeLoader(node, guard, deps),
        Component: makeComponent((node as any).layout, deps),
        children: withBoundary(childRoutes, routeId(pattern, "boundary"), deps),
      } as RouteObject);
      continue;
    }

    if (isGroup) {
      const hasGuardWork = Boolean(node.requires) || Boolean((node as any).params);
      built.push({
        id,
        path: (node as any).path,
        handle,
        ...(hasGuardWork ? { loader: makeLoader(node, guard, deps) } : {}),
        children: childRoutes,
      } as RouteObject);
      continue;
    }

    built.push({
      id,
      ...((node as any).index === true ? { index: true } : { path: (node as any).path }),
      handle,
      loader: makeLoader(node, guard, deps),
      Component: makeComponent((node as any).page, deps),
      children: childRoutes.length ? withBoundary(childRoutes, routeId(pattern, "boundary"), deps) : undefined,
    } as RouteObject);
  }

  return built;
}

function withBoundary(
  children: RouteObject[],
  id: string,
  deps: DefineRoutesDeps,
): RouteObject[] {
  return [{ id, errorElement: deps.errorElement, children }];
}

function assertParamsDeclared(pattern: string, params: ParamsDeclaration): void {
  const names = pattern
    .split("/")
    .filter((segment) => segment.startsWith(":"))
    .map((segment) => segment.slice(1));

  for (const name of names) {
    if (!(name in params)) {
      throw new Error(
        `[router] ${pattern}: ":${name}" has no declared param type. Add ` +
          `params: { ${name}: "uuid" } to the route (R4).`,
      );
    }
  }
}

/**
 * D4: this is hole 1's fix. The old version returned `undefined` when a node had
 * no page/layout module, so a GROUP route's `prefetch` — e.g. the `host`
 * section's apartments query — never ran on the hover path and the ~100 ms
 * intent window was thrown away. A node now preloads when it has a module to
 * import OR data/prefetch work to start; the import is simply skipped when there
 * is no module.
 */
function buildPreload(
  node: RouteNode,
  deps: DefineRoutesDeps,
): ((params: ParsedParams, searchParams: URLSearchParams) => void) | undefined {
  const loadModule = (node as any).page ?? (node as any).layout;
  const prefetch = (node as any).prefetch as
    | ((params: ParsedParams, searchParams: URLSearchParams) => void)
    | undefined;
  const data = ((node as any).data ?? []) as readonly ResourceRequest[];

  if (!loadModule && !prefetch && data.length === 0) return undefined;

  return (params: ParsedParams, searchParams: URLSearchParams) => {
    if (!guardPasses(node, deps, params)) return;

    for (const request of data) {
      const spec = resolveResource(request, params, searchParams);
      if (spec) prefetchQuietly(spec);
    }

    prefetch?.(params, searchParams);
    if (loadModule) void loadModule().catch(() => undefined);
  };
}

function guardPasses(node: RouteNode, deps: DefineRoutesDeps, params: ParsedParams): boolean {
  // The preloader (phase 6) already ran the rule and param checks for the whole
  // matched chain; this is the per-route re-check so preload can never start
  // work for a URL the user cannot open.
  if (node.requires && !deps.isAllowed(node.requires)) return false;
  const declared = node.params ?? {};
  return areParamsValid(
    Object.fromEntries(
      Object.keys(declared).map((key) => [key, params[key] === undefined ? undefined : String(params[key])]),
    ),
    declared,
  );
}

function makeLoader(
  node: RouteNode,
  guard: GuardMeta,
  deps: DefineRoutesDeps,
): (args: { params: Record<string, string | undefined>; request: Request }) => Promise<null> {
  const loadModule = ((node as any).page ?? (node as any).layout) as
    | (() => Promise<PageModule>)
    | undefined;
  const prefetch = (node as any).prefetch as
    | ((params: ParsedParams, searchParams: URLSearchParams) => void)
    | undefined;
  const declaredData = ((node as any).data ?? []) as readonly ResourceRequest[];

  return async ({ params, request }) => {
    for (const rule of guard.rules) {
      if (deps.isAllowed(rule)) continue;

      // A denied route may name where the visitor belongs instead (login-redirect
      // D10). `null` — the result for every route that declares nothing — keeps the
      // 403-in-place behaviour (router-maximization D1).
      const target = ((node as any).denyRedirect as DenyRedirect | undefined)?.(deps.getSources());

      if (target === null || target === undefined) throw data(null, { status: 403 });

      throw redirect(target);
    }

    if (!areParamsValid(params, guard.params)) throw data(null, { status: 404 });

    const parsed = parseParams(params, guard.params);
    const searchParams = new URL(request.url).searchParams;

    // D2: the same work the intent path does, so a cold load (no hover) still
    // starts every request alongside the chunk instead of after it.
    for (const item of declaredData) {
      const spec = resolveResource(item, parsed, searchParams);
      if (spec) prefetchQuietly(spec);
    }

    prefetch?.(parsed, searchParams);

    await (loadModule ? loadModule() : Promise.resolve());

    return null;
  };
}

function makeComponent(
  loadModule: (() => Promise<PageModule>) | undefined,
  deps: DefineRoutesDeps,
): ComponentType | undefined {
  if (!loadModule) return undefined;

  const LazyComponent = lazy(async () => {
    const module = await loadModule();
    return { default: module.default };
  });

  return function RoutedComponent(props: Record<string, unknown>) {
    return createElement(
      Suspense,
      { fallback: deps.pendingElement ?? null },
      createElement(LazyComponent, props),
    );
  };
}
