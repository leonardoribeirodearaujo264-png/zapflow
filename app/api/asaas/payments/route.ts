import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { AsaasClient } from "@/lib/asaas"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { workspaceId, customerId, billingType, value, dueDate, description } = body
    const supabase = await createClient()

    const { data: settings } = await supabase
      .from("asaas_settings")
      .select("*")
      .eq("workspace_id", workspaceId)
      .single()

    if (!settings) {
      return NextResponse.json({ error: "Configure a API Asaas primeiro" }, { status: 400 })
    }

    const { data: customer } = await supabase
      .from("asaas_customers")
      .select("id")
      .eq("asaas_id", customerId)
      .single()

    const asaas = new AsaasClient({ apiKey: settings.api_key, sandbox: settings.sandbox_mode })
    const payment = await asaas.createPayment({
      customer: customerId,
      billingType,
      value,
      dueDate,
      description,
    }) as Record<string, unknown>

    await supabase.from("asaas_payments").insert({
      workspace_id: workspaceId,
      customer_id: customer?.id ?? null,
      asaas_id: payment.id as string,
      billing_type: billingType,
      value,
      due_date: dueDate,
      status: "PENDING",
      description: description || null,
      invoice_url: (payment.invoiceUrl as string) ?? null,
    })

    return NextResponse.json(payment)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
