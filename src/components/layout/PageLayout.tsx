import { cn } from "@/lib/utils";

export type MaxWidthSize = "sm" | "base" | "lg" | "xl" | "full";

const MAX_WIDTH_MAP: Record<MaxWidthSize, string> = {
  sm: "max-w-3xl",
  base: "max-w-5xl",
  lg: "max-w-[1266px]",
  xl: "max-w-7xl",
  full: "max-w-full",
};

type PageLayoutProps = {
  children: React.ReactNode;
  className?: string;
  size?: MaxWidthSize;
};

/**
 * The page wrapper, and prep §4's tooltip boundary.
 *
 * `data-tooltip-host` is the attribute `useTooltipPlacement` looks for with `closest()`. It is
 * on `main` rather than on the inner container so that the boundary is the element every page
 * has exactly one of, and so a tooltip rendered anywhere inside it — including one inside a
 * `SectionCard`'s action slot — is clamped to the page rather than to the card.
 */
function PageLayout({
  children,
  className,
  size = "sm"
}: PageLayoutProps) {
  return (
    <main className="w-full" data-tooltip-host>
      <div
        className={cn(
          "mx-auto w-full",
          MAX_WIDTH_MAP[size],
          "px-4 lg:px-8",
          "pt-4 pb-8",
          className,
        )}
      >
        
        {children}
      </div>
    </main>
  );
}

export default PageLayout;