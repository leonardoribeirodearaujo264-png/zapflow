"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  Plus, Smartphone, QrCode, WifiOff, Trash2, RotateCcw,
  Loader2, Copy, Check, Settings, RefreshCw, Zap,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Instance } from "@/types"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/toast"

export default function InstancesPage() {
  const [instances, setInstances] = useState<Instance[]>([])
  const [loading, setLoading] = useState(true)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [qrModal, setQrModal] = useState<{ instance: Instance; qr: string } | null>(null)
  const [qrLoading, setQrLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const { toast } = useToast()

  const [form, setForm] = useState({ name: "", baseUrl: "", token: "" })
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState("")

  const supabase = createClient()

  const fetchInstances = useCallback(async (wsId: string) => {
    const { data } = await supabase
      .from("instances")
      .select("*")
      .eq("workspace_id", wsId)
      .order("created_at")
    setInstances((data as Instance[]) ?? [])
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
          await fetchInstances(ws.id)
        }
      } catch (err) {
        console.error("Instances init error:", err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [fetchInstances, supabase])

  // Limpar polling ao desmontar
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setFormError("")
    try {
      const { error } = await supabase.from("instances").insert({
        workspace_id: workspaceId,
        name: form.name,
        base_url: form.baseUrl.replace(/\/$/, ""),
        token: form.token,
        status: "disconnected",
      })
      if (error) throw error
      setShowCreate(false)
      setForm({ name: "", baseUrl: "", token: "" })
      if (workspaceId) await fetchInstances(workspaceId)
      toast("Instância criada com sucesso!")
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Erro ao criar instância")
    } finally {
      setCreating(false)
    }
  }

  const handleConnect = async (instance: Instance) => {
    setQrLoading(true)
    try {
      const res = await fetch(`/api/instances/${instance.id}/connect`)
      const data = await res.json()

      if (data.qrcode?.base64) {
        setQrModal({ instance, qr: data.qrcode.base64 })
        startPolling(instance)
      } else if (data.instance?.state === "open") {
        await supabase.from("instances").update({ status: "connected" }).eq("id", instance.id)
        if (workspaceId) await fetchInstances(workspaceId)
        toast("WhatsApp já está conectado!")
      } else {
        toast("Aguardando QR Code... tente novamente em instantes.", "info")
      }
    } catch {
      toast("Erro ao conectar. Verifique a URL e o token da instância.", "error")
    } finally {
      setQrLoading(false)
    }
  }

  const startPolling = (instance: Instance) => {
    if (pollingRef.current) clearInterval(pollingRef.current)

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/instances/${instance.id}/status`)
        const data = await res.json()
        const state = data.instance?.state ?? data.state

        if (state === "open") {
          clearInterval(pollingRef.current!)
          pollingRef.current = null
          setQrModal(null)
          await supabase.from("instances").update({ status: "connected" }).eq("id", instance.id)
          if (workspaceId) await fetchInstances(workspaceId)
          toast("WhatsApp conectado com sucesso!")
        }
      } catch { /* ignora erros de polling */ }
    }, 4000)

    // Timeout de 3 minutos
    setTimeout(() => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }, 180000)
  }

  const refreshQr = async () => {
    if (!qrModal) return
    setQrLoading(true)
    try {
      const res = await fetch(`/api/instances/${qrModal.instance.id}/connect`)
      const data = await res.json()
      if (data.qrcode?.base64) {
        setQrModal((prev) => prev ? { ...prev, qr: data.qrcode.base64 } : null)
      }
    } finally {
      setQrLoading(false)
    }
  }

  const handleDisconnect = async (instance: Instance) => {
    if (!confirm(`Desconectar "${instance.name}"?`)) return
    try {
      await fetch(`/api/instances/${instance.id}/logout`, { method: "POST" })
      await supabase.from("instances").update({ status: "disconnected", phone_number: null }).eq("id", instance.id)
      if (workspaceId) await fetchInstances(workspaceId)
      toast("Instância desconectada.")
    } catch {
      toast("Erro ao desconectar.", "error")
    }
  }

  const handleRestart = async (instance: Instance) => {
    try {
      await fetch(`/api/instances/${instance.id}/restart`, { method: "POST" })
      await supabase.from("instances").update({ status: "connecting" }).eq("id", instance.id)
      if (workspaceId) await fetchInstances(workspaceId)
      toast("Reiniciando instância...", "info")
    } catch {
      toast("Erro ao reiniciar.", "error")
    }
  }

  const handleDelete = async (instance: Instance) => {
    if (!confirm(`Excluir "${instance.name}"? Esta ação não pode ser desfeita.`)) return
    await supabase.from("instances").delete().eq("id", instance.id)
    if (workspaceId) await fetchInstances(workspaceId)
    toast("Instância excluída.")
  }

  const handleSetWebhook = async (instance: Instance) => {
    const webhookUrl = `${window.location.origin}/api/webhook/uazapi`
    try {
      await fetch(`/api/instances/${instance.id}/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl }),
      })
      await supabase.from("instances").update({ webhook_url: webhookUrl }).eq("id", instance.id)
      await fetchInstances(workspaceId!)
      toast("Webhook configurado!")
    } catch {
      toast("Erro ao configurar webhook.", "error")
    }
  }

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const statusConfig = {
    connected:    { color: "#3FB950", label: "Conectado",    border: "rgba(63,185,80,0.3)",  bg: "rgba(63,185,80,0.08)" },
    connecting:   { color: "#D29922", label: "Conectando",   border: "rgba(210,153,34,0.3)", bg: "rgba(210,153,34,0.08)" },
    disconnected: { color: "#F85149", label: "Desconectado", border: "rgba(248,81,73,0.3)",  bg: "rgba(248,81,73,0.08)" },
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
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#8B949E]">
          {instances.length} instância{instances.length !== 1 ? "s" : ""} ·{" "}
          <span className="text-[#3FB950]">{instances.filter((i) => i.status === "connected").length} conectada{instances.filter((i) => i.status === "connected").length !== 1 ? "s" : ""}</span>
        </p>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-[#00FF88] px-4 py-2 text-sm font-semibold text-black hover:bg-[#00CC6A] hover:shadow-[0_0_20px_rgba(0,255,136,0.3)] transition-all"
        >
          <Plus className="h-4 w-4" />
          Nova Instância
        </button>
      </div>

      {/* Modal Criar */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0D1117] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
            <h3 className="text-lg font-semibold text-[#E6EDF3] mb-1">Nova Instância WhatsApp</h3>
            <p className="text-sm text-[#8B949E] mb-5">Conecte uma instância do UazAPI para automação via WhatsApp.</p>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#8B949E] mb-1.5">Nome da instância *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Atendimento Principal"
                  required
                  className="w-full h-10 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#161B22] px-3 text-sm text-[#E6EDF3] placeholder:text-[#484F58] focus:outline-none focus:border-[rgba(0,255,136,0.5)] focus:shadow-[0_0_0_3px_rgba(0,255,136,0.1)]"
                />
                <p className="text-[10px] text-[#484F58] mt-1">Deve ser igual ao nome da instância no UazAPI</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#8B949E] mb-1.5">URL base da API *</label>
                <input
                  type="url"
                  value={form.baseUrl}
                  onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                  placeholder="https://minha.uazapi.com"
                  required
                  className="w-full h-10 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#161B22] px-3 text-sm text-[#E6EDF3] placeholder:text-[#484F58] focus:outline-none focus:border-[rgba(0,255,136,0.5)] focus:shadow-[0_0_0_3px_rgba(0,255,136,0.1)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#8B949E] mb-1.5">Token de autenticação *</label>
                <input
                  type="text"
                  value={form.token}
                  onChange={(e) => setForm({ ...form, token: e.target.value })}
                  placeholder="seu-token-uazapi"
                  required
                  className="w-full h-10 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#161B22] px-3 text-sm text-[#E6EDF3] placeholder:text-[#484F58] focus:outline-none focus:border-[rgba(0,255,136,0.5)] focus:shadow-[0_0_0_3px_rgba(0,255,136,0.1)]"
                />
              </div>
              {formError && (
                <div className="rounded-lg border border-[#F85149]/20 bg-[#F85149]/10 p-3 text-sm text-[#F85149]">
                  {formError}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setFormError("") }}
                  className="flex-1 h-10 rounded-lg border border-[rgba(255,255,255,0.08)] text-sm text-[#8B949E] hover:bg-[#161B22] transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 h-10 rounded-lg bg-[#00FF88] text-sm font-semibold text-black hover:bg-[#00CC6A] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar Instância"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal QR Code */}
      {qrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0D1117] p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00FF88]/10 border border-[#00FF88]/20 mx-auto mb-3">
              <QrCode className="h-5 w-5 text-[#00FF88]" />
            </div>
            <h3 className="text-base font-semibold text-[#E6EDF3] mb-1">Escaneie o QR Code</h3>
            <p className="text-sm text-[#8B949E] mb-4">
              <strong className="text-[#E6EDF3]">{qrModal.instance.name}</strong>
            </p>

            {/* QR Code com borda animada */}
            <div className="qr-border inline-block mb-4">
              <div className="bg-white p-3 rounded-[9px]">
                {qrLoading ? (
                  <div className="h-48 w-48 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-[#00FF88]" />
                  </div>
                ) : (
                  <img
                    src={`data:image/png;base64,${qrModal.qr}`}
                    alt="QR Code WhatsApp"
                    className="h-48 w-48"
                  />
                )}
              </div>
            </div>

            <p className="text-xs text-[#8B949E] mb-3">
              WhatsApp → Menu ⋮ → Dispositivos conectados → Conectar um dispositivo
            </p>

            {/* Status polling */}
            <div className="flex items-center justify-center gap-2 text-xs text-[#00FF88] mb-4">
              <Loader2 className="h-3 w-3 animate-spin" />
              Aguardando conexão automaticamente...
            </div>

            <div className="flex gap-2">
              <button
                onClick={refreshQr}
                disabled={qrLoading}
                className="flex-1 h-9 rounded-lg border border-[rgba(255,255,255,0.08)] text-xs text-[#8B949E] hover:bg-[#161B22] hover:text-[#E6EDF3] disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Atualizar QR
              </button>
              <button
                onClick={() => {
                  setQrModal(null)
                  if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null }
                }}
                className="flex-1 h-9 rounded-lg border border-[rgba(255,255,255,0.08)] text-xs text-[#8B949E] hover:bg-[#161B22] hover:text-[#E6EDF3] transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {instances.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] mb-4">
            <Smartphone className="h-8 w-8 text-[#484F58]" />
          </div>
          <h3 className="text-base font-semibold text-[#E6EDF3] mb-1">Nenhuma instância criada</h3>
          <p className="text-sm text-[#8B949E] mb-6 max-w-sm">
            Crie sua primeira instância WhatsApp para começar a automatizar seu atendimento com IA.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-lg bg-[#00FF88] px-4 py-2 text-sm font-semibold text-black hover:bg-[#00CC6A] transition-all"
          >
            <Plus className="h-4 w-4" />
            Criar primeira instância
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {instances.map((instance) => {
            const sc = statusConfig[instance.status as keyof typeof statusConfig] ?? statusConfig.disconnected
            return (
              <div
                key={instance.id}
                className="rounded-xl border bg-[rgba(13,17,23,0.8)] p-5 hover:shadow-[0_0_20px_rgba(0,0,0,0.3)] transition-all"
                style={{ borderColor: sc.border }}
              >
                {/* Header do card */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold"
                      style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
                    >
                      {instance.profile_picture_url ? (
                        <img src={instance.profile_picture_url} className="h-12 w-12 rounded-full object-cover" alt="" />
                      ) : (
                        instance.name[0]?.toUpperCase() ?? "?"
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#E6EDF3] leading-tight">{instance.name}</p>
                      <p className="text-xs text-[#8B949E] mt-0.5">
                        {instance.phone_number ?? "Sem número conectado"}
                      </p>
                    </div>
                  </div>

                  {/* Status badge */}
                  <div
                    className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
                    style={{ background: sc.bg, border: `1px solid ${sc.border}` }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full status-pulse" style={{ background: sc.color }} />
                    <span className="text-xs font-medium" style={{ color: sc.color }}>{sc.label}</span>
                  </div>
                </div>

                {/* Webhook URL */}
                {instance.webhook_url && (
                  <div className="mb-4 rounded-lg bg-[#161B22] border border-[rgba(255,255,255,0.06)] p-2.5 flex items-center gap-2">
                    <Zap className="h-3 w-3 text-[#00FF88] shrink-0" />
                    <span className="text-[10px] text-[#484F58] font-mono flex-1 truncate">
                      Webhook ativo
                    </span>
                    <button
                      onClick={() => copyText(instance.webhook_url!, instance.id + "_wh")}
                      className="shrink-0 text-[#8B949E] hover:text-[#E6EDF3] transition-colors"
                    >
                      {copiedId === instance.id + "_wh"
                        ? <Check className="h-3 w-3 text-[#00FF88]" />
                        : <Copy className="h-3 w-3" />
                      }
                    </button>
                  </div>
                )}

                {/* Ações */}
                <div className="flex flex-wrap gap-2">
                  {instance.status !== "connected" ? (
                    <button
                      onClick={() => handleConnect(instance)}
                      disabled={qrLoading}
                      className="flex items-center gap-1.5 rounded-lg bg-[#00FF88]/10 border border-[#00FF88]/20 px-3 py-1.5 text-xs font-medium text-[#00FF88] hover:bg-[#00FF88]/20 disabled:opacity-50 transition-all"
                    >
                      {qrLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <QrCode className="h-3.5 w-3.5" />}
                      Conectar
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDisconnect(instance)}
                      className="flex items-center gap-1.5 rounded-lg bg-[#F85149]/10 border border-[#F85149]/20 px-3 py-1.5 text-xs font-medium text-[#F85149] hover:bg-[#F85149]/20 transition-all"
                    >
                      <WifiOff className="h-3.5 w-3.5" />
                      Desconectar
                    </button>
                  )}

                  <button
                    onClick={() => handleRestart(instance)}
                    className="flex items-center gap-1.5 rounded-lg border border-[rgba(255,255,255,0.08)] px-3 py-1.5 text-xs font-medium text-[#8B949E] hover:bg-[#161B22] hover:text-[#E6EDF3] transition-all"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reiniciar
                  </button>

                  <button
                    onClick={() => handleSetWebhook(instance)}
                    className="flex items-center gap-1.5 rounded-lg border border-[rgba(255,255,255,0.08)] px-3 py-1.5 text-xs font-medium text-[#8B949E] hover:bg-[#161B22] hover:text-[#E6EDF3] transition-all"
                    title="Configurar webhook automático"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Webhook
                  </button>

                  <button
                    onClick={() => handleDelete(instance)}
                    className="flex items-center gap-1.5 rounded-lg border border-[#F85149]/20 px-3 py-1.5 text-xs font-medium text-[#F85149]/60 hover:bg-[#F85149]/10 hover:text-[#F85149] transition-all ml-auto"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
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
