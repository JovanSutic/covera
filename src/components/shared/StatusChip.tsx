import { cn } from "@/lib/utils";
import type { ClaimTone } from "@/lib/helpers/claimStatus";

/**
 * D47: the tone→classes map, once, for the claim surfaces.
 *
 * The values are VERBATIM from `ReservationProofSection`'s own map, which is itself
 * verbatim from `ReservationsTable`'s `STATUS_BADGE_CLASSES` — the point is that a
 * tone is one colour everywhere in this app.
 *
 * This file exists because the item list is the third copy of the map, which is
 * where D44 says duplication stops being justified. The two existing copies are
 * deliberately NOT migrated by this feature: each is a change to a component with
 * its own passing test, and bundling that into this phase would make the diff
 * unreviewable. Migrating them is recorded as out of scope.
 */
const TONE_CLASSES: Record<ClaimTone, string> = {
  success:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  warning:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  danger:
    "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  neutral:
    "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700",
};

interface StatusChipProps {
  tone: ClaimTone;
  /** An already-translated string — the primitive owns no copy and no key naming. */
  label: string;
  className?: string;
}

export function StatusChip({ tone, label, className }: StatusChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}