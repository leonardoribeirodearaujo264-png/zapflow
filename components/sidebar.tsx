"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, Smartphone, Bot, CreditCard,
  Calendar, Settings, Zap, LogOut, MessageSquare, ChevronLeft,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useSidebar } from "./sidebar-context"

const navItems = [
  { href: "/dashboard",     label: "Dashboard",    icon: LayoutDashboard },
  { href: "/instances",     label: "Instâncias",   icon: Smartphone },
  { href: "/agents",        label: "Agentes de IA",icon: Bot },
  { href: "/conversations", label: "Conversas",    icon: MessageSquare },
  { href: "/asaas",         label: "Pagamentos",   icon: CreditCard },
  { href: "/calendar",      label: "Agenda",       icon: Calendar },
  { href: "/settings",      label: "Ajustes",      icon: Settings },
]

export function Sidebar() {
  const { open, toggle } = useSidebar()
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <aside
      className={cn(
        "relative flex h-screen shrink-0 flex-col border-r border-white/[0.06] bg-[#0D1117] transition-all duration-300 ease-in-out z-40",
        open ? "w-[260px]" : "w-[72px]"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex h-[72px] shrink-0 items-center border-b border-white/[0.06] transition-all duration-300",
          open ? "px-5 gap-3" : "justify-center px-0"
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#00FF88]/10 border border-[#00FF88]/20">
          <Zap className="h-4 w-4 text-[#00FF88]" />
        </div>
        {open && (
          <div className="overflow-hidden">
            <p className="font-bold text-white text-[15px] tracking-tight whitespace-nowrap">
              Zap<span className="text-[#00FF88]">Flow</span>
            </p>
            <p className="text-[10px] text-[#484F58] leading-none mt-0.5 whitespace-nowrap">
              Automação WhatsApp
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className={cn("flex-1 overflow-y-auto py-4", open ? "px-3" : "px-2")}>
        {open && (
          <p className="px-2 mb-3 text-[10px] font-semibold uppercase tracking-widest text-[#484F58]">
            Menu
          </p>
        )}
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={!open ? item.label : undefined}
                  className={cn(
                    "flex h-11 items-center rounded-xl text-sm font-medium transition-colors duration-150",
                    open ? "gap-3 px-3" : "justify-center px-0",
                    isActive
                      ? "bg-[#00FF88]/[0.12] text-[#00FF88]"
                      : "text-[#8B949E] hover:bg-white/[0.05] hover:text-white"
                  )}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  {open && <span className="truncate">{item.label}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Bottom */}
      <div className={cn("border-t border-white/[0.06] space-y-1", open ? "p-3" : "p-2")}>
        <button
          onClick={handleSignOut}
          title={!open ? "Sair" : undefined}
          className={cn(
            "flex h-11 w-full items-center rounded-xl text-sm font-medium text-[#8B949E] hover:bg-[#F85149]/10 hover:text-[#F85149] transition-colors",
            open ? "gap-3 px-3" : "justify-center"
          )}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          {open && <span>Sair</span>}
        </button>

        <button
          onClick={toggle}
          title={open ? "Recolher" : "Expandir"}
          className={cn(
            "flex h-9 w-full items-center rounded-xl text-xs text-[#484F58] hover:bg-white/[0.04] hover:text-[#8B949E] transition-colors",
            open ? "gap-2 px-3" : "justify-center"
          )}
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 shrink-0 transition-transform duration-300",
              !open && "rotate-180"
            )}
          />
          {open && <span>Recolher sidebar</span>}
        </button>
      </div>
    </aside>
  )
}
