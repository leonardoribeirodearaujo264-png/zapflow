"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FF88]/50 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[#00FF88] text-black font-semibold hover:bg-[#00CC6A] hover:shadow-[0_0_20px_rgba(0,255,136,0.3)]",
        secondary:
          "bg-[#161B22] text-[#E6EDF3] border border-[rgba(255,255,255,0.08)] hover:bg-[#1C2128] hover:border-[rgba(255,255,255,0.15)]",
        destructive:
          "bg-[#F85149]/10 text-[#F85149] border border-[#F85149]/20 hover:bg-[#F85149]/20",
        ghost:
          "text-[#8B949E] hover:bg-[#161B22] hover:text-[#E6EDF3]",
        outline:
          "border border-[rgba(255,255,255,0.08)] text-[#E6EDF3] hover:bg-[#161B22]",
        neon:
          "bg-transparent border border-[#00FF88]/50 text-[#00FF88] hover:bg-[#00FF88]/10 hover:border-[#00FF88]",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-lg px-6 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
