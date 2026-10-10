import type { HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

export function Alert({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-[var(--radio-control)] border border-[var(--error)] border-l-4 bg-[var(--error-suave)] px-3 py-2 text-base text-[var(--error)]",
        className,
      )}
      {...props}
    />
  )
}

export function AlertDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-base", className)} {...props} />
}
