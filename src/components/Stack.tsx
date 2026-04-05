import { cn } from "@/lib/utils"

type StackProps = {
  children: React.ReactNode
  direction?: "vertical" | "horizontal"
  gap?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10
  className?: string
}

const GAP_MAP: Record<NonNullable<StackProps["gap"]>, string> = {
  0: "gap-0",
  1: "gap-1",
  2: "gap-2",
  3: "gap-3",
  4: "gap-4",
  5: "gap-5",
  6: "gap-6",
  8: "gap-8",
  10: "gap-10",
}

function Stack({
  children,
  direction = "vertical",
  gap = 4,
  className,
}: StackProps) {
  const gapClass = GAP_MAP[gap] ?? "gap-4"

  return (
    <div
      className={cn(
        "flex",
        direction === "vertical" ? "flex-col" : "flex-row",
        gapClass,
        className
      )}
    >
      {children}
    </div>
  )
}

export default Stack