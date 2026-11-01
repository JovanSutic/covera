import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";

import type { StripItem } from "@/lib/helpers/guideFlow";

interface PhotoStripItemProps {
  item: StripItem;
  total: number;
  onSelect: (index: number) => void;
}

/**
 * One item of the transparency list (prep §1, §3). It renders the states the helper
 * already decided, and makes no decision of its own (D25/invariant 10).
 *
 * Prep §1's rings, in the operator's own words: "current step will be green, but this
 * let's called it active step will have a light orange ring. Then this situation will be
 * active an current = green, only active = orange, only current = green, all else no
 * ring." That is exactly the two class strings below — `currentRing` is applied last, so
 * an item that is somehow both renders green.
 *
 * The captured state is a <button>; the pending state is a <div>. That is the whole of
 * "only the photo components with the photo are clickable". The confirmation (prep §3) is
 * a third state: a <button> the host may always tap, because it is a step the flow allows
 * them to stand on.
 */
export function PhotoStripItem({ item, total, onSelect }: PhotoStripItemProps) {
  const { t } = useTranslation("assets");

  const currentRing = item.isCurrent
    ? "ring-2 ring-emerald-500 ring-offset-1 dark:ring-offset-gray-900"
    : "";
  const activeRing = item.isActive
    ? "ring-2 ring-orange-400 ring-offset-1 dark:ring-offset-gray-900"
    : "";

  const position = { index: item.index + 1, total };

  if (item.isConfirm) {
    return (
      <button
        type="button"
        data-testid="guide-strip-item"
        onClick={() => onSelect(item.index)}
        aria-current={item.isCurrent ? "step" : undefined}
        aria-label={t("shotGuide.strip.confirmItem")}
        className={`flex h-16 w-16 shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 transition-transform hover:scale-105 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 ${activeRing} ${currentRing}`}
      >
        <Check className="h-5 w-5" aria-hidden="true" />
        <span className="max-w-full truncate px-0.5 text-[9px] font-semibold leading-3">
          {t("shotGuide.strip.confirmTitle")}
        </span>
      </button>
    );
  }

  if (!item.isCaptured) {
    return (
      <div
        data-testid="guide-strip-item"
        aria-label={t("shotGuide.strip.pendingItem", position)}
        aria-disabled="true"
        className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-900 ${activeRing} ${currentRing}`}
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
      className={`relative h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-gray-300 bg-gray-950 transition-transform hover:scale-105 dark:border-gray-700 ${activeRing} ${currentRing}`}
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

      {item.isActive && (
        <span className="absolute inset-x-0 bottom-0 truncate bg-orange-500/90 px-1 text-[9px] font-semibold leading-4 text-white">
          {t("shotGuide.strip.activeItem")}
        </span>
      )}
    </button>
  );
}
