import { createClient } from "@/lib/supabase/server"
import { MessageSquare, Smartphone, Bot, DollarSign, Calendar, TrendingUp, Activity, Zap } from "lucide-react"
import { formatCurrency, formatDateTime } from "@/lib/utils"

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

    // Messages: filtered via conversations → instances → workspace (RLS)
    // Only count today's inbound messages; fallback to empty if query fails
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
      bg: "rgba(88,166,255,0.1)",
      border: "rgba(88,166,255,0.2)",
      sub: `${data.messages.filter((m) => m.is_ai_response).length} respondidas por IA`,
    },
    {
      label: "Instâncias Ativas",
      value: `${connectedInstances}/${data.instances.length}`,
      icon: Smartphone,
      color: "#3FB950",
      bg: "rgba(63,185,80,0.1)",
      border: "rgba(63,185,80,0.2)",
      sub: `${data.instances.length - connectedInstances} desconectadas`,
    },
    {
      label: "Agentes de IA",
      value: `${activeAgents}/${data.agents.length}`,
      icon: Bot,
      color: "#00FF88",
      bg: "rgba(0,255,136,0.1)",
      border: "rgba(0,255,136,0.2)",
      sub: "ativos e respondendo",
    },
    {
      label: "Recebido no Mês",
      value: formatCurrency(totalReceivedMonth),
      icon: DollarSign,
      color: "#D29922",
      bg: "rgba(210,153,34,0.1)",
      border: "rgba(210,153,34,0.2)",
      sub: `${pendingPayments} cobranças pendentes`,
    },
  ]

  const statusColors: Record<string, string> = {
    PENDING: "#D29922",
    RECEIVED: "#3FB950",
    CONFIRMED: "#3FB950",
    OVERDUE: "#F85149",
    REFUNDED: "#8B949E",
  }

  const statusLabels: Record<string, string> = {
    PENDING: "Pendente",
    RECEIVED: "Recebido",
    CONFIRMED: "Confirmado",
    OVERDUE: "Vencido",
    REFUNDED: "Estornado",
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#E6EDF3]">
            Olá, {user?.user_metadata?.name ?? user?.email?.split("@")[0]} 👋
          </h2>
          <p className="text-sm text-[#8B949E]">
            {workspace ? `Workspace: ${workspace.name}` : "Configure seu workspace nas ajustes"}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-[rgba(0,255,136,0.2)] bg-[rgba(0,255,136,0.05)] px-3 py-1.5">
          <Activity className="h-3.5 w-3.5 text-[#00FF88] status-pulse" />
          <span className="text-xs font-medium text-[#00FF88]">Sistema Operacional</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <div
              key={kpi.label}
              className="rounded-xl border p-5 transition-all hover:shadow-[0_0_20px_rgba(0,0,0,0.3)]"
              style={{ borderColor: kpi.border, background: `${kpi.bg}` }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-[#8B949E] mb-1">{kpi.label}</p>
                  <p className="text-2xl font-bold text-[#E6EDF3]" style={{ fontFamily: "'Sora', sans-serif" }}>
                    {kpi.value}
                  </p>
                  <p className="text-xs text-[#8B949E] mt-1">{kpi.sub}</p>
                </div>
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: kpi.bg, border: `1px solid ${kpi.border}` }}
                >
                  <Icon className="h-5 w-5" style={{ color: kpi.color }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Instances Status */}
        <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(13,17,23,0.8)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#E6EDF3]" style={{ fontFamily: "'Sora', sans-serif" }}>
              Instâncias WhatsApp
            </h3>
            <Smartphone className="h-4 w-4 text-[#8B949E]" />
          </div>
          {data.instances.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Zap className="h-8 w-8 text-[#484F58] mb-2" />
              <p className="text-sm text-[#8B949E]">Nenhuma instância criada</p>
              <p className="text-xs text-[#484F58] mt-1">Vá em Instâncias para conectar seu WhatsApp</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.instances.map((instance) => (
                <div
                  key={instance.id}
                  className="flex items-center justify-between rounded-lg p-3 bg-[#161B22] border border-[rgba(255,255,255,0.06)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-[#00FF88]/10 flex items-center justify-center text-xs font-bold text-[#00FF88]">
                      {instance.name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#E6EDF3]">{instance.name}</p>
                      <p className="text-xs text-[#8B949E]">{instance.phone_number ?? "Sem número"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full status-pulse"
                      style={{
                        background:
                          instance.status === "connected"
                            ? "#3FB950"
                            : instance.status === "connecting"
                            ? "#D29922"
                            : "#F85149",
                      }}
                    />
                    <span
                      className="text-xs font-medium"
                      style={{
                        color:
                          instance.status === "connected"
                            ? "#3FB950"
                            : instance.status === "connecting"
                            ? "#D29922"
                            : "#F85149",
                      }}
                    >
                      {instance.status === "connected"
                        ? "Conectado"
                        : instance.status === "connecting"
                        ? "Conectando"
                        : "Desconectado"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Payments */}
        <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(13,17,23,0.8)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#E6EDF3]" style={{ fontFamily: "'Sora', sans-serif" }}>
              Últimas Cobranças
            </h3>
            <DollarSign className="h-4 w-4 text-[#8B949E]" />
          </div>
          {data.payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <DollarSign className="h-8 w-8 text-[#484F58] mb-2" />
              <p className="text-sm text-[#8B949E]">Nenhuma cobrança criada</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between rounded-lg p-3 bg-[#161B22] border border-[rgba(255,255,255,0.06)]"
                >
                  <div>
                    <p className="text-sm font-medium text-[#E6EDF3]">
                      {payment.description ?? "Sem descrição"}
                    </p>
                    <p className="text-xs text-[#8B949E]">{formatDateTime(payment.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#E6EDF3]">{formatCurrency(payment.value)}</p>
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

        {/* Upcoming Events */}
        <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(13,17,23,0.8)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#E6EDF3]" style={{ fontFamily: "'Sora', sans-serif" }}>
              Próximos Eventos
            </h3>
            <Calendar className="h-4 w-4 text-[#8B949E]" />
          </div>
          {data.events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Calendar className="h-8 w-8 text-[#484F58] mb-2" />
              <p className="text-sm text-[#8B949E]">Nenhum evento agendado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 rounded-lg p-3 bg-[#161B22] border border-[rgba(255,255,255,0.06)]"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#58A6FF]/10 border border-[#58A6FF]/20">
                    <Calendar className="h-4 w-4 text-[#58A6FF]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#E6EDF3]">{event.title}</p>
                    <p className="text-xs text-[#8B949E]">{formatDateTime(event.start_time)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Agents Status */}
        <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(13,17,23,0.8)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#E6EDF3]" style={{ fontFamily: "'Sora', sans-serif" }}>
              Agentes de IA
            </h3>
            <TrendingUp className="h-4 w-4 text-[#8B949E]" />
          </div>
          {data.agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bot className="h-8 w-8 text-[#484F58] mb-2" />
              <p className="text-sm text-[#8B949E]">Nenhum agente criado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.agents.map((agent) => {
                const providerColors: Record<string, string> = {
                  gemini: "#4285F4",
                  openai: "#10A37F",
                  claude: "#D4761A",
                }
                const providerNames: Record<string, string> = {
                  gemini: "Gemini",
                  openai: "OpenAI",
                  claude: "Claude",
                }
                return (
                  <div
                    key={agent.id}
                    className="flex items-center justify-between rounded-lg p-3 bg-[#161B22] border border-[rgba(255,255,255,0.06)]"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{
                          background: `${providerColors[agent.provider]}20`,
                          color: providerColors[agent.provider],
                          border: `1px solid ${providerColors[agent.provider]}40`,
                        }}
                      >
                        {agent.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#E6EDF3]">{agent.name}</p>
                        <p className="text-xs" style={{ color: providerColors[agent.provider] }}>
                          {providerNames[agent.provider]} · {agent.model}
                        </p>
                      </div>
                    </div>
                    <div
                      className="rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        background: agent.is_active ? "rgba(63,185,80,0.1)" : "rgba(248,81,73,0.1)",
                        color: agent.is_active ? "#3FB950" : "#F85149",
                        border: `1px solid ${agent.is_active ? "rgba(63,185,80,0.2)" : "rgba(248,81,73,0.2)"}`,
                      }}
                    >
                      {agent.is_active ? "Ativo" : "Inativo"}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
