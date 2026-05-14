export type AIProvider = "gemini" | "openai" | "claude"

export interface AIMessage {
  role: "user" | "assistant" | "system"
  content: string
}

export interface AIConfig {
  provider: AIProvider
  model: string
  systemPrompt: string
  temperature?: number
  maxTokens?: number
  streaming?: boolean
}

export interface WebhookEvent {
  instance: string
  event:
    | "messages.upsert"
    | "messages.update"
    | "connection.update"
    | "qrcode.updated"
    | "send.message"
    | "contacts.upsert"
  data: {
    key: { remoteJid: string; fromMe: boolean; id: string }
    message?: { conversation?: string; extendedTextMessage?: { text: string } }
    messageType?: string
    pushName?: string
    qrcode?: { base64?: string }
    instance?: { state?: string }
  }
}

export interface Instance {
  id: string
  workspace_id: string
  name: string
  token: string
  base_url: string
  status: "connected" | "disconnected" | "connecting"
  phone_number?: string
  profile_name?: string
  profile_picture_url?: string
  webhook_url?: string
  created_at: string
}

export interface Agent {
  id: string
  workspace_id: string
  instance_id?: string
  name: string
  description?: string
  system_prompt: string
  provider: AIProvider
  model: string
  temperature: number
  max_tokens: number
  is_active: boolean
  trigger_keywords?: string[]
  trigger_all_messages: boolean
  asaas_enabled: boolean
  calendar_enabled: boolean
  memory_enabled: boolean
  memory_window: number
  created_at: string
}

export interface Conversation {
  id: string
  instance_id: string
  contact_phone: string
  contact_name?: string
  agent_id?: string
  status: "open" | "closed" | "waiting_human"
  last_message_at?: string
  created_at: string
}

export interface Message {
  id: string
  conversation_id: string
  whatsapp_id?: string
  direction: "inbound" | "outbound"
  content: string
  message_type: string
  media_url?: string
  is_ai_response: boolean
  provider?: string
  model?: string
  tokens_used?: number
  created_at: string
}

export interface AsaasCustomer {
  id: string
  workspace_id: string
  asaas_id: string
  name: string
  email?: string
  phone?: string
  cpf_cnpj?: string
  created_at: string
}

export interface AsaasPayment {
  id: string
  workspace_id: string
  customer_id?: string
  asaas_id: string
  billing_type: "PIX" | "BOLETO" | "CREDIT_CARD" | "DEBIT_CARD" | "UNDEFINED"
  value: number
  due_date: string
  status: "PENDING" | "RECEIVED" | "CONFIRMED" | "OVERDUE" | "REFUNDED"
  description?: string
  invoice_url?: string
  pix_qr_code?: string
  conversation_id?: string
  created_at: string
}

export interface CalendarEvent {
  id: string
  workspace_id: string
  google_event_id: string
  calendar_id: string
  title: string
  description?: string
  start_time: string
  end_time: string
  attendees?: { email: string }[]
  conversation_id?: string
  created_at: string
}

export interface Workspace {
  id: string
  name: string
  owner_id: string
  plan: "free" | "pro" | "enterprise"
  created_at: string
}

export const AI_MODELS: Record<AIProvider, { id: string; name: string }[]> = {
  gemini: [
    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
    { id: "gemini-2.0-flash-thinking-exp", name: "Gemini 2.0 Flash Thinking" },
    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
  ],
  openai: [
    { id: "gpt-4o", name: "GPT-4o" },
    { id: "gpt-4o-mini", name: "GPT-4o Mini" },
    { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
  ],
  claude: [
    { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5" },
    { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5" },
    { id: "claude-opus-4-5", name: "Claude Opus 4.5" },
  ],
}
