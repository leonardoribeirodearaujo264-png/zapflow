"use client"

import { useState, useEffect, useCallback } from "react"
import { Settings, Cpu, Globe, Webhook, Loader2, Check, X, Zap, Save } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { AIProvider, AI_MODELS } from "@/types"
import { useToast } from "@/components/ui/toast"

type SettingsTab = "workspace" | "ai" | "integrations" | "webhooks"

const AI_PROVIDERS: { id: AIProvider; name: string; color: string; bg: string }[] = [
  { id: "gemini", name: "Google Gemini", color: "#4285F4", bg: "rgba(66,133,244,0.1)" },
  { id: "openai", name: "OpenAI GPT", color: "#10A37F", bg: "rgba(16,163,127,0.1)" },
  { id: "claude", name: "Anthropic Claude", color: "#D4761A", bg: "rgba(212,118,26,0.1)" },
]

export default function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>("workspace")
  const [loading, setLoading] = useState(true)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [workspace, setWorkspace] = useState<Record<string, unknown> | null>(null)
  const [aiSettings, setAiSettings] = useState<Record<AIProvider, { key: string; testing: boolean; status: string | null }>>({
    gemini: { key: "", testing: false, status: null },
    openai: { key: "", testing: false, status: null },
    claude: { key: "", testing: false, status: null },
  })
  const [wsForm, setWsForm] = useState({ name: "", timezone: "America/Sao_Paulo" })
  const [savingWs, setSavingWs] = useState(false)
  const [webhookLog, setWebhookLog] = useState<Record<string, unknown>[]>([])
  const { toast } = useToast()

  const supabase = createClient()

  const fetchData = useCallback(async (wsId: string) => {
    const [wsRes, aiRes, messagesRes] = await Promise.all([
      supabase.from("workspaces").select("*").eq("id", wsId).single(),
      supabase.from("ai_provider_settings").select("*").eq("workspace_id", wsId),
      supabase.from("messages")
        .select("id, created_at, provider, is_ai_response")
        .eq("is_ai_response", true)
        .order("created_at", { ascending: false })
        .limit(20),
    ])

    if (wsRes.data) {
      setWorkspace(wsRes.data)
      setWsForm({
        name: wsRes.data.name as string,
        timezone: (wsRes.data.timezone as string) ?? "America/Sao_Paulo",
      })
    }

    const aiData = aiRes.data ?? []
    setAiSettings((prev) => {
      const updated = { ...prev }
      aiData.forEach((setting) => {
        if (setting.provider in updated) {
          updated[setting.provider as AIProvider] = {
            ...updated[setting.provider as AIProvider],
            key: setting.api_key as string,
          }
        }
      })
      return updated
    })

    setWebhookLog(messagesRes.data ?? [])
  }, [supabase])

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: ws } = await supabase
          .from("workspaces")
          .select("id")
          .eq("owner_id", user.id)
          .single()
        if (ws) {
          setWorkspaceId(ws.id)
          await fetchData(ws.id)
        }
      } catch (err) {
        console.error("Settings init error:", err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [fetchData, supabase])

  const handleSaveWorkspace = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!workspaceId) {
      toast("Nenhum workspace encontrado. Faça logout e login novamente.", "error")
      return
    }
    setSavingWs(true)
    try {
      const { error } = await supabase
        .from("workspaces")
        .update({ name: wsForm.name, timezone: wsForm.timezone })
        .eq("id", workspaceId)
      if (error) throw error
      toast("Workspace atualizado com sucesso!")
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao salvar workspace", "error")
    } finally {
      setSavingWs(false)
    }
  }

  const handleSaveAiKey = async (provider: AIProvider, key: string) => {
    if (!workspaceId) return
    const { data: existing } = await supabase
      .from("ai_provider_settings")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("provider", provider)
      .single()

    if (existing) {
      await supabase.from("ai_provider_settings").update({ api_key: key }).eq("id", existing.id)
    } else {
      await supabase.from("ai_provider_settings").insert({
        workspace_id: workspaceId,
        provider,
        api_key: key,
        is_active: true,
      })
    }
  }

  const handleTestProvider = async (provider: AIProvider) => {
    const key = aiSettings[provider].key
    if (!key) {
      toast("Digite a API key primeiro", "warning")
      return
    }

    setAiSettings((prev) => ({ ...prev, [provider]: { ...prev[provider], testing: true, status: null } }))

    try {
      const res = await fetch("/api/ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey: key }),
      })
      const data = await res.json()
      const status = data.ok ? "ok" : "error"
      setAiSettings((prev) => ({ ...prev, [provider]: { ...prev[provider], testing: false, status } }))
      if (data.ok) {
        await handleSaveAiKey(provider, key)
        toast(`${provider} conectado e salvo com sucesso!`)
      } else {
        toast("API key inválida ou sem permissão", "error")
      }
    } catch {
      setAiSettings((prev) => ({ ...prev, [provider]: { ...prev[provider], testing: false, status: "error" } }))
      toast("Erro ao testar o provedor", "error")
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#00FF88]" />
      </div>
    )
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-[#161B22] p-1 border border-[rgba(255,255,255,0.06)] w-fit flex-wrap">
        {([
          { id: "workspace" as const, label: "Workspace", icon: Settings },
          { id: "ai" as const, label: "Provedores IA", icon: Cpu },
          { id: "integrations" as const, label: "Integrações", icon: Globe },
          { id: "webhooks" as const, label: "Webhooks", icon: Webhook },
        ]).map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                tab === t.id
                  ? "bg-[#0D1117] text-[#00FF88]"
                  : "text-[#8B949E] hover:text-[#E6EDF3]"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Workspace Tab */}
      {tab === "workspace" && (
        <div className="max-w-lg">
          <div className="rounded-xl border border-[rgba(255,255,255,0.12)] bg-[#0D1117] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
            <h3 className="text-base font-semibold text-[#E6EDF3] mb-5">
              Informações do Workspace
            </h3>
            <form onSubmit={handleSaveWorkspace} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-[#C9D1D9] mb-2">
                  Nome do workspace
                </label>
                <input
                  type="text"
                  value={wsForm.name}
                  onChange={(e) => setWsForm({ ...wsForm, name: e.target.value })}
                  placeholder="Ex: Meu Negócio"
                  className="w-full h-10 rounded-lg border border-[rgba(255,255,255,0.15)] bg-[#161B22] px-3 text-sm text-[#E6EDF3] placeholder:text-[#484F58] focus:outline-none focus:border-[rgba(0,255,136,0.5)] focus:shadow-[0_0_0_3px_rgba(0,255,136,0.1)] transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#C9D1D9] mb-2">
                  Fuso horário
                </label>
                <select
                  value={wsForm.timezone}
                  onChange={(e) => setWsForm({ ...wsForm, timezone: e.target.value })}
                  className="w-full h-10 rounded-lg border border-[rgba(255,255,255,0.15)] bg-[#161B22] px-3 text-sm text-[#E6EDF3] focus:outline-none focus:border-[rgba(0,255,136,0.5)] transition-all"
                >
                  <option value="America/Sao_Paulo">America/Sao_Paulo (UTC-3)</option>
                  <option value="America/Manaus">America/Manaus (UTC-4)</option>
                  <option value="America/Fortaleza">America/Fortaleza (UTC-3)</option>
                  <option value="America/Recife">America/Recife (UTC-3)</option>
                  <option value="America/Belem">America/Belém (UTC-3)</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={savingWs}
                className="w-full h-10 rounded-lg bg-[#00FF88] text-sm font-semibold text-black hover:bg-[#00CC6A] hover:shadow-[0_0_20px_rgba(0,255,136,0.3)] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {savingWs ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Salvar alterações
                  </>
                )}
              </button>
            </form>
            {workspace && (
              <div className="mt-5 pt-4 border-t border-[rgba(255,255,255,0.08)]">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[#484F58]">
                    Plano:{" "}
                    <span className="capitalize text-[#8B949E]">
                      {workspace.plan as string}
                    </span>
                  </p>
                  <p className="text-[10px] font-mono text-[#484F58] truncate max-w-[180px]">
                    {workspace.id as string}
                  </p>
                </div>
              </div>
            )}
            {!workspace && !loading && (
              <div className="mt-4 rounded-lg border border-[#D29922]/20 bg-[#D29922]/10 p-3">
                <p className="text-xs text-[#D29922]">
                  Workspace não encontrado. Faça logout e registre uma nova conta.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Providers Tab */}
      {tab === "ai" && (
        <div className="space-y-4 max-w-xl">
          <p className="text-xs text-[#8B949E]">
            Configure as chaves de API dos provedores de IA. Elas são salvas com segurança no banco de dados.
          </p>
          {AI_PROVIDERS.map((provider) => {
            const state = aiSettings[provider.id]
            return (
              <div
                key={provider.id}
                className="rounded-xl border border-[rgba(255,255,255,0.12)] bg-[#0D1117] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.3)]"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center"
                    style={{ background: provider.bg }}
                  >
                    <Zap className="h-5 w-5" style={{ color: provider.color }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#E6EDF3]">{provider.name}</p>
                    <p className="text-xs text-[#8B949E]">
                      {AI_MODELS[provider.id].map((m) => m.name).join(", ")}
                    </p>
                  </div>
                  {state.status && (
                    <div className="ml-auto shrink-0">
                      {state.status === "ok" ? (
                        <div className="flex items-center gap-1 text-[#3FB950] text-xs">
                          <Check className="h-4 w-4" /> Conectado
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[#F85149] text-xs">
                          <X className="h-4 w-4" /> Inválido
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={state.key}
                    onChange={(e) =>
                      setAiSettings((prev) => ({
                        ...prev,
                        [provider.id]: { ...prev[provider.id], key: e.target.value },
                      }))
                    }
                    placeholder={`API Key — ${provider.name}`}
                    className="flex-1 h-10 rounded-lg border border-[rgba(255,255,255,0.15)] bg-[#161B22] px-3 text-sm text-[#E6EDF3] placeholder:text-[#484F58] focus:outline-none focus:border-[rgba(0,255,136,0.5)] focus:shadow-[0_0_0_3px_rgba(0,255,136,0.1)] transition-all"
                  />
                  <button
                    onClick={() => handleTestProvider(provider.id)}
                    disabled={state.testing || !state.key}
                    className="h-10 px-4 rounded-lg border border-[rgba(255,255,255,0.15)] text-sm text-[#8B949E] hover:bg-[#161B22] hover:text-[#E6EDF3] disabled:opacity-50 transition-all flex items-center gap-2"
                  >
                    {state.testing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Testar"}
                  </button>
                </div>
                <p className="text-[11px] text-[#484F58] mt-2">
                  A chave é testada e salva automaticamente ao clicar em "Testar".
                </p>
              </div>
            )
          })}
        </div>
      )}

      {/* Integrations Tab */}
      {tab === "integrations" && (
        <div className="space-y-4 max-w-xl">
          <div className="rounded-xl border border-[rgba(255,255,255,0.12)] bg-[#0D1117] p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#4285F4]/10 flex items-center justify-center">
                  <Globe className="h-5 w-5 text-[#4285F4]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#E6EDF3]">Google Calendar</p>
                  <p className="text-xs text-[#8B949E]">Sincronize eventos e agendamentos</p>
                </div>
              </div>
              <a
                href="/calendar"
                className="rounded-lg border border-[rgba(255,255,255,0.12)] px-3 py-1.5 text-xs text-[#8B949E] hover:bg-[#161B22] hover:text-[#E6EDF3] transition-all"
              >
                Gerenciar
              </a>
            </div>
          </div>
          <div className="rounded-xl border border-[rgba(255,255,255,0.12)] bg-[#0D1117] p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#D29922]/10 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-[#D29922]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#E6EDF3]">Asaas</p>
                  <p className="text-xs text-[#8B949E]">Cobranças e pagamentos online</p>
                </div>
              </div>
              <a
                href="/asaas"
                className="rounded-lg border border-[rgba(255,255,255,0.12)] px-3 py-1.5 text-xs text-[#8B949E] hover:bg-[#161B22] hover:text-[#E6EDF3] transition-all"
              >
                Gerenciar
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Webhooks Tab */}
      {tab === "webhooks" && (
        <div className="space-y-4 max-w-2xl">
          <div className="rounded-xl border border-[rgba(255,255,255,0.12)] bg-[#0D1117] p-5">
            <h3 className="text-sm font-semibold text-[#E6EDF3] mb-4">URLs de Webhook</h3>
            <div className="space-y-3">
              {[
                { label: "UazAPI (WhatsApp)", path: "/api/webhook/uazapi" },
                { label: "Asaas (Pagamentos)", path: "/api/webhook/asaas" },
              ].map((wh) => (
                <div key={wh.path}>
                  <p className="text-xs font-medium text-[#C9D1D9] mb-1.5">{wh.label}</p>
                  <div className="flex items-center gap-2 rounded-lg bg-[#161B22] border border-[rgba(255,255,255,0.12)] px-3 py-2.5">
                    <code className="flex-1 text-xs font-mono text-[#00FF88] truncate">
                      {typeof window !== "undefined"
                        ? window.location.origin
                        : "https://seu-dominio.vercel.app"}
                      {wh.path}
                    </code>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg border border-[#58A6FF]/20 bg-[#58A6FF]/5 p-3">
              <p className="text-xs text-[#58A6FF]">
                Configure essas URLs no painel do UazAPI e no painel do Asaas para receber eventos.
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-[rgba(255,255,255,0.12)] bg-[#0D1117] p-5">
            <h3 className="text-sm font-semibold text-[#E6EDF3] mb-4">Log de Atividade de IA</h3>
            {webhookLog.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Zap className="h-8 w-8 text-[#484F58] mb-2" />
                <p className="text-sm text-[#8B949E]">Nenhuma resposta de IA registrada ainda</p>
                <p className="text-xs text-[#484F58] mt-1">
                  As respostas aparecem aqui após o agente responder mensagens
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {webhookLog.map((msg) => (
                  <div
                    key={msg.id as string}
                    className="flex items-center gap-3 rounded-lg bg-[#161B22] border border-[rgba(255,255,255,0.08)] p-3"
                  >
                    <div className="h-2 w-2 rounded-full bg-[#00FF88] status-pulse shrink-0" />
                    <span className="text-xs text-[#8B949E] flex-1">
                      Resposta de IA via {(msg.provider as string) ?? "provedor desconhecido"}
                    </span>
                    <span className="text-[10px] text-[#484F58] font-mono shrink-0">
                      {new Date(msg.created_at as string).toLocaleTimeString("pt-BR")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
