"use client"

import { Bell, Search, Menu } from "lucide-react"
import { usePathname } from "next/navigation"
import { useSidebar } from "./sidebar-context"

const pageTitles: Record<string, { title: string; description: string }> = {
  "/dashboard":     { title: "Dashboard",            description: "Visão geral da sua plataforma" },
  "/instances":     { title: "Instâncias WhatsApp",  description: "Gerencie suas conexões WhatsApp" },
  "/agents":        { title: "Agentes de IA",         description: "Configure seus agentes inteligentes" },
  "/conversations": { title: "Conversas",             description: "Histórico e chat ao vivo com contatos" },
  "/asaas":         { title: "Pagamentos",            description: "Cobranças e clientes via Asaas" },
  "/calendar":      { title: "Agenda",                description: "Eventos e agendamentos Google Calendar" },
  "/settings":      { title: "Ajustes",               description: "Configurações da plataforma" },
}

export function Header() {
  const { toggle } = useSidebar()
  const pathname = usePathname()
  const page = Object.entries(pageTitles).find(([key]) => pathname.startsWith(key))?.[1] ?? {
    title: "ZapFlow",
    description: "",
  }

  return (
    <header className="sticky top-0 z-30 flex h-[72px] shrink-0 items-center gap-4 px-6 border-b border-white/[0.06] bg-[#070B10]/95 backdrop-blur-sm">
      {/* Hamburger */}
      <button
        onClick={toggle}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#8B949E] hover:bg-white/[0.06] hover:text-white transition-colors"
        aria-label="Alternar sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-semibold text-white leading-tight truncate">{page.title}</h1>
        {page.description && (
          <p className="text-xs text-[#8B949E] mt-0.5 truncate">{page.description}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button className="flex h-9 w-9 items-center justify-center rounded-lg text-[#8B949E] hover:bg-white/[0.06] hover:text-white transition-colors">
          <Search className="h-4 w-4" />
        </button>
        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[#8B949E] hover:bg-white/[0.06] hover:text-white transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-[#00FF88]" />
        </button>
        <div className="w-px h-5 bg-white/[0.08] mx-2" />
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00FF88]/10 border border-[#00FF88]/20">
          <span className="text-xs font-bold text-[#00FF88]">Z</span>
        </div>
      </div>
    </header>
  )
}
