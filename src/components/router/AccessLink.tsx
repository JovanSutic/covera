import { Link, NavLink } from "react-router";
import type { ReactNode } from "react";

import { useAccessStore } from "@/lib/router/AppContext";
import { buildPath } from "@/lib/router/paths";
import type { PathDefinition } from "@/lib/router/paths";
import { usePreloadRoute } from "@/hooks/usePreloadRoute";

type ParamsArg<D extends PathDefinition> = keyof D["params"] extends never
  ? { params?: undefined }
  : { params: Record<string, string | number | number[]> };

export type AccessLinkProps<D extends PathDefinition> = {
  to: D;
  children: ReactNode;
  className?: string;
  /** Renders a `NavLink`; the callback receives its active state. */
  navClassName?: (state: { isActive: boolean; isPending: boolean }) => string;
} & ParamsArg<D>;

/**
 * R20/H10: the only link that can point at an app path. A viewer who cannot open
 * the target gets plain text, never a link that ends in a 403 (principle 4), and
 * a viewer who can gets intent preloading for free.
 */
export function AccessLink<D extends PathDefinition>({
  to,
  params,
  children,
  className,
  navClassName,
}: AccessLinkProps<D>) {
  const access = useAccessStore();

  const canOpen = access.canOpenPath(to);
  const href = canOpen
    ? buildPath(to, ...((params === undefined ? [] : [params]) as never))
    : null;

  const preloadHandlers = usePreloadRoute(href, canOpen);

  if (!href) {
    return <span className={className}>{children}</span>;
  }

  if (navClassName) {
    return (
      <NavLink
        to={href}
        className={({ isActive, isPending }) => navClassName({ isActive, isPending })}
        {...preloadHandlers}
      >
        {children}
      </NavLink>
    );
  }

  return (
    <Link to={href} className={className} {...preloadHandlers}>
      {children}
    </Link>
  );
}
