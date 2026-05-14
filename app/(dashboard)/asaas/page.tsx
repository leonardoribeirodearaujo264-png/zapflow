"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, DollarSign, Users, FileText, Loader2, CreditCard, RefreshCw } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency, formatDate } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/toast"

type AsaasTab = "dashboard" | "customers" | "payments" | "settings"

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: "Pendente", color: "#D29922", bg: "rgba(210,153,34,0.1)" },
  RECEIVED: { label: "Recebido", color: "#3FB950", bg: "rgba(63,185,80,0.1)" },
  CONFIRMED: { label: "Confirmado", color: "#3FB950", bg: "rgba(63,185,80,0.1)" },
  OVERDUE: { label: "Vencido", color: "#F85149", bg: "rgba(248,81,73,0.1)" },
  REFUNDED: { label: "Estornado", color: "#8B949E", bg: "rgba(139,148,158,0.1)" },
}

export default function AsaasPage() {
  const [tab, setTab] = useState<AsaasTab>("dashboard")
  const [customers, setCustomers] = useState<Record<string, unknown>[]>([])
  const [payments, setPayments] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [asaasSettings, setAsaasSettings] = useState<Record<string, unknown> | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [creating, setCreating] = useState(false)

  const [settingsForm, setSettingsForm] = useState({ apiKey: "", sandboxMode: false })
  const [savingSettings, setSavingSettings] = useState(false)

  const [customerForm, setCustomerForm] = useState({ name: "", email: "", phone: "", cpfCnpj: "" })
  const [paymentForm, setPaymentForm] = useState({
    customerId: "", billingType: "PIX", value: "", dueDate: "", description: "",
  })

  const supabase = createClient()
  const { toast } = useToast()

  const fetchData = useCallback(async (wsId: string) => {
    const [customersRes, paymentsRes, settingsRes] = await Promise.all([
      supabase.from("asaas_customers").select("*").eq("workspace_id", wsId).order("created_at", { ascending: false }),
      supabase.from("asaas_payments").select("*").eq("workspace_id", wsId).order("created_at", { ascending: false }),
      supabase.from("asaas_settings").select("*").eq("workspace_id", wsId).single(),
    ])
    setCustomers(customersRes.data ?? [])
    setPayments(paymentsRes.data ?? [])
    if (settingsRes.data) {
      setAsaasSettings(settingsRes.data)
      setSettingsForm({ apiKey: settingsRes.data.api_key as string ?? "", sandboxMode: settingsRes.data.sandbox_mode as boolean ?? false })
    }
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
        console.error("Asaas init error:", err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [fetchData, supabase])

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingSettings(true)
    try {
      if (asaasSettings) {
        await supabase.from("asaas_settings").update({
          api_key: settingsForm.apiKey, sandbox_mode: settingsForm.sandboxMode,
        }).eq("id", (asaasSettings as Record<string, string>).id)
      } else {
        await supabase.from("asaas_settings").insert({
          workspace_id: workspaceId, api_key: settingsForm.apiKey, sandbox_mode: settingsForm.sandboxMode,
        })
      }
      if (workspaceId) await fetchData(workspaceId)
      toast("Configurações do Asaas salvas!")
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao salvar configurações", "error")
    } finally {
      setSavingSettings(false)
    }
  }

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!asaasSettings) { toast("Configure sua API Asaas primeiro nas Configurações", "warning"); return }
    setCreating(true)
    try {
      const res = await fetch("/api/asaas/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, ...customerForm }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Erro ao criar cliente")
      setShowCustomerModal(false)
      setCustomerForm({ name: "", email: "", phone: "", cpfCnpj: "" })
      if (workspaceId) await fetchData(workspaceId)
      toast("Cliente criado com sucesso!")
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao criar cliente", "error")
    } finally {
      setCreating(false)
    }
  }

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!asaasSettings) { toast("Configure sua API Asaas primeiro nas Configurações", "warning"); return }
    setCreating(true)
    try {
      const res = await fetch("/api/asaas/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, ...paymentForm, value: parseFloat(paymentForm.value) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Erro ao criar cobrança")
      setShowPaymentModal(false)
      setPaymentForm({ customerId: "", billingType: "PIX", value: "", dueDate: "", description: "" })
      if (workspaceId) await fetchData(workspaceId)
      toast("Cobrança criada com sucesso!")
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao criar cobrança", "error")
    } finally {
      setCreating(false)
    }
  }

  const totalReceived = payments
    .filter((p) => (p.status as string) === "RECEIVED" || (p.status as string) === "CONFIRMED")
    .reduce((sum, p) => sum + ((p.value as number) ?? 0), 0)
  const totalPending = payments.filter((p) => (p.status as string) === "PENDING").reduce((sum, p) => sum + ((p.value as number) ?? 0), 0)
  const totalOverdue = payments.filter((p) => (p.status as string) === "OVERDUE").length

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#00FF88]" /></div>

  return (
    <div className="space-y-6 fade-in">
      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-[#161B22] p-1 border border-[rgba(255,255,255,0.06)] w-fit">
        {([
          { id: "dashboard", label: "Dashboard", icon: DollarSign },
          { id: "customers", label: "Clientes", icon: Users },
          { id: "payments", label: "Cobranças", icon: FileText },
          { id: "settings", label: "Configurações", icon: CreditCard },
        ] as const).map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                tab === t.id ? "bg-[#0D1117] text-[#00FF88]" : "text-[#8B949E] hover:text-[#E6EDF3]"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Dashboard Tab */}
      {tab === "dashboard" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { label: "Recebido", value: formatCurrency(totalReceived), color: "#3FB950", bg: "rgba(63,185,80,0.1)" },
              { label: "Pendente", value: formatCurrency(totalPending), color: "#D29922", bg: "rgba(210,153,34,0.1)" },
              { label: "Vencidos", value: `${totalOverdue} cobranças`, color: "#F85149", bg: "rgba(248,81,73,0.1)" },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-xl border p-5" style={{ borderColor: `${kpi.color}30`, background: kpi.bg }}>
                <p className="text-xs font-medium text-[#8B949E] mb-1">{kpi.label}</p>
                <p className="text-2xl font-bold" style={{ color: kpi.color, fontFamily: "'Sora', sans-serif" }}>{kpi.value}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(13,17,23,0.8)] p-5">
            <h3 className="text-sm font-semibold text-[#E6EDF3] mb-4">Cobranças Recentes</h3>
            {payments.length === 0 ? (
              <p className="text-sm text-[#8B949E] text-center py-8">Nenhuma cobrança criada</p>
            ) : (
              <div className="space-y-2">
                {payments.slice(0, 10).map((p) => {
                  const sc = STATUS_CONFIG[(p.status as string)] ?? STATUS_CONFIG.PENDING
                  return (
                    <div key={p.id as string} className="flex items-center justify-between rounded-lg p-3 bg-[#161B22] border border-[rgba(255,255,255,0.06)]">
                      <div>
                        <p className="text-sm font-medium text-[#E6EDF3]">{(p.description as string) ?? "Sem descrição"}</p>
                        <p className="text-xs text-[#8B949E]">Vence: {formatDate(p.due_date as string)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-[#E6EDF3]">{formatCurrency(p.value as number)}</p>
                        <span className="text-xs font-medium rounded-full px-2 py-0.5" style={{ color: sc.color, background: sc.bg }}>
                          {sc.label}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Customers Tab */}
      {tab === "customers" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-[#8B949E]">{customers.length} cliente{customers.length !== 1 ? "s" : ""}</p>
            <button onClick={() => setShowCustomerModal(true)} className="flex items-center gap-2 rounded-lg bg-[#00FF88] px-4 py-2 text-sm font-semibold text-black hover:bg-[#00CC6A] transition-all">
              <Plus className="h-4 w-4" />
              Novo Cliente
            </button>
          </div>
          {showCustomerModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0D1117] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
                <h3 className="text-lg font-semibold text-[#E6EDF3] mb-4">Novo Cliente</h3>
                <form onSubmit={handleCreateCustomer} className="space-y-4">
                  {[
                    { key: "name", label: "Nome *", type: "text", placeholder: "João Silva", required: true },
                    { key: "email", label: "Email", type: "email", placeholder: "joao@email.com", required: false },
                    { key: "phone", label: "Telefone", type: "text", placeholder: "11999999999", required: false },
                    { key: "cpfCnpj", label: "CPF/CNPJ", type: "text", placeholder: "000.000.000-00", required: false },
                  ].map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-[#8B949E] mb-1.5">{field.label}</label>
                      <input
                        type={field.type}
                        value={customerForm[field.key as keyof typeof customerForm]}
                        onChange={(e) => setCustomerForm({ ...customerForm, [field.key]: e.target.value })}
                        placeholder={field.placeholder}
                        required={field.required}
                        className="w-full h-10 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#161B22] px-3 text-sm text-[#E6EDF3] placeholder:text-[#484F58] focus:outline-none focus:border-[rgba(0,255,136,0.5)]"
                      />
                    </div>
                  ))}
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowCustomerModal(false)} className="flex-1 h-10 rounded-lg border border-[rgba(255,255,255,0.08)] text-sm text-[#8B949E] hover:bg-[#161B22] transition-all">Cancelar</button>
                    <button type="submit" disabled={creating} className="flex-1 h-10 rounded-lg bg-[#00FF88] text-sm font-semibold text-black hover:bg-[#00CC6A] disabled:opacity-50 transition-all flex items-center justify-center">
                      {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar Cliente"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          {customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Users className="h-10 w-10 text-[#484F58] mb-3" />
              <p className="text-sm text-[#8B949E]">Nenhum cliente cadastrado</p>
            </div>
          ) : (
            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(13,17,23,0.8)] overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-[rgba(255,255,255,0.06)]">
                  <tr>
                    {["Nome", "Email", "Telefone", "CPF/CNPJ"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[#8B949E]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id as string} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[#161B22]/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-[#E6EDF3]">{c.name as string}</td>
                      <td className="px-4 py-3 text-[#8B949E]">{(c.email as string) ?? "—"}</td>
                      <td className="px-4 py-3 text-[#8B949E]">{(c.phone as string) ?? "—"}</td>
                      <td className="px-4 py-3 text-[#8B949E]">{(c.cpf_cnpj as string) ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Payments Tab */}
      {tab === "payments" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-[#8B949E]">{payments.length} cobrança{payments.length !== 1 ? "s" : ""}</p>
            <button onClick={() => setShowPaymentModal(true)} className="flex items-center gap-2 rounded-lg bg-[#00FF88] px-4 py-2 text-sm font-semibold text-black hover:bg-[#00CC6A] transition-all">
              <Plus className="h-4 w-4" />
              Nova Cobrança
            </button>
          </div>
          {showPaymentModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0D1117] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
                <h3 className="text-lg font-semibold text-[#E6EDF3] mb-4">Nova Cobrança</h3>
                <form onSubmit={handleCreatePayment} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#8B949E] mb-1.5">Cliente *</label>
                    <select
                      value={paymentForm.customerId}
                      onChange={(e) => setPaymentForm({ ...paymentForm, customerId: e.target.value })}
                      required
                      className="w-full h-10 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#161B22] px-3 text-sm text-[#E6EDF3] focus:outline-none focus:border-[rgba(0,255,136,0.5)]"
                    >
                      <option value="">Selecione um cliente</option>
                      {customers.map((c) => <option key={c.id as string} value={c.asaas_id as string}>{c.name as string}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#8B949E] mb-1.5">Tipo de pagamento</label>
                    <select
                      value={paymentForm.billingType}
                      onChange={(e) => setPaymentForm({ ...paymentForm, billingType: e.target.value })}
                      className="w-full h-10 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#161B22] px-3 text-sm text-[#E6EDF3] focus:outline-none focus:border-[rgba(0,255,136,0.5)]"
                    >
                      <option value="PIX">PIX</option>
                      <option value="BOLETO">Boleto</option>
                      <option value="CREDIT_CARD">Cartão de Crédito</option>
                      <option value="UNDEFINED">Indefinido</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-[#8B949E] mb-1.5">Valor (R$) *</label>
                      <input
                        type="number" step="0.01" min="1"
                        value={paymentForm.value}
                        onChange={(e) => setPaymentForm({ ...paymentForm, value: e.target.value })}
                        placeholder="99.90"
                        required
                        className="w-full h-10 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#161B22] px-3 text-sm text-[#E6EDF3] placeholder:text-[#484F58] focus:outline-none focus:border-[rgba(0,255,136,0.5)]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#8B949E] mb-1.5">Vencimento *</label>
                      <input
                        type="date"
                        value={paymentForm.dueDate}
                        onChange={(e) => setPaymentForm({ ...paymentForm, dueDate: e.target.value })}
                        required
                        className="w-full h-10 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#161B22] px-3 text-sm text-[#E6EDF3] focus:outline-none focus:border-[rgba(0,255,136,0.5)]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#8B949E] mb-1.5">Descrição</label>
                    <input
                      type="text"
                      value={paymentForm.description}
                      onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })}
                      placeholder="Ex: Mensalidade Plano Pro"
                      className="w-full h-10 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#161B22] px-3 text-sm text-[#E6EDF3] placeholder:text-[#484F58] focus:outline-none focus:border-[rgba(0,255,136,0.5)]"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowPaymentModal(false)} className="flex-1 h-10 rounded-lg border border-[rgba(255,255,255,0.08)] text-sm text-[#8B949E] hover:bg-[#161B22] transition-all">Cancelar</button>
                    <button type="submit" disabled={creating} className="flex-1 h-10 rounded-lg bg-[#00FF88] text-sm font-semibold text-black hover:bg-[#00CC6A] disabled:opacity-50 transition-all flex items-center justify-center">
                      {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar Cobrança"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          {payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <FileText className="h-10 w-10 text-[#484F58] mb-3" />
              <p className="text-sm text-[#8B949E]">Nenhuma cobrança criada</p>
            </div>
          ) : (
            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(13,17,23,0.8)] overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-[rgba(255,255,255,0.06)]">
                  <tr>
                    {["Descrição", "Tipo", "Valor", "Vencimento", "Status"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[#8B949E]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => {
                    const sc = STATUS_CONFIG[(p.status as string)] ?? STATUS_CONFIG.PENDING
                    return (
                      <tr key={p.id as string} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[#161B22]/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-[#E6EDF3]">{(p.description as string) ?? "—"}</td>
                        <td className="px-4 py-3 text-[#8B949E]">{p.billing_type as string}</td>
                        <td className="px-4 py-3 text-[#E6EDF3] font-semibold">{formatCurrency(p.value as number)}</td>
                        <td className="px-4 py-3 text-[#8B949E]">{formatDate(p.due_date as string)}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ color: sc.color, background: sc.bg }}>
                            {sc.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {tab === "settings" && (
        <div className="max-w-lg">
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(13,17,23,0.8)] p-6">
            <h3 className="text-base font-semibold text-[#E6EDF3] mb-1">Configurações Asaas</h3>
            <p className="text-sm text-[#8B949E] mb-6">Conecte sua conta Asaas para criar cobranças e receber pagamentos.</p>
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#8B949E] mb-1.5">API Key Asaas *</label>
                <input
                  type="password"
                  value={settingsForm.apiKey}
                  onChange={(e) => setSettingsForm({ ...settingsForm, apiKey: e.target.value })}
                  placeholder="$aact_..."
                  required
                  className="w-full h-10 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#161B22] px-3 text-sm text-[#E6EDF3] placeholder:text-[#484F58] focus:outline-none focus:border-[rgba(0,255,136,0.5)]"
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#161B22] border border-[rgba(255,255,255,0.06)]">
                <div>
                  <p className="text-sm font-medium text-[#E6EDF3]">Modo Sandbox</p>
                  <p className="text-xs text-[#8B949E]">Use o ambiente de testes (sandbox.asaas.com)</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSettingsForm({ ...settingsForm, sandboxMode: !settingsForm.sandboxMode })}
                  className={cn(
                    "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                    settingsForm.sandboxMode ? "bg-[#00FF88]" : "bg-[#484F58]"
                  )}
                >
                  <span className={cn("inline-block h-4 w-4 rounded-full bg-white transition-transform", settingsForm.sandboxMode ? "translate-x-4" : "translate-x-0.5")} />
                </button>
              </div>
              <button type="submit" disabled={savingSettings} className="w-full h-10 rounded-lg bg-[#00FF88] text-sm font-semibold text-black hover:bg-[#00CC6A] disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar configurações"}
              </button>
            </form>
            {asaasSettings && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-[#00FF88]/10 border border-[#00FF88]/20 p-3">
                <RefreshCw className="h-4 w-4 text-[#00FF88]" />
                <span className="text-sm text-[#00FF88]">Asaas conectado</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
