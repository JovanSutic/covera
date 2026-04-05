import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-borderSoft p-4 transition hover:shadow-md",
        className
      )}
      {...props}
    />
  )
}

export default Card; 