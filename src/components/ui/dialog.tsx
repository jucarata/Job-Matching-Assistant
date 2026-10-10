import * as DialogPrimitive from "@radix-ui/react-dialog"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

export const Dialog = DialogPrimitive.Root

export function DialogContent({
  className,
  children,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 bg-[color-mix(in_srgb,var(--violeta)_35%,transparent)] backdrop-blur-[2px]" />
      <DialogPrimitive.Content
        aria-describedby={undefined}
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-[min(100%-2rem,28rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[var(--radio-tarjeta)] border border-[var(--linea)] bg-[var(--superficie)] text-[var(--tinta)] shadow-[0_24px_60px_-24px_rgb(108_92_231/0.55)]",
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export function DialogTitle({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("text-base font-medium text-[var(--tinta)]", className)}
      {...props}
    />
  )
}

export function DialogClose({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Close>) {
  return (
    <DialogPrimitive.Close
      className={cn(
        "mt-4 inline-flex items-center justify-center rounded-[var(--radio-control)] border border-[var(--linea)] px-4 py-2 text-base text-[var(--tinta)] transition-colors duration-200 hover:bg-[var(--superficie-2)]",
        className,
      )}
      {...props}
    />
  )
}
