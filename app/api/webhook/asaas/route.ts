import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { UazAPIClient } from "@/lib/uazapi"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = await createServiceClient()

    const { event, payment } = body

    if (!payment?.id) return NextResponse.json({ ok: true })

    const statusMap: Record<string, string> = {
      PAYMENT_RECEIVED: "RECEIVED",
      PAYMENT_CONFIRMED: "CONFIRMED",
      PAYMENT_OVERDUE: "OVERDUE",
      PAYMENT_REFUNDED: "REFUNDED",
    }

    const newStatus = statusMap[event]
    if (newStatus) {
      await supabase
        .from("asaas_payments")
        .update({ status: newStatus })
        .eq("asaas_id", payment.id)
    }

    // Send WhatsApp notification if payment received
    if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
      const { data: localPayment } = await supabase
        .from("asaas_payments")
        .select("*, conversations(*, instances(*))")
        .eq("asaas_id", payment.id)
        .single()

      if (localPayment?.conversations?.instances) {
        const instance = localPayment.conversations.instances
        const conversation = localPayment.conversations
        const client = new UazAPIClient({ baseUrl: instance.base_url, token: instance.token })
        const value = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(payment.value)

        await client.sendText(instance.name, {
          number: conversation.contact_phone,
          text: `✅ *Pagamento confirmado!*\n\nValor: *${value}*\nDescrição: ${payment.description ?? "—"}\n\nObrigado! 🙏`,
          delay: 1000,
        })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Webhook Asaas error:", error)
    return NextResponse.json({ ok: true })
  }
}
