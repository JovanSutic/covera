import { cn } from "@/lib/utils";

type ButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
};

export default function PrimaryButton({
  children,
  onClick,
  disabled = false,
  loading = false,
  fullWidth = false,
  className,
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center",
        "rounded-xl px-6 py-3",
        "font-medium text-white",
        "transition-all duration-200",
        "bg-primary",
        "hover:opacity-90",
        "active:scale-[0.98]",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        fullWidth && "w-full",

        className,
      )}
    >
      {loading ? "Processing..." : children}
    </button>
  );
}
