import React, { type ElementType, type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

export type CardVariant = "blueGradient" | "white" | "info" | "amber";
export type CardPadding = "none" | "sm" | "md" | "lg";
export type CardRadius = "xl" | "xxl";

export type CardProps<T extends ElementType = "div"> = {
  as?: T;
  variant?: CardVariant;
  padding?: CardPadding;
  radius?: CardRadius;
  hoverable?: boolean;
  shadow?: boolean;
  className?: string;
  children?: React.ReactNode;
} & ComponentPropsWithoutRef<T>;

const variantStyles: Record<CardVariant, string> = {
  blueGradient:
    "border-blue-100/80 bg-gradient-to-b from-blue-50/60 to-white dark:border-blue-900/40 dark:from-blue-950/20 dark:to-gray-900",
  white:
    "border-gray-100 bg-white/80 dark:border-gray-800 dark:bg-gray-800/50",
  info:
    "border-blue-100/80 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/30",
  amber:
    "border-amber-200/80 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/20",
};

const paddingStyles: Record<CardPadding, string> = {
  none: "p-0",
  sm: "p-4",
  md: "p-4 sm:p-5",
  lg: "p-6 sm:p-8",
};

const radiusStyles: Record<CardRadius, string> = {
  xl: "rounded-xl",
  xxl: "rounded-2xl",
};

export function Card<T extends ElementType = "div">({
  as,
  variant = "blueGradient",
  padding = "md",
  radius = "xxl",
  hoverable = false,
  shadow = true,
  className,
  children,
  ...props
}: CardProps<T>) {
  const Component = as || "div";

  return (
    <Component
      className={cn(
        "border transition-all duration-200",
        radiusStyles[radius],
        variantStyles[variant],
        paddingStyles[padding],
        shadow && "shadow-xs",
        hoverable &&
          "cursor-pointer hover:border-blue-200 hover:shadow-md dark:hover:border-blue-800",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}