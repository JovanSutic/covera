import { type ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { Card, type CardProps } from "./Card";

export interface GradientContainerProps extends Omit<
  CardProps<"div">,
  "title"
> {
  badgeText?: string;
  badgeIcon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}

export function GradientContainer({
  badgeText,
  badgeIcon = <Sparkles className="h-4 w-4 shrink-0" />,
  title,
  subtitle,
  description,
  children,
  variant = "blueGradient",
  padding = "lg",
  radius = "xxl",
  className,
  ...cardProps
}: GradientContainerProps) {
  return (
    <Card
      variant={variant}
      padding={padding}
      radius={radius}
      className={className}
      {...cardProps}
    >
      {/* Badge Header */}
      {badgeText && (
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
          {badgeIcon}
          <span>{badgeText}</span>
        </div>
      )}

      {/* Title */}
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
        {title}
      </h1>

      {/* Subtitle */}
      {subtitle && (
        <p className="mt-2 text-base font-semibold text-gray-800 dark:text-gray-200 sm:text-lg">
          {subtitle}
        </p>
      )}

      {/* Main Description */}
      {description && (
        <p className="mt-3 text-base leading-relaxed text-gray-600 dark:text-gray-300">
          {description}
        </p>
      )}

      {/* Slot for custom section content (Explanation Cards, CTA Buttons, Lists, etc.) */}
      {children}
    </Card>
  );
}
