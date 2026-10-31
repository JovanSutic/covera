import type { ComponentType, ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

import { AccessLink } from "@/components/router/AccessLink";
import Typography from "@/components/Typography";
import type { PathDefinition } from "@/lib/router";

/**
 * `AccessLink`'s own `params` prop is `ParamsArg<D>`, a conditional type that
 * TypeScript cannot resolve while `D` is still generic — a props object is not
 * assignable to a deferred conditional, and casting the object (`as never`) fails
 * at `TS2698`. Casting the COMPONENT once, to a concrete `params` shape, is what
 * lets `BackLink` stay generic at its call sites: every guard still applies here,
 * and `AccessLink` remains the only place an href is built or a role is checked.
 */
const GuardedLink = AccessLink as unknown as ComponentType<{
  to: PathDefinition;
  params?: Record<string, string | number | number[]>;
  className?: string;
  children: ReactNode;
}>;

type ParamsFor<D extends PathDefinition> = keyof D["params"] extends never
  ? { params?: undefined }
  : { params: Record<string, string | number | number[]> };

export type BackLinkProps<D extends PathDefinition> = {
  to: D;
  /** An already-translated string. The label differs per screen by design. */
  label: string;
} & ParamsFor<D>;

/**
 * The one back affordance (prep §3). `AccessLink`, not `Link`: it keeps the role
 * guard — a viewer who cannot open the target gets plain text rather than a link
 * that ends in a 403 — and the 100 ms hover preload.
 *
 * `label` is a resolved string rather than a key, so the primitive owns no copy.
 */
export function BackLink<D extends PathDefinition>({
  to,
  label,
  ...rest
}: BackLinkProps<D>) {
  const params = (rest as { params?: Record<string, string | number | number[]> })
    .params;

  return (
    <GuardedLink
      to={to}
      {...(params === undefined ? {} : { params })}
      className="group inline-flex items-center gap-1.5 text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
    >
      <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
      <Typography
        type="caption"
        className="font-medium text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
      >
        {label}
      </Typography>
    </GuardedLink>
  );
}
