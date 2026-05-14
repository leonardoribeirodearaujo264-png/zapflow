import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { UazAPIClient } from "@/lib/uazapi"

export async function POST(req: NextRequest) {
  try {
    const { conversationId, text } = await req.json()
    const supabase = await createClient()

    const { data: conv } = await supabase
      .from("conversations")
      .select("*, instances(*)")
      .eq("id", conversationId)
      .single()

    if (!conv) {
      return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 })
    }

    const instance = conv.instances
    if (!instance) {
      return NextResponse.json({ error: "Instância não encontrada" }, { status: 404 })
    }

    const client = new UazAPIClient({ baseUrl: instance.base_url, token: instance.token })
    await client.sendText(instance.name, {
      number: conv.contact_phone,
      text,
      delay: 500,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
