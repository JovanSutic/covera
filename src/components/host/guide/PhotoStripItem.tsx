import { useTranslation } from "react-i18next";

import type { StripItem } from "@/lib/helpers/guideFlow";

interface PhotoStripItemProps {
  item: StripItem;
  total: number;
  onSelect: (index: number) => void;
}

/**
 * One photo in the transparency list (prep §1). It renders the three states the helper
 * already decided, and makes no decision of its own (D25/invariant 10).
 *
 * The captured state is a <button>; the pending state is a <div>. That is the whole of
 * "only the photo components with the photo are clickable" — a pending item cannot be
 * tabbed to, activated, or reached by a screen reader as a control, because it is not
 * one. Invariant 12 pins this by grep.
 */
export function PhotoStripItem({ item, total, onSelect }: PhotoStripItemProps) {
  const { t } = useTranslation("assets");

  // The current step gets the ring; a captured item the host is looking at gets the
  // border. They can be the same item, which is why they are two classes and not three
  // states (prep §1 asks for the highlight on the current step, not on the viewed one).
  const currentRing = item.isCurrent
    ? "ring-2 ring-emerald-500 ring-offset-1 dark:ring-offset-gray-900"
    : "";

  const position = { index: item.index + 1, total };

  if (!item.isCaptured) {
    return (
      <div
        data-testid="guide-strip-item"
        aria-label={t("shotGuide.strip.pendingItem", position)}
        aria-disabled="true"
        className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-900 ${currentRing}`}
      >
        <span aria-hidden="true" className="text-lg">
          📷
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      data-testid="guide-strip-item"
      onClick={() => onSelect(item.index)}
      aria-current={item.isCurrent ? "step" : undefined}
      aria-label={t("shotGuide.strip.capturedItem", position)}
      className={`relative h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-gray-300 bg-gray-950 transition-transform hover:scale-105 dark:border-gray-700 ${currentRing}`}
    >
      <img
        src={item.imageUrl ?? ""}
        alt={item.title}
        className="h-full w-full object-cover"
      />

      {item.isCurrent && (
        <span className="absolute inset-x-0 bottom-0 truncate bg-emerald-600/90 px-1 text-[9px] font-semibold leading-4 text-white">
          {t("shotGuide.strip.currentItem")}
        </span>
      )}
    </button>
  );
}
