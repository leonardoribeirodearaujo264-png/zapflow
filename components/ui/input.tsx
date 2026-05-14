import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#161B22] px-3 py-1 text-sm text-[#E6EDF3]",
          "placeholder:text-[#484F58]",
          "transition-all duration-200",
          "focus:outline-none focus:border-[rgba(0,255,136,0.5)] focus:shadow-[0_0_0_3px_rgba(0,255,136,0.1)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
