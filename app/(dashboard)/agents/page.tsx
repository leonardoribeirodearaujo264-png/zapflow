"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Plus, Bot, Loader2, Trash2, ToggleLeft, ToggleRight,
  Send, Zap, Settings2,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Agent, Instance, AI_MODELS, AIProvider } from "@/types"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/toast"

const PROVIDERS: { id: AIProvider; name: string; color: string; bg: string }[] = [
  { id: "gemini", name: "Google Gemini", color: "#4285F4", bg: "rgba(66,133,244,0.1)" },
  { id: "openai", name: "OpenAI", color: "#10A37F", bg: "rgba(16,163,127,0.1)" },
  { id: "claude", name: "Anthropic Claude", color: "#D4761A", bg: "rgba(212,118,26,0.1)" },
]

const DEFAULT_SYSTEM_PROMPT = `Você é um assistente virtual prestativo e profissional.
Responda de forma clara, concisa e amigável em português brasileiro.
Sempre tente resolver a dúvida ou problema do usuário de forma eficiente.`

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [instances, setInstances] = useState<Instance[]>([])
  const [loading, setLoading] = useState(true)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editAgent, setEditAgent] = useState<Agent | null>(null)
  const [testAgent, setTestAgent] = useState<Agent | null>(null)
  const [testMessages, setTestMessages] = useState<{ role: string; content: string }[]>([])
  const [testInput, setTestInput] = useState("")
  const [testLoading, setTestLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("identity")
  const { toast } = useToast()

  const [form, setForm] = useState({
    name: "",
    description: "",
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    provider: "gemini" as AIProvider,
    model: "gemini-2.0-flash",
    temperature: 0.7,
    maxTokens: 1024,
    isActive: true,
    triggerAllMessages: false,
    triggerKeywords: "oi, olá, menu, ajuda",
    memoryEnabled: true,
    memoryWindow: 10,
    instanceId: "",
  })

  const supabase = createClient()

  const fetchData = useCallback(async (wsId: string) => {
    const [agentsRes, instancesRes] = await Promise.all([
      supabase.from("agents").select("*").eq("workspace_id", wsId).order("created_at"),
      supabase.from("instances").select("*").eq("workspace_id", wsId),
    ])
    setAgents((agentsRes.data as Agent[]) ?? [])
    setInstances((instancesRes.data as Instance[]) ?? [])
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
        if (ws) { setWorkspaceId(ws.id); await fetchData(ws.id) }
      } catch (err) {
        console.error("Agents init error:", err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [fetchData, supabase])

  const openCreate = () => {
    setEditAgent(null)
    setForm({
      name: "", description: "", systemPrompt: DEFAULT_SYSTEM_PROMPT,
      provider: "gemini", model: "gemini-2.0-flash", temperature: 0.7, maxTokens: 1024,
      isActive: true, triggerAllMessages: false, triggerKeywords: "oi, olá, menu, ajuda", memoryEnabled: true,
      memoryWindow: 10, instanceId: "",
    })
    setActiveTab("identity")
    setShowCreate(true)
  }

  const openEdit = (agent: Agent) => {
    setEditAgent(agent)
    setForm({
      name: agent.name, description: agent.description ?? "",
      systemPrompt: agent.system_prompt, provider: agent.provider, model: agent.model,
      temperature: agent.temperature, maxTokens: agent.max_tokens, isActive: agent.is_active,
      triggerAllMessages: agent.trigger_all_messages,
      triggerKeywords: (agent.trigger_keywords ?? []).join(", "),
      memoryEnabled: agent.memory_enabled, memoryWindow: agent.memory_window,
      instanceId: agent.instance_id ?? "",
    })
    setActiveTab("identity")
    setShowCreate(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        workspace_id: workspaceId,
        name: form.name,
        description: form.description || null,
        system_prompt: form.systemPrompt,
        provider: form.provider,
        model: form.model,
        temperature: form.temperature,
        max_tokens: form.maxTokens,
        is_active: form.isActive,
        trigger_all_messages: form.triggerAllMessages,
        trigger_keywords: form.triggerKeywords
          ? form.triggerKeywords.split(",").map((k) => k.trim()).filter(Boolean)
          : [],
        memory_enabled: form.memoryEnabled,
        memory_window: form.memoryWindow,
        instance_id: form.instanceId || null,
      }
      if (editAgent) {
        await supabase.from("agents").update(payload).eq("id", editAgent.id)
      } else {
        await supabase.from("agents").insert(payload)
      }
      setShowCreate(false)
      if (workspaceId) await fetchData(workspaceId)
      toast(editAgent ? "Agente atualizado!" : "Agente criado com sucesso!")
    } catch {
      toast("Erro ao salvar agente.", "error")
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (agent: Agent) => {
    await supabase.from("agents").update({ is_active: !agent.is_active }).eq("id", agent.id)
    if (workspaceId) await fetchData(workspaceId)
  }

  const handleDelete = async (agent: Agent) => {
    if (!confirm(`Excluir agente "${agent.name}"?`)) return
    await supabase.from("agents").delete().eq("id", agent.id)
    if (workspaceId) await fetchData(workspaceId)
  }

  const handleTest = async () => {
    if (!testInput.trim() || !testAgent) return
    const userMsg = { role: "user", content: testInput }
    setTestMessages((prev) => [...prev, userMsg])
    setTestInput("")
    setTestLoading(true)
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: testAgent.provider,
          model: testAgent.model,
          systemPrompt: testAgent.system_prompt,
          temperature: testAgent.temperature,
          maxTokens: testAgent.max_tokens,
          messages: [...testMessages, userMsg].map((m) => ({
            role: m.role === "ai" ? "assistant" : m.role,
            content: m.content,
          })),
        }),
      })
      const data = await res.json()
      setTestMessages((prev) => [...prev, { role: "ai", content: data.text ?? "Erro na resposta" }])
    } catch {
      setTestMessages((prev) => [...prev, { role: "ai", content: "Erro ao conectar com o provedor de IA." }])
    } finally {
      setTestLoading(false)
    }
  }

  const providerFor = (id: AIProvider) => PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0]

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#00FF88]" />
      </div>
    )
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#8B949E]">
          {agents.length} agente{agents.length !== 1 ? "s" : ""} · {agents.filter((a) => a.is_active).length} ativo{agents.filter((a) => a.is_active).length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-[#00FF88] px-4 py-2 text-sm font-semibold text-black hover:bg-[#00CC6A] hover:shadow-[0_0_20px_rgba(0,255,136,0.3)] transition-all"
        >
          <Plus className="h-4 w-4" />
          Novo Agente
        </button>
      </div>

      {/* Create/Edit Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0D1117] shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-[rgba(255,255,255,0.06)] shrink-0">
              <h3 className="text-lg font-semibold text-[#E6EDF3]">
                {editAgent ? "Editar Agente" : "Novo Agente de IA"}
              </h3>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-4 border-b border-[rgba(255,255,255,0.06)] shrink-0">
              {[
                { id: "identity", label: "Identidade" },
                { id: "model", label: "Modelo" },
                { id: "behavior", label: "Comportamento" },
                { id: "link", label: "Vinculação" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                    activeTab === tab.id
                      ? "bg-[#0D1117] text-[#00FF88] border border-[rgba(0,255,136,0.2)]"
                      : "text-[#8B949E] hover:text-[#E6EDF3]"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSave} className="overflow-y-auto">
              <div className="p-6 space-y-4">
                {activeTab === "identity" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-[#8B949E] mb-1.5">Nome do agente *</label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Ex: Assistente de Vendas"
                        required
                        className="w-full h-10 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#161B22] px-3 text-sm text-[#E6EDF3] placeholder:text-[#484F58] focus:outline-none focus:border-[rgba(0,255,136,0.5)]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#8B949E] mb-1.5">Descrição</label>
                      <input
                        type="text"
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        placeholder="Descrição interna do agente"
                        className="w-full h-10 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#161B22] px-3 text-sm text-[#E6EDF3] placeholder:text-[#484F58] focus:outline-none focus:border-[rgba(0,255,136,0.5)]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#8B949E] mb-1.5">
                        Prompt de sistema *
                      </label>
                      <textarea
                        value={form.systemPrompt}
                        onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
                        required
                        rows={8}
                        placeholder="Descreva o comportamento, personalidade e regras do agente..."
                        className="w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#161B22] px-3 py-2 text-sm text-[#E6EDF3] placeholder:text-[#484F58] focus:outline-none focus:border-[rgba(0,255,136,0.5)] resize-none font-mono"
                      />
                      <p className="text-xs text-[#484F58] mt-1">
                        {form.systemPrompt.split(" ").length} palavras · {form.systemPrompt.length} caracteres
                      </p>
                    </div>
                  </>
                )}

                {activeTab === "model" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-[#8B949E] mb-2">Provedor de IA</label>
                      <div className="grid grid-cols-3 gap-2">
                        {PROVIDERS.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setForm({ ...form, provider: p.id, model: AI_MODELS[p.id][0].id })
                            }}
                            className={cn(
                              "rounded-lg border p-3 text-left transition-all",
                              form.provider === p.id
                                ? "border-current bg-current/10"
                                : "border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)]"
                            )}
                            style={form.provider === p.id ? { borderColor: p.color, color: p.color, background: p.bg } : {}}
                          >
                            <p className="text-xs font-semibold">{p.name}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#8B949E] mb-1.5">Modelo</label>
                      <select
                        value={form.model}
                        onChange={(e) => setForm({ ...form, model: e.target.value })}
                        className="w-full h-10 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#161B22] px-3 text-sm text-[#E6EDF3] focus:outline-none focus:border-[rgba(0,255,136,0.5)]"
                      >
                        {AI_MODELS[form.provider].map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#8B949E] mb-1.5">
                        Temperatura: {form.temperature.toFixed(1)}
                        <span className="ml-2 text-[#484F58]">
                          ({form.temperature < 0.3 ? "Preciso" : form.temperature > 0.7 ? "Criativo" : "Balanceado"})
                        </span>
                      </label>
                      <input
                        type="range" min="0" max="1" step="0.1"
                        value={form.temperature}
                        onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })}
                        className="w-full accent-[#00FF88]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#8B949E] mb-1.5">
                        Max tokens: {form.maxTokens}
                      </label>
                      <input
                        type="range" min="256" max="4096" step="256"
                        value={form.maxTokens}
                        onChange={(e) => setForm({ ...form, maxTokens: parseInt(e.target.value) })}
                        className="w-full accent-[#00FF88]"
                      />
                    </div>
                  </>
                )}

                {activeTab === "behavior" && (
                  <>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-[#161B22] border border-[rgba(255,255,255,0.06)]">
                      <div>
                        <p className="text-sm font-medium text-[#E6EDF3]">Responder todas as mensagens</p>
                        <p className="text-xs text-[#8B949E]">O agente responde qualquer mensagem recebida</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, triggerAllMessages: !form.triggerAllMessages })}
                        className="text-[#00FF88]"
                      >
                        {form.triggerAllMessages
                          ? <ToggleRight className="h-6 w-6" />
                          : <ToggleLeft className="h-6 w-6 text-[#484F58]" />
                        }
                      </button>
                    </div>
                    {!form.triggerAllMessages && (
                      <div>
                        <label className="block text-sm font-medium text-[#8B949E] mb-1.5">
                          Palavras-chave de ativação (separadas por vírgula)
                        </label>
                        <input
                          type="text"
                          value={form.triggerKeywords}
                          onChange={(e) => setForm({ ...form, triggerKeywords: e.target.value })}
                          placeholder="oi, olá, menu, ajuda"
                          className="w-full h-10 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#161B22] px-3 text-sm text-[#E6EDF3] placeholder:text-[#484F58] focus:outline-none focus:border-[rgba(0,255,136,0.5)]"
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-[#161B22] border border-[rgba(255,255,255,0.06)]">
                      <div>
                        <p className="text-sm font-medium text-[#E6EDF3]">Memória de conversa</p>
                        <p className="text-xs text-[#8B949E]">Agente lembra do histórico da conversa</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, memoryEnabled: !form.memoryEnabled })}
                        className="text-[#00FF88]"
                      >
                        {form.memoryEnabled
                          ? <ToggleRight className="h-6 w-6" />
                          : <ToggleLeft className="h-6 w-6 text-[#484F58]" />
                        }
                      </button>
                    </div>
                    {form.memoryEnabled && (
                      <div>
                        <label className="block text-sm font-medium text-[#8B949E] mb-1.5">
                          Janela de memória: últimas {form.memoryWindow} mensagens
                        </label>
                        <input
                          type="range" min="2" max="50" step="2"
                          value={form.memoryWindow}
                          onChange={(e) => setForm({ ...form, memoryWindow: parseInt(e.target.value) })}
                          className="w-full accent-[#00FF88]"
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-[#161B22] border border-[rgba(255,255,255,0.06)]">
                      <div>
                        <p className="text-sm font-medium text-[#E6EDF3]">Agente ativo</p>
                        <p className="text-xs text-[#8B949E]">Ligar/desligar o agente</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, isActive: !form.isActive })}
                        className="text-[#00FF88]"
                      >
                        {form.isActive
                          ? <ToggleRight className="h-6 w-6" />
                          : <ToggleLeft className="h-6 w-6 text-[#484F58]" />
                        }
                      </button>
                    </div>
                  </>
                )}

                {activeTab === "link" && (
                  <div>
                    <label className="block text-sm font-medium text-[#8B949E] mb-1.5">
                      Instância WhatsApp vinculada
                    </label>
                    <select
                      value={form.instanceId}
                      onChange={(e) => setForm({ ...form, instanceId: e.target.value })}
                      className="w-full h-10 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#161B22] px-3 text-sm text-[#E6EDF3] focus:outline-none focus:border-[rgba(0,255,136,0.5)]"
                    >
                      <option value="">Sem instância vinculada</option>
                      {instances.map((inst) => (
                        <option key={inst.id} value={inst.id}>{inst.name}</option>
                      ))}
                    </select>
                    {instances.length === 0 && (
                      <p className="text-xs text-[#484F58] mt-2">Crie uma instância WhatsApp primeiro para vincular ao agente.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 p-6 pt-0 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 h-10 rounded-lg border border-[rgba(255,255,255,0.08)] text-sm text-[#8B949E] hover:bg-[#161B22] transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 h-10 rounded-lg bg-[#00FF88] text-sm font-semibold text-black hover:bg-[#00CC6A] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editAgent ? "Salvar alterações" : "Criar agente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Test Agent Modal */}
      {testAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0D1117] shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-[rgba(255,255,255,0.06)] shrink-0 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#E6EDF3]">Testar: {testAgent.name}</p>
                <p className="text-xs text-[#8B949E]">{providerFor(testAgent.provider).name} · {testAgent.model}</p>
              </div>
              <button onClick={() => { setTestAgent(null); setTestMessages([]) }} className="text-[#8B949E] hover:text-[#E6EDF3]">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px]">
              {testMessages.length === 0 && (
                <div className="flex items-center justify-center h-full text-center py-8">
                  <div>
                    <Bot className="h-10 w-10 text-[#484F58] mx-auto mb-2" />
                    <p className="text-sm text-[#8B949E]">Envie uma mensagem para testar o agente</p>
                  </div>
                </div>
              )}
              {testMessages.map((msg, i) => (
                <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                      msg.role === "user"
                        ? "bg-[#00FF88] text-black rounded-br-sm"
                        : "bg-[#161B22] text-[#E6EDF3] rounded-bl-sm border border-[rgba(255,255,255,0.06)]"
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {testLoading && (
                <div className="flex justify-start">
                  <div className="bg-[#161B22] border border-[rgba(255,255,255,0.06)] rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 rounded-full bg-[#8B949E] animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="h-2 w-2 rounded-full bg-[#8B949E] animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="h-2 w-2 rounded-full bg-[#8B949E] animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-[rgba(255,255,255,0.06)] shrink-0 flex gap-2">
              <input
                type="text"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleTest() } }}
                placeholder="Digite uma mensagem..."
                className="flex-1 h-10 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#161B22] px-3 text-sm text-[#E6EDF3] placeholder:text-[#484F58] focus:outline-none focus:border-[rgba(0,255,136,0.5)]"
              />
              <button
                onClick={handleTest}
                disabled={testLoading || !testInput.trim()}
                className="h-10 w-10 rounded-lg bg-[#00FF88] text-black flex items-center justify-center hover:bg-[#00CC6A] disabled:opacity-50 transition-all"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Agents Grid */}
      {agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] mb-4">
            <Bot className="h-8 w-8 text-[#484F58]" />
          </div>
          <h3 className="text-base font-semibold text-[#E6EDF3] mb-1">Nenhum agente criado</h3>
          <p className="text-sm text-[#8B949E] mb-6 max-w-sm">
            Crie seu primeiro agente de IA para automatizar o atendimento no WhatsApp.
          </p>
          <button onClick={openCreate} className="flex items-center gap-2 rounded-lg bg-[#00FF88] px-4 py-2 text-sm font-semibold text-black hover:bg-[#00CC6A] transition-all">
            <Plus className="h-4 w-4" />
            Criar primeiro agente
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {agents.map((agent) => {
            const provider = providerFor(agent.provider)
            return (
              <div
                key={agent.id}
                className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(13,17,23,0.8)] p-5 hover:border-[rgba(255,255,255,0.12)] transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ background: provider.bg, color: provider.color, border: `1px solid ${provider.color}40` }}
                    >
                      {agent.name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#E6EDF3]">{agent.name}</p>
                      <div
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium mt-0.5"
                        style={{ background: provider.bg, color: provider.color }}
                      >
                        <Zap className="h-2.5 w-2.5" />
                        {provider.name} · {agent.model}
                      </div>
                    </div>
                  </div>
                  <div
                    className="rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{
                      background: agent.is_active ? "rgba(63,185,80,0.1)" : "rgba(248,81,73,0.1)",
                      color: agent.is_active ? "#3FB950" : "#F85149",
                    }}
                  >
                    {agent.is_active ? "Ativo" : "Inativo"}
                  </div>
                </div>

                {agent.description && (
                  <p className="text-xs text-[#8B949E] mb-3 line-clamp-2">{agent.description}</p>
                )}

                <div className="flex flex-wrap gap-1 mb-4">
                  {agent.trigger_all_messages && (
                    <span className="rounded-full bg-[#161B22] border border-[rgba(255,255,255,0.06)] px-2 py-0.5 text-[10px] text-[#8B949E]">
                      Todas as msgs
                    </span>
                  )}
                  {agent.memory_enabled && (
                    <span className="rounded-full bg-[#161B22] border border-[rgba(255,255,255,0.06)] px-2 py-0.5 text-[10px] text-[#8B949E]">
                      Memória ativa
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => { setTestAgent(agent); setTestMessages([]) }}
                    className="flex items-center gap-1.5 rounded-lg bg-[#00FF88]/10 border border-[#00FF88]/20 px-3 py-1.5 text-xs font-medium text-[#00FF88] hover:bg-[#00FF88]/20 transition-all"
                  >
                    <Send className="h-3 w-3" />
                    Testar
                  </button>
                  <button
                    onClick={() => openEdit(agent)}
                    className="flex items-center gap-1.5 rounded-lg border border-[rgba(255,255,255,0.08)] px-3 py-1.5 text-xs font-medium text-[#8B949E] hover:bg-[#161B22] hover:text-[#E6EDF3] transition-all"
                  >
                    <Settings2 className="h-3 w-3" />
                    Editar
                  </button>
                  <button
                    onClick={() => handleToggle(agent)}
                    className="flex items-center gap-1.5 rounded-lg border border-[rgba(255,255,255,0.08)] px-3 py-1.5 text-xs font-medium text-[#8B949E] hover:bg-[#161B22] hover:text-[#E6EDF3] transition-all"
                  >
                    {agent.is_active ? <ToggleLeft className="h-3 w-3" /> : <ToggleRight className="h-3 w-3" />}
                  </button>
                  <button
                    onClick={() => handleDelete(agent)}
                    className="flex items-center gap-1.5 rounded-lg border border-[#F85149]/20 px-3 py-1.5 text-xs font-medium text-[#F85149]/70 hover:bg-[#F85149]/10 hover:text-[#F85149] transition-all ml-auto"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
