import { cn } from "@/lib/utils";

type ButtonProps = {
  variant?: "primary" | "secondary"
  className?: string
} & React.ButtonHTMLAttributes<HTMLButtonElement>

function Button({
  variant = "primary",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "px-4 py-2 rounded-lg font-medium transition active:scale-95",
        variant === "primary" &&
          "bg-primary text-white hover:bg-primaryDark",
        variant === "secondary" &&
          "border border-borderSoft hover:bg-graySoft",
        className
      )}
      {...props}
    />
  )
}

export default Button;