"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Smartphone,
  Bot,
  CreditCard,
  Calendar,
  Settings,
  Zap,
  LogOut,
  MessageSquare,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/instances", label: "Instâncias", icon: Smartphone },
  { href: "/agents", label: "Agentes de IA", icon: Bot },
  { href: "/conversations", label: "Conversas", icon: MessageSquare },
  { href: "/asaas", label: "Pagamentos", icon: CreditCard },
  { href: "/calendar", label: "Agenda", icon: Calendar },
  { href: "/settings", label: "Ajustes", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-60 flex flex-col border-r border-white/[0.06] bg-[#0D1117]">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-[72px] border-b border-white/[0.06] shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00FF88]/10 border border-[#00FF88]/20 shrink-0">
          <Zap className="h-4 w-4 text-[#00FF88]" />
        </div>
        <div>
          <span className="font-bold text-[#E6EDF3] text-base tracking-tight">
            Zap<span className="text-[#00FF88]">Flow</span>
          </span>
          <p className="text-[10px] text-[#484F58] leading-none mt-0.5">Automação WhatsApp</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#484F58]">Menu</p>
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-[#00FF88]/10 text-[#00FF88]"
                      : "text-[#8B949E] hover:bg-white/[0.05] hover:text-white"
                  )}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Bottom */}
      <div className="border-t border-white/[0.06] p-3 shrink-0">
        <button
          onClick={handleSignOut}
          className="flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-[#8B949E] hover:bg-[#F85149]/10 hover:text-[#F85149] transition-colors"
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  )
}
