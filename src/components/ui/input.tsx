import type { InputHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex h-11 w-full rounded-[var(--radio-control)] border border-[var(--linea)] bg-white px-3 text-base text-[var(--tinta)] shadow-[inset_0_1px_2px_rgb(26_24_20/0.05)] transition-colors duration-200 placeholder:text-[var(--tinta-suave)] disabled:cursor-not-allowed disabled:bg-[var(--superficie-2)] disabled:opacity-70",
        className,
      )}
      {...props}
    />
  )
}
