"use client"

import { Bell, Search } from "lucide-react"
import { usePathname } from "next/navigation"

const pageTitles: Record<string, { title: string; description: string }> = {
  "/dashboard": { title: "Dashboard", description: "Visão geral da sua plataforma" },
  "/instances": { title: "Instâncias WhatsApp", description: "Gerencie suas conexões WhatsApp" },
  "/agents": { title: "Agentes de IA", description: "Configure seus agentes inteligentes" },
  "/conversations": { title: "Conversas", description: "Histórico e chat ao vivo com contatos" },
  "/asaas": { title: "Pagamentos", description: "Cobranças e clientes via Asaas" },
  "/calendar": { title: "Agenda", description: "Eventos e agendamentos Google Calendar" },
  "/settings": { title: "Ajustes", description: "Configurações da plataforma" },
}

export function Header() {
  const pathname = usePathname()
  const page = Object.entries(pageTitles).find(([key]) => pathname.startsWith(key))?.[1] ?? {
    title: "ZapFlow",
    description: "",
  }

  return (
    <header className="sticky top-0 z-30 flex h-[72px] shrink-0 items-center justify-between px-6 border-b border-white/[0.06] bg-[#080B0F]/95 backdrop-blur-sm">
      <div>
        <h1 className="text-base font-semibold text-[#E6EDF3] leading-tight">
          {page.title}
        </h1>
        {page.description && (
          <p className="text-xs text-[#8B949E] mt-0.5">{page.description}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8B949E] hover:bg-white/[0.05] hover:text-white transition-colors">
          <Search className="h-4 w-4" />
        </button>
        <button className="relative flex h-8 w-8 items-center justify-center rounded-lg text-[#8B949E] hover:bg-white/[0.05] hover:text-white transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[#00FF88]" />
        </button>
        <div className="h-5 w-px bg-white/[0.06] mx-1" />
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00FF88]/10 border border-[#00FF88]/20">
          <span className="text-xs font-bold text-[#00FF88]">Z</span>
        </div>
      </div>
    </header>
  )
}
