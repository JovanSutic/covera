import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ExplanationCardVariant = "info" | "neutral";

interface ExplanationCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  variant?: ExplanationCardVariant;
  className?: string;
}

const variantStyles: Record<
  ExplanationCardVariant,
  {
    container: string;
    title: string;
    description: string;
  }
> = {
  info: {
    container:
      "border-blue-100/80 dark:border-blue-900/50",
    title: "text-blue-950 dark:text-blue-200",
    description: "text-blue-900/80 dark:text-blue-300/80 sm:text-sm",
  },
  neutral: {
    container:
      "border-gray-100 bg-white/80 dark:border-gray-800 dark:bg-gray-800/50 shadow-xs",
    title: "text-gray-900 dark:text-white",
    description: "text-gray-500 dark:text-gray-400",
  },
};

export function ExplanationCard({
  title,
  description,
  icon,
  variant = "neutral",
  className,
}: ExplanationCardProps) {
  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border p-4 transition-colors",
        styles.container,
        className
      )}
    >
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div>
        <h2 className={cn("text-sm font-semibold", styles.title)}>{title}</h2>
        <p className={cn("mt-0.5 text-xs leading-relaxed", styles.description)}>
          {description}
        </p>
      </div>
    </div>
  );
}