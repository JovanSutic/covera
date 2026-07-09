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

function PageLayout({ 
  children, 
  className, 
  size = "lg"
}: PageLayoutProps) {
  return (
    <main className="w-full">
      <div
        className={cn(
          "mx-auto w-full",
          MAX_WIDTH_MAP[size],
          "px-4 lg:px-8",
          "pt-6 pb-8",
          className,
        )}
      >
        
        {children}
      </div>
    </main>
  );
}

export default PageLayout;