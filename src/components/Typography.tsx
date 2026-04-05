import { cn } from "@/lib/utils";

type TypographyType =
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "body"
  | "body-sm"
  | "caption";

type TypographyProps = {
  type?: TypographyType;
  children: React.ReactNode;
  className?: string;
};

const styles: Record<TypographyType, string> = {
  h1: "font-display text-3xl sm:text-4xl font-semibold tracking-tight leading-tight",
  h2: "font-display text-2xl sm:text-3xl font-semibold tracking-tight leading-tight",
  h3: "font-display text-xl sm:text-2xl font-semibold leading-snug",
  h4: "font-display text-lg font-semibold leading-snug",

  body: "font-sans text-base text-textMain leading-relaxed",
  "body-sm": "font-sans text-sm text-textMuted leading-relaxed",
  caption: "font-sans text-xs text-textMuted leading-normal",
};

function Typography({ type = "body", children, className }: TypographyProps) {
  const Component =
    type === "h1"
      ? "h1"
      : type === "h2"
        ? "h2"
        : type === "h3"
          ? "h3"
          : type === "h4"
            ? "h4"
            : "p";

  return (
    <Component className={cn(styles[type], className)}>{children}</Component>
  );
}

export default Typography;
