export function UnmatchedAssetsBanner({
  unmatchedCount,
  onNavigateToStudio,
}: {
  unmatchedCount: number;
  onNavigateToStudio?: () => void;
}) {
  if (unmatchedCount === 0) return null;

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-amber-200/80 bg-amber-50/60 px-4 py-2.5 text-xs text-amber-900 transition-all">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
        </span>
        <span>
          <strong className="font-semibold">{unmatchedCount} {unmatchedCount === 1 ? "asset" : "assets"}</strong> missing photo coverage.
        </span>
      </div>
      {onNavigateToStudio && (
        <button
          onClick={onNavigateToStudio}
          className="font-medium text-amber-900 hover:text-amber-950 underline underline-offset-2 transition-colors cursor-pointer shrink-0"
        >
          Review in Shot Studio →
        </button>
      )}
    </div>
  );
}