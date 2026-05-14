import { createClient } from "@/lib/supabase/server"
import {
  MessageSquare, Smartphone, Bot, DollarSign,
  Calendar, TrendingUp, Activity, Zap, ArrowRight,
} from "lucide-react"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import Link from "next/link"

async function getDashboardData(workspaceId: string) {
  try {
    const supabase = await createClient()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [instances, agents, payments, events] = await Promise.all([
      supabase.from("instances").select("*").eq("workspace_id", workspaceId),
      supabase.from("agents").select("*").eq("workspace_id", workspaceId),
      supabase.from("asaas_payments").select("*").eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false }).limit(5),
      supabase.from("calendar_events").select("*").eq("workspace_id", workspaceId)
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true }).limit(5),
    ])

    const messagesRes = await supabase
      .from("messages")
      .select("id, direction, created_at, is_ai_response")
      .eq("direction", "inbound")
      .gte("created_at", today.toISOString())
      .limit(100)

    return {
      instances: instances.data ?? [],
      agents: agents.data ?? [],
      messages: messagesRes.data ?? [],
      payments: payments.data ?? [],
      events: events.data ?? [],
    }
  } catch {
    return { instances: [], agents: [], messages: [], payments: [], events: [] }
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("*")
    .eq("owner_id", user!.id)
    .single()

  const data = workspace ? await getDashboardData(workspace.id) : {
    instances: [], agents: [], messages: [], payments: [], events: [],
  }

  const connectedInstances = data.instances.filter((i) => i.status === "connected").length
  const activeAgents = data.agents.filter((a) => a.is_active).length
  const totalReceivedMonth = data.payments
    .filter((p) => p.status === "RECEIVED" || p.status === "CONFIRMED")
    .reduce((sum, p) => sum + (p.value ?? 0), 0)
  const pendingPayments = data.payments.filter((p) => p.status === "PENDING").length

  const kpis = [
    {
      label: "Mensagens Hoje",
      value: data.messages.length.toString(),
      icon: MessageSquare,
      color: "#58A6FF",
      bg: "rgba(88,166,255,0.08)",
      border: "rgba(88,166,255,0.2)",
      sub: `${data.messages.filter((m) => m.is_ai_response).length} por IA`,
    },
    {
      label: "Instâncias",
      value: `${connectedInstances}/${data.instances.length}`,
      icon: Smartphone,
      color: "#3FB950",
      bg: "rgba(63,185,80,0.08)",
      border: "rgba(63,185,80,0.2)",
      sub: "conectadas",
    },
    {
      label: "Agentes de IA",
      value: `${activeAgents}/${data.agents.length}`,
      icon: Bot,
      color: "#00FF88",
      bg: "rgba(0,255,136,0.08)",
      border: "rgba(0,255,136,0.2)",
      sub: "ativos",
    },
    {
      label: "Recebido no Mês",
      value: formatCurrency(totalReceivedMonth),
      icon: DollarSign,
      color: "#D29922",
      bg: "rgba(210,153,34,0.08)",
      border: "rgba(210,153,34,0.2)",
      sub: `${pendingPayments} pendentes`,
    },
  ]

  const statusColors: Record<string, string> = {
    PENDING: "#D29922", RECEIVED: "#3FB950", CONFIRMED: "#3FB950",
    OVERDUE: "#F85149", REFUNDED: "#8B949E",
  }
  const statusLabels: Record<string, string> = {
    PENDING: "Pendente", RECEIVED: "Recebido", CONFIRMED: "Confirmado",
    OVERDUE: "Vencido", REFUNDED: "Estornado",
  }
  const providerColors: Record<string, string> = {
    gemini: "#4285F4", openai: "#10A37F", claude: "#D4761A",
  }
  const providerNames: Record<string, string> = {
    gemini: "Gemini", openai: "OpenAI", claude: "Claude",
  }

  return (
    <div className="space-y-8 fade-in max-w-[1400px]">

      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">
            Olá, {user?.user_metadata?.name ?? user?.email?.split("@")[0]} 👋
          </h2>
          <p className="text-[#8B949E] mt-1 text-sm">
            {workspace
              ? `Workspace: ${workspace.name}`
              : "Configure seu workspace nas ajustes"}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-[#00FF88]/20 bg-[#00FF88]/[0.06] px-4 py-2.5 w-fit shrink-0">
          <Activity className="h-4 w-4 text-[#00FF88] status-pulse" />
          <span className="text-sm font-medium text-[#00FF88]">Sistema Operacional</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <div
              key={kpi.label}
              className="rounded-2xl border p-6 transition-all duration-200 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_8px_32px_rgba(0,0,0,0.4)]"
              style={{ borderColor: kpi.border, background: kpi.bg }}
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: `${kpi.color}15`, border: `1px solid ${kpi.color}30` }}
                >
                  <Icon className="h-5 w-5" style={{ color: kpi.color }} />
                </div>
                <span className="text-xs font-medium text-[#8B949E] truncate ml-2 text-right">
                  {kpi.label}
                </span>
              </div>
              <p className="text-3xl font-bold text-white mb-1">{kpi.value}</p>
              <p className="text-xs text-[#8B949E]">{kpi.sub}</p>
            </div>
          )
        })}
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Instâncias */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3FB950]/10">
                <Smartphone className="h-4 w-4 text-[#3FB950]" />
              </div>
              <h3 className="text-sm font-semibold text-white">Instâncias WhatsApp</h3>
            </div>
            <Link
              href="/instances"
              className="flex items-center gap-1 text-xs text-[#8B949E] hover:text-white transition-colors"
            >
              Ver todas <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {data.instances.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/[0.08] mb-3">
                <Zap className="h-7 w-7 text-[#484F58]" />
              </div>
              <p className="text-sm font-medium text-white mb-1">Nenhuma instância criada</p>
              <p className="text-xs text-[#8B949E] mb-4">Conecte seu WhatsApp para começar</p>
              <Link
                href="/instances"
                className="flex items-center gap-2 rounded-lg bg-[#00FF88] px-4 py-2 text-xs font-semibold text-black hover:bg-[#00CC6A] transition-colors"
              >
                Criar Instância
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {data.instances.map((instance) => {
                const sc =
                  instance.status === "connected"
                    ? { color: "#3FB950", label: "Conectado" }
                    : instance.status === "connecting"
                    ? { color: "#D29922", label: "Conectando" }
                    : { color: "#F85149", label: "Desconectado" }
                return (
                  <div
                    key={instance.id}
                    className="flex items-center justify-between rounded-xl p-3 bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                        style={{ background: `${sc.color}18`, color: sc.color }}
                      >
                        {instance.name[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{instance.name}</p>
                        <p className="text-xs text-[#8B949E] truncate">
                          {instance.phone_number ?? "Sem número"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="h-1.5 w-1.5 rounded-full status-pulse" style={{ background: sc.color }} />
                      <span className="text-xs font-medium" style={{ color: sc.color }}>{sc.label}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Últimas cobranças */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D29922]/10">
                <DollarSign className="h-4 w-4 text-[#D29922]" />
              </div>
              <h3 className="text-sm font-semibold text-white">Últimas Cobranças</h3>
            </div>
            <Link
              href="/asaas"
              className="flex items-center gap-1 text-xs text-[#8B949E] hover:text-white transition-colors"
            >
              Ver todas <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {data.payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/[0.08] mb-3">
                <DollarSign className="h-7 w-7 text-[#484F58]" />
              </div>
              <p className="text-sm font-medium text-white mb-1">Nenhuma cobrança criada</p>
              <p className="text-xs text-[#8B949E] mb-4">Crie sua primeira cobrança no Asaas</p>
              <Link
                href="/asaas"
                className="flex items-center gap-2 rounded-lg bg-[#00FF88] px-4 py-2 text-xs font-semibold text-black hover:bg-[#00CC6A] transition-colors"
              >
                Criar Cobrança
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {data.payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between rounded-xl p-3 bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">
                      {payment.description ?? "Sem descrição"}
                    </p>
                    <p className="text-xs text-[#8B949E]">{formatDateTime(payment.created_at)}</p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-semibold text-white">{formatCurrency(payment.value)}</p>
                    <span
                      className="text-xs font-medium"
                      style={{ color: statusColors[payment.status] ?? "#8B949E" }}
                    >
                      {statusLabels[payment.status] ?? payment.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Próximos eventos */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#58A6FF]/10">
                <Calendar className="h-4 w-4 text-[#58A6FF]" />
              </div>
              <h3 className="text-sm font-semibold text-white">Próximos Eventos</h3>
            </div>
            <Link
              href="/calendar"
              className="flex items-center gap-1 text-xs text-[#8B949E] hover:text-white transition-colors"
            >
              Ver todos <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {data.events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/[0.08] mb-3">
                <Calendar className="h-7 w-7 text-[#484F58]" />
              </div>
              <p className="text-sm font-medium text-white mb-1">Nenhum evento agendado</p>
              <p className="text-xs text-[#8B949E] mb-4">Conecte o Google Calendar ou crie um evento</p>
              <Link
                href="/calendar"
                className="flex items-center gap-2 rounded-lg bg-[#00FF88] px-4 py-2 text-xs font-semibold text-black hover:bg-[#00CC6A] transition-colors"
              >
                Criar Evento
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {data.events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 rounded-xl p-3 bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] transition-colors"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#58A6FF]/10 border border-[#58A6FF]/20">
                    <Calendar className="h-4 w-4 text-[#58A6FF]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{event.title}</p>
                    <p className="text-xs text-[#8B949E]">{formatDateTime(event.start_time)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Agentes */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00FF88]/10">
                <TrendingUp className="h-4 w-4 text-[#00FF88]" />
              </div>
              <h3 className="text-sm font-semibold text-white">Agentes de IA</h3>
            </div>
            <Link
              href="/agents"
              className="flex items-center gap-1 text-xs text-[#8B949E] hover:text-white transition-colors"
            >
              Gerenciar <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {data.agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/[0.08] mb-3">
                <Bot className="h-7 w-7 text-[#484F58]" />
              </div>
              <p className="text-sm font-medium text-white mb-1">Nenhum agente criado</p>
              <p className="text-xs text-[#8B949E] mb-4">Crie agentes de IA para automatizar o atendimento</p>
              <Link
                href="/agents"
                className="flex items-center gap-2 rounded-lg bg-[#00FF88] px-4 py-2 text-xs font-semibold text-black hover:bg-[#00CC6A] transition-colors"
              >
                Criar Agente
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {data.agents.map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center justify-between rounded-xl p-3 bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{
                        background: `${providerColors[agent.provider] ?? "#8B949E"}18`,
                        color: providerColors[agent.provider] ?? "#8B949E",
                      }}
                    >
                      {agent.name[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{agent.name}</p>
                      <p className="text-xs truncate" style={{ color: providerColors[agent.provider] ?? "#8B949E" }}>
                        {providerNames[agent.provider] ?? agent.provider} · {agent.model}
                      </p>
                    </div>
                  </div>
                  <span
                    className="shrink-0 ml-2 rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{
                      background: agent.is_active ? "rgba(63,185,80,0.1)" : "rgba(248,81,73,0.1)",
                      color: agent.is_active ? "#3FB950" : "#F85149",
                    }}
                  >
                    {agent.is_active ? "Ativo" : "Inativo"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
