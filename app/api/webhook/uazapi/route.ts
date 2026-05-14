import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { callAI } from "@/lib/ai/router"
import { WebhookEvent, AIConfig, AIMessage } from "@/types"
import { UazAPIClient } from "@/lib/uazapi"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const body: WebhookEvent = await req.json()
    const supabase = await createServiceClient()

    const instanceName = body.instance

    // Handle connection state update
    if (body.event === "connection.update") {
      const state = body.data?.instance?.state
      const newStatus =
        state === "open" ? "connected" : state === "connecting" ? "connecting" : "disconnected"
      await supabase
        .from("instances")
        .update({ status: newStatus })
        .eq("name", instanceName)
      return NextResponse.json({ ok: true })
    }

    // Handle new incoming message
    if (body.event === "messages.upsert" && !body.data?.key?.fromMe) {
      const remoteJid = body.data?.key?.remoteJid
      const messageText =
        body.data?.message?.conversation ??
        body.data?.message?.extendedTextMessage?.text

      if (!remoteJid || !messageText) {
        return NextResponse.json({ ok: true })
      }

      // Find instance in DB
      const { data: instance } = await supabase
        .from("instances")
        .select("*, agents(*)")
        .eq("name", instanceName)
        .single()

      if (!instance) return NextResponse.json({ ok: true })

      const contactPhone = remoteJid.replace("@s.whatsapp.net", "").replace("@g.us", "")
      const contactName = body.data?.pushName

      // Find or create conversation
      let { data: conversation } = await supabase
        .from("conversations")
        .select("*")
        .eq("instance_id", instance.id)
        .eq("contact_phone", contactPhone)
        .eq("status", "open")
        .single()

      if (!conversation) {
        const { data: newConv } = await supabase
          .from("conversations")
          .insert({
            instance_id: instance.id,
            contact_phone: contactPhone,
            contact_name: contactName,
            status: "open",
          })
          .select()
          .single()
        conversation = newConv
      } else if (contactName && !conversation.contact_name) {
        await supabase
          .from("conversations")
          .update({ contact_name: contactName })
          .eq("id", conversation.id)
      }

      // Save inbound message
      await supabase.from("messages").insert({
        conversation_id: conversation.id,
        whatsapp_id: body.data?.key?.id,
        direction: "inbound",
        content: messageText,
        message_type: "text",
        is_ai_response: false,
      })

      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversation.id)

      // Find active agent for this instance
      const { data: agent } = await supabase
        .from("agents")
        .select("*")
        .eq("instance_id", instance.id)
        .eq("is_active", true)
        .single()

      if (!agent) return NextResponse.json({ ok: true })

      // Check triggers
      const shouldRespond =
        agent.trigger_all_messages ||
        (agent.trigger_keywords?.some((kw: string) =>
          messageText.toLowerCase().includes(kw.toLowerCase())
        ) ?? false)

      if (!shouldRespond) return NextResponse.json({ ok: true })

      // Fetch message history
      const { data: history } = await supabase
        .from("messages")
        .select("direction, content, is_ai_response")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: false })
        .limit(agent.memory_window ?? 10)

      const messages: AIMessage[] = (history ?? [])
        .reverse()
        .map((m: { direction: string; content: string; is_ai_response: boolean }) => ({
          role: m.direction === "outbound" ? "assistant" : "user",
          content: m.content,
        }))

      // Call AI
      const config: AIConfig = {
        provider: agent.provider,
        model: agent.model,
        systemPrompt: agent.system_prompt,
        temperature: agent.temperature,
        maxTokens: agent.max_tokens,
      }

      const aiResponse = await callAI(config, messages)

      // Save AI response
      await supabase.from("messages").insert({
        conversation_id: conversation.id,
        direction: "outbound",
        content: aiResponse,
        message_type: "text",
        is_ai_response: true,
        provider: agent.provider,
        model: agent.model,
      })

      // Send via WhatsApp
      const uazClient = new UazAPIClient({
        baseUrl: instance.base_url,
        token: instance.token,
      })

      await uazClient.sendText(instanceName, {
        number: contactPhone,
        text: aiResponse,
        delay: 1200,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Webhook UazAPI error:", error)
    return NextResponse.json({ ok: true }, { status: 200 })
  }
}
