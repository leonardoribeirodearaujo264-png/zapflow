"use client"

import { useState, useEffect, useCallback } from "react"
import { Calendar as CalendarIcon, Plus, Loader2, ExternalLink, Clock } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { formatDateTime } from "@/lib/utils"
import { cn } from "@/lib/utils"

export default function CalendarPage() {
  const [events, setEvents] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [isGoogleConnected, setIsGoogleConnected] = useState(false)
  const [showEventModal, setShowEventModal] = useState(false)
  const [creating, setCreating] = useState(false)

  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    startDateTime: "",
    endDateTime: "",
    attendeeEmail: "",
  })

  const supabase = createClient()

  const fetchData = useCallback(async (wsId: string) => {
    const [eventsRes, oauthRes] = await Promise.all([
      supabase.from("calendar_events").select("*").eq("workspace_id", wsId)
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true }),
      supabase.from("google_oauth_tokens").select("id").eq("workspace_id", wsId).single(),
    ])
    setEvents(eventsRes.data ?? [])
    setIsGoogleConnected(!!oauthRes.data)
  }, [supabase])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: ws } = await supabase.from("workspaces").select("id").eq("owner_id", user.id).single()
      if (ws) { setWorkspaceId(ws.id); await fetchData(ws.id) }
      setLoading(false)
    }
    init()
  }, [fetchData, supabase])

  const handleConnectGoogle = () => {
    window.location.href = `/api/auth/google?workspaceId=${workspaceId}`
  }

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      const res = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          title: eventForm.title,
          description: eventForm.description,
          startDateTime: eventForm.startDateTime,
          endDateTime: eventForm.endDateTime,
          attendees: eventForm.attendeeEmail ? [{ email: eventForm.attendeeEmail }] : [],
        }),
      })
      if (!res.ok) throw new Error("Erro ao criar evento")
      setShowEventModal(false)
      setEventForm({ title: "", description: "", startDateTime: "", endDateTime: "", attendeeEmail: "" })
      if (workspaceId) await fetchData(workspaceId)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro")
    } finally {
      setCreating(false)
    }
  }

  const getDayLabel = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    if (date.toDateString() === today.toDateString()) return "Hoje"
    if (date.toDateString() === tomorrow.toDateString()) return "Amanhã"
    return date.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#00FF88]" /></div>

  return (
    <div className="space-y-6 fade-in">
      {/* Google Connection Banner */}
      {!isGoogleConnected && (
        <div className="rounded-xl border border-[#58A6FF]/20 bg-[#58A6FF]/5 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CalendarIcon className="h-5 w-5 text-[#58A6FF]" />
            <div>
              <p className="text-sm font-medium text-[#E6EDF3]">Google Calendar não conectado</p>
              <p className="text-xs text-[#8B949E]">Conecte sua conta Google para sincronizar eventos automaticamente</p>
            </div>
          </div>
          <button
            onClick={handleConnectGoogle}
            className="flex items-center gap-2 rounded-lg bg-[#58A6FF] px-4 py-2 text-sm font-semibold text-black hover:bg-[#4488CC] transition-all"
          >
            <ExternalLink className="h-4 w-4" />
            Conectar Google
          </button>
        </div>
      )}

      {isGoogleConnected && (
        <div className="rounded-xl border border-[#3FB950]/20 bg-[#3FB950]/5 p-3 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#3FB950] status-pulse" />
          <span className="text-sm text-[#3FB950]">Google Calendar conectado</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-[#8B949E]">
          {events.length} evento{events.length !== 1 ? "s" : ""} próximos
        </p>
        <button
          onClick={() => setShowEventModal(true)}
          className="flex items-center gap-2 rounded-lg bg-[#00FF88] px-4 py-2 text-sm font-semibold text-black hover:bg-[#00CC6A] hover:shadow-[0_0_20px_rgba(0,255,136,0.3)] transition-all"
        >
          <Plus className="h-4 w-4" />
          Novo Evento
        </button>
      </div>

      {/* Create Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0D1117] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
            <h3 className="text-lg font-semibold text-[#E6EDF3] mb-4">Novo Evento</h3>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#8B949E] mb-1.5">Título *</label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  placeholder="Ex: Reunião com cliente"
                  required
                  className="w-full h-10 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#161B22] px-3 text-sm text-[#E6EDF3] placeholder:text-[#484F58] focus:outline-none focus:border-[rgba(0,255,136,0.5)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#8B949E] mb-1.5">Descrição</label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  placeholder="Detalhes do evento..."
                  rows={3}
                  className="w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#161B22] px-3 py-2 text-sm text-[#E6EDF3] placeholder:text-[#484F58] focus:outline-none focus:border-[rgba(0,255,136,0.5)] resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#8B949E] mb-1.5">Início *</label>
                  <input
                    type="datetime-local"
                    value={eventForm.startDateTime}
                    onChange={(e) => setEventForm({ ...eventForm, startDateTime: e.target.value })}
                    required
                    className="w-full h-10 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#161B22] px-3 text-sm text-[#E6EDF3] focus:outline-none focus:border-[rgba(0,255,136,0.5)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#8B949E] mb-1.5">Fim *</label>
                  <input
                    type="datetime-local"
                    value={eventForm.endDateTime}
                    onChange={(e) => setEventForm({ ...eventForm, endDateTime: e.target.value })}
                    required
                    className="w-full h-10 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#161B22] px-3 text-sm text-[#E6EDF3] focus:outline-none focus:border-[rgba(0,255,136,0.5)]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#8B949E] mb-1.5">Email do convidado</label>
                <input
                  type="email"
                  value={eventForm.attendeeEmail}
                  onChange={(e) => setEventForm({ ...eventForm, attendeeEmail: e.target.value })}
                  placeholder="convidado@email.com"
                  className="w-full h-10 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#161B22] px-3 text-sm text-[#E6EDF3] placeholder:text-[#484F58] focus:outline-none focus:border-[rgba(0,255,136,0.5)]"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowEventModal(false)} className="flex-1 h-10 rounded-lg border border-[rgba(255,255,255,0.08)] text-sm text-[#8B949E] hover:bg-[#161B22] transition-all">Cancelar</button>
                <button type="submit" disabled={creating} className="flex-1 h-10 rounded-lg bg-[#00FF88] text-sm font-semibold text-black hover:bg-[#00CC6A] disabled:opacity-50 transition-all flex items-center justify-center">
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar Evento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Events List */}
      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <CalendarIcon className="h-10 w-10 text-[#484F58] mb-3" />
          <p className="text-base font-semibold text-[#E6EDF3] mb-1">Nenhum evento próximo</p>
          <p className="text-sm text-[#8B949E]">Crie um evento ou conecte o Google Calendar</p>
        </div>
      ) : (
        <div className="space-y-6">
          {events.map((event, i) => {
            const prev = events[i - 1]
            const showDayHeader =
              !prev ||
              new Date(event.start_time as string).toDateString() !==
                new Date(prev.start_time as string).toDateString()
            return (
              <div key={event.id as string}>
                {showDayHeader && (
                  <p className="text-xs font-semibold text-[#00FF88] uppercase tracking-wider mb-2">
                    {getDayLabel(event.start_time as string)}
                  </p>
                )}
                <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(13,17,23,0.8)] p-4 flex items-start gap-4 hover:border-[rgba(255,255,255,0.12)] transition-all">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#58A6FF]/10 border border-[#58A6FF]/20">
                    <CalendarIcon className="h-5 w-5 text-[#58A6FF]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#E6EDF3]">{event.title as string}</p>
                    {(event.description as string | null | undefined) && (
                      <p className="text-xs text-[#8B949E] mt-0.5 line-clamp-2">{String(event.description)}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-2">
                      <Clock className="h-3 w-3 text-[#484F58]" />
                      <span className="text-xs text-[#8B949E]">
                        {formatDateTime(event.start_time as string)} → {formatDateTime(event.end_time as string)}
                      </span>
                    </div>
                    {Boolean((event as Record<string, unknown>).conversation_id) && (
                      <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#00FF88]/10 border border-[#00FF88]/20 px-2 py-0.5 text-[10px] text-[#00FF88]">
                        Criado por IA
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
