import { cn } from "@/lib/utils";

type PageLayoutProps = {
  children: React.ReactNode;
  className?: string;
};

function PageLayout({ children, className }: PageLayoutProps) {
  return (
    <main className="w-full">
      <div
        className={cn(
          "mx-auto w-full max-w-[866px]",
          "px-4 sm:px-6 lg:px-8 pb-8",
          "pt-6 sm:pt-8 lg:pt-10 pb-8",
          className,
        )}
      >
        {children}
      </div>
    </main>
  );
}

export default PageLayout;
