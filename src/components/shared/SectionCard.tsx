import type { ReactNode } from "react";

import Typography from "@/components/Typography";
import { cn } from "@/lib/utils";
import { Card } from "./Card";

interface SectionCardProps {
  /** An already-translated string, rendered as the section's `h3`. */
  title?: string;
  /** Right-aligned in the heading row — an edit affordance, or a status chip. */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * One content section (prep §3: "section style in general should be the same as in
 * other pages"). `ReservationPage.tsx` repeats the same four-class section wrapper
 * three times; this is that container, once, wrapping the shared `Card`.
 *
 * `Card` itself is NOT modified (D21) — it is used app-wide, and reshaping its
 * padding to suit this page would change every page that uses it.
 *
 * The background is passed explicitly rather than inherited from `Card`'s `white`
 * variant, whose `dark:bg-gray-800/50` references an unregistered token (D12).
 */
export function SectionCard({
  title,
  action,
  children,
  className,
}: SectionCardProps) {
  return (
    <Card
      as="section"
      variant="white"
      padding="md"
      radius="xl"
      className={cn(
        "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900",
        className,
      )}
    >
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-4">
          {title && <Typography type="h3">{title}</Typography>}
          {action}
        </div>
      )}
      {children}
    </Card>
  );
}
