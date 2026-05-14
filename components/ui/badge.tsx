import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/20",
        secondary: "bg-[#161B22] text-[#8B949E] border border-[rgba(255,255,255,0.08)]",
        destructive: "bg-[#F85149]/10 text-[#F85149] border border-[#F85149]/20",
        warning: "bg-[#D29922]/10 text-[#D29922] border border-[#D29922]/20",
        info: "bg-[#58A6FF]/10 text-[#58A6FF] border border-[#58A6FF]/20",
        success: "bg-[#3FB950]/10 text-[#3FB950] border border-[#3FB950]/20",
        gemini: "bg-[#4285F4]/10 text-[#4285F4] border border-[#4285F4]/20",
        openai: "bg-[#10A37F]/10 text-[#10A37F] border border-[#10A37F]/20",
        claude: "bg-[#D4761A]/10 text-[#D4761A] border border-[#D4761A]/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
