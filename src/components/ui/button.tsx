import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import type { ButtonHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radio-control)] px-4 py-2 text-base font-medium transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--teal)] text-white shadow-[0_10px_24px_-12px_var(--teal)] hover:bg-[var(--teal-hover)]",
        secondary:
          "border border-[var(--violeta)] bg-[var(--violeta-suave)] text-[var(--violeta)] hover:bg-[var(--violeta)] hover:text-white",
        ghost: "bg-transparent text-[var(--tinta)] hover:bg-[var(--teal-suave)]",
      },
    },
    defaultVariants: {
      variant: "secondary",
    },
  },
)

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }

export function Button({
  className,
  variant,
  asChild = false,
  type = "button",
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      type={asChild ? undefined : type}
      data-primary={variant === "primary" ? "true" : undefined}
      className={cn(buttonVariants({ variant }), className)}
      {...props}
    />
  )
}
