"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  MessageSquare, Search, Send, Bot, User, Loader2,
  Phone, Clock, ChevronRight, Circle,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn, formatDateTime, formatPhone, getInitials } from "@/lib/utils"

interface Conversation {
  id: string
  contact_phone: string
  contact_name?: string
  status: string
  last_message_at?: string
  instance_id: string
  instances?: { name: string }
  agents?: { name: string; provider: string }
}

interface Message {
  id: string
  direction: "inbound" | "outbound"
  content: string
  is_ai_response: boolean
  provider?: string
  created_at: string
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [replyText, setReplyText] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  const supabase = createClient()

  const fetchConversations = useCallback(async (_wsId: string) => {
    // RLS already filters conversations to the user's own workspace via instance ownership
    const { data } = await supabase
      .from("conversations")
      .select("*, instances(name), agents(name, provider)")
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(50)
    setConversations((data as Conversation[]) ?? [])
  }, [supabase])

  const fetchMessages = useCallback(async (convId: string) => {
    setMessagesLoading(true)
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true })
      .limit(100)
    setMessages((data as Message[]) ?? [])
    setMessagesLoading(false)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
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
          await fetchConversations(ws.id)
        }
      } catch (err) {
        console.error("Conversations init error:", err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [fetchConversations, supabase])

  // Realtime subscription for new messages
  useEffect(() => {
    if (!selectedConv) return
    const channel = supabase
      .channel(`messages:${selectedConv.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${selectedConv.id}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message])
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selectedConv, supabase])

  const handleSelectConversation = async (conv: Conversation) => {
    setSelectedConv(conv)
    await fetchMessages(conv.id)
  }

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedConv || sending) return
    setSending(true)
    try {
      // Save outbound message to DB
      const { data: msg } = await supabase.from("messages").insert({
        conversation_id: selectedConv.id,
        direction: "outbound",
        content: replyText,
        message_type: "text",
        is_ai_response: false,
      }).select().single()

      if (msg) setMessages((prev) => [...prev, msg as Message])

      // Send via API
      await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: selectedConv.id,
          text: replyText,
        }),
      })

      setReplyText("")
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
    } finally {
      setSending(false)
    }
  }

  const filtered = conversations.filter((c) => {
    const q = search.toLowerCase()
    return (
      c.contact_phone.includes(q) ||
      (c.contact_name?.toLowerCase().includes(q) ?? false)
    )
  })

  const providerColors: Record<string, string> = {
    gemini: "#4285F4",
    openai: "#10A37F",
    claude: "#D4761A",
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#00FF88]" />
      </div>
    )
  }

  return (
    <div className="flex flex-1 min-h-0 rounded-xl border border-[rgba(255,255,255,0.08)] overflow-hidden fade-in">
      {/* Sidebar - Lista de Conversas */}
      <div className="w-80 shrink-0 flex flex-col border-r border-[rgba(255,255,255,0.06)] bg-[rgba(13,17,23,0.8)]">
        {/* Search */}
        <div className="p-4 border-b border-[rgba(255,255,255,0.06)]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#484F58]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar conversas..."
              className="w-full h-9 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#161B22] pl-9 pr-3 text-sm text-[#E6EDF3] placeholder:text-[#484F58] focus:outline-none focus:border-[rgba(0,255,136,0.3)]"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <MessageSquare className="h-8 w-8 text-[#484F58] mb-2" />
              <p className="text-sm text-[#8B949E]">Nenhuma conversa ainda</p>
              <p className="text-xs text-[#484F58] mt-1">As conversas aparecerão aqui quando clientes enviarem mensagens</p>
            </div>
          ) : (
            filtered.map((conv) => {
              const isActive = selectedConv?.id === conv.id
              const name = conv.contact_name ?? formatPhone(conv.contact_phone)
              const initials = getInitials(name)

              return (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv)}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3 text-left transition-all border-b border-[rgba(255,255,255,0.04)]",
                    isActive
                      ? "bg-[rgba(0,255,136,0.08)] border-l-2 border-l-[#00FF88] pl-[14px]"
                      : "hover:bg-[#161B22]/60"
                  )}
                >
                  {/* Avatar */}
                  <div className={cn(
                    "h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-sm font-bold",
                    isActive
                      ? "bg-[#00FF88]/20 text-[#00FF88] border border-[#00FF88]/30"
                      : "bg-[#161B22] text-[#8B949E] border border-[rgba(255,255,255,0.08)]"
                  )}>
                    {initials}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={cn("text-sm font-medium truncate", isActive ? "text-[#00FF88]" : "text-[#E6EDF3]")}>
                        {name}
                      </p>
                      {conv.last_message_at && (
                        <span className="text-[10px] text-[#484F58] shrink-0 ml-1">
                          {new Date(conv.last_message_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Phone className="h-3 w-3 text-[#484F58]" />
                      <p className="text-xs text-[#484F58] truncate">{formatPhone(conv.contact_phone)}</p>
                    </div>
                    {conv.instances?.name && (
                      <p className="text-[10px] text-[#484F58] mt-0.5 truncate">
                        via {conv.instances.name}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0">
                    {conv.status === "open" ? (
                      <Circle className="h-2 w-2 fill-[#3FB950] text-[#3FB950]" />
                    ) : (
                      <Circle className="h-2 w-2 fill-[#484F58] text-[#484F58]" />
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Chat Area */}
      {!selectedConv ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#080B0F] text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] mb-4">
            <MessageSquare className="h-8 w-8 text-[#484F58]" />
          </div>
          <p className="text-base font-semibold text-[#8B949E]">Selecione uma conversa</p>
          <p className="text-sm text-[#484F58] mt-1">Escolha uma conversa na lista para visualizar as mensagens</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col bg-[#080B0F]">
          {/* Chat Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(13,17,23,0.8)]">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[#00FF88]/10 border border-[#00FF88]/20 flex items-center justify-center text-sm font-bold text-[#00FF88]">
                {getInitials(selectedConv.contact_name ?? formatPhone(selectedConv.contact_phone))}
              </div>
              <div>
                <p className="text-sm font-semibold text-[#E6EDF3]">
                  {selectedConv.contact_name ?? formatPhone(selectedConv.contact_phone)}
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-[#484F58]">{formatPhone(selectedConv.contact_phone)}</p>
                  {selectedConv.instances?.name && (
                    <>
                      <span className="text-[#484F58]">·</span>
                      <p className="text-xs text-[#484F58]">{selectedConv.instances.name}</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {selectedConv.agents && (
                <div
                  className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                  style={{
                    background: `${providerColors[selectedConv.agents.provider] ?? "#8B949E"}15`,
                    color: providerColors[selectedConv.agents.provider] ?? "#8B949E",
                    border: `1px solid ${providerColors[selectedConv.agents.provider] ?? "#8B949E"}30`,
                  }}
                >
                  <Bot className="h-3 w-3" />
                  {selectedConv.agents.name}
                </div>
              )}
              <div className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                selectedConv.status === "open"
                  ? "bg-[#3FB950]/10 text-[#3FB950] border border-[#3FB950]/20"
                  : "bg-[#484F58]/10 text-[#484F58] border border-[#484F58]/20"
              )}>
                <Circle className="h-1.5 w-1.5 fill-current" />
                {selectedConv.status === "open" ? "Aberta" : "Encerrada"}
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {messagesLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-[#00FF88]" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-[#484F58]">Nenhuma mensagem</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex items-end gap-2",
                    msg.direction === "outbound" ? "justify-end" : "justify-start"
                  )}
                >
                  {msg.direction === "inbound" && (
                    <div className="h-7 w-7 shrink-0 rounded-full bg-[#161B22] border border-[rgba(255,255,255,0.08)] flex items-center justify-center">
                      <User className="h-3.5 w-3.5 text-[#8B949E]" />
                    </div>
                  )}

                  <div className={cn(
                    "max-w-[70%] rounded-2xl px-4 py-2.5",
                    msg.direction === "outbound"
                      ? msg.is_ai_response
                        ? "bg-[#00FF88]/90 text-black rounded-br-sm"
                        : "bg-[#1C2128] text-[#E6EDF3] border border-[rgba(255,255,255,0.08)] rounded-br-sm"
                      : "bg-[#161B22] text-[#E6EDF3] border border-[rgba(255,255,255,0.06)] rounded-bl-sm"
                  )}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    <div className={cn(
                      "flex items-center gap-1.5 mt-1",
                      msg.direction === "outbound" && msg.is_ai_response ? "justify-end" : "justify-between"
                    )}>
                      {msg.is_ai_response && (
                        <div className="flex items-center gap-1">
                          <Bot className="h-2.5 w-2.5 opacity-60" />
                          <span className="text-[10px] opacity-60">{msg.provider ?? "IA"}</span>
                        </div>
                      )}
                      <span className={cn(
                        "text-[10px] opacity-60",
                        msg.direction === "outbound" && msg.is_ai_response ? "" : "ml-auto"
                      )}>
                        {new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>

                  {msg.direction === "outbound" && (
                    <div className={cn(
                      "h-7 w-7 shrink-0 rounded-full flex items-center justify-center",
                      msg.is_ai_response
                        ? "bg-[#00FF88]/20 border border-[#00FF88]/30"
                        : "bg-[#161B22] border border-[rgba(255,255,255,0.08)]"
                    )}>
                      {msg.is_ai_response
                        ? <Bot className="h-3.5 w-3.5 text-[#00FF88]" />
                        : <User className="h-3.5 w-3.5 text-[#8B949E]" />
                      }
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Reply Input */}
          <div className="px-6 py-4 border-t border-[rgba(255,255,255,0.06)] bg-[rgba(13,17,23,0.8)]">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSendReply()
                    }
                  }}
                  placeholder="Digite uma mensagem... (Enter para enviar)"
                  rows={1}
                  className="w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#161B22] px-4 py-2.5 text-sm text-[#E6EDF3] placeholder:text-[#484F58] focus:outline-none focus:border-[rgba(0,255,136,0.3)] resize-none"
                  style={{ minHeight: "42px", maxHeight: "120px" }}
                />
              </div>
              <button
                onClick={handleSendReply}
                disabled={sending || !replyText.trim()}
                className="h-[42px] w-[42px] shrink-0 rounded-xl bg-[#00FF88] text-black flex items-center justify-center hover:bg-[#00CC6A] hover:shadow-[0_0_15px_rgba(0,255,136,0.3)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[10px] text-[#484F58] mt-2 text-center">
              Mensagens manuais não ativam o agente de IA
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
