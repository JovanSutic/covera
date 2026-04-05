import { cn } from "@/lib/utils"

type GridProps = {
  children: React.ReactNode
  container?: boolean
  item?: boolean
  gap?: number
  className?: string
  xs?: number
  sm?: number
  md?: number
  lg?: number
}

function getResponsiveSpans({
  xs,
  sm,
  md,
  lg,
}: Pick<GridProps, "xs" | "sm" | "md" | "lg">) {
  return cn(
    xs && `col-span-${xs}`,
    sm && `sm:col-span-${sm}`,
    md && `md:col-span-${md}`,
    lg && `lg:col-span-${lg}`
  )
}

export function Grid({
  children,
  container,
  item,
  gap = 6,
  className,
  xs,
  sm,
  md,
  lg,
}: GridProps) {
  if (container) {
    return (
      <div
        className={cn(
          "grid grid-cols-12",
          `gap-${gap}`,
          className
        )}
      >
        {children}
      </div>
    )
  }

  if (item) {
    return (
      <div
        className={cn(
          getResponsiveSpans({ xs, sm, md, lg }),
          className
        )}
      >
        {children}
      </div>
    )
  }

  return <div className={className}>{children}</div>
}