/** R18: the shell paints immediately; this holds the page area during a cold load. */
export function PageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1266px] px-4 pt-4 pb-8 lg:px-8">
      <div className="animate-pulse space-y-4 py-8">
        <div className="h-7 w-56 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="h-4 w-80 rounded bg-gray-100 dark:bg-gray-800/60" />
        <div className="h-40 w-full rounded-lg bg-gray-100 dark:bg-gray-800/60" />
      </div>
    </div>
  );
}
