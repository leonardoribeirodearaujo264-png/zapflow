import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#161B22] px-3 py-2 text-sm text-[#E6EDF3]",
          "placeholder:text-[#484F58]",
          "transition-all duration-200 resize-none",
          "focus:outline-none focus:border-[rgba(0,255,136,0.5)] focus:shadow-[0_0_0_3px_rgba(0,255,136,0.1)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
