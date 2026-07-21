import { cn } from "@/lib/utils";

type ButtonProps = {
  variant?: "primary" | "secondary";
  className?: string;
  isLoading?: boolean; // Added explicit loading state flag
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

function Button({
  variant = "primary",
  className,
  isLoading,
  disabled,
  children,
  ...props
}: ButtonProps) {
  // Automatically disable if the button is in an active loading frame
  const isButtonDisabled = disabled || isLoading;

  return (
    <button
      className={cn(
        "relative flex items-center justify-center px-4 py-2 rounded-lg font-medium transition cursor-pointer",
        // Prevent active scale click effects when interaction is locked
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
        !isButtonDisabled && "active:scale-95",
        
        // Variants
        variant === "primary" &&
          "bg-primary text-white hover:bg-primaryDark",
        variant === "secondary" &&
          "border border-borderSoft hover:bg-graySoft text-black",
        className
      )}
      disabled={isButtonDisabled}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      <span>{children}</span>
    </button>
  );
}

export default Button;