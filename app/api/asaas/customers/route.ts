import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { AsaasClient } from "@/lib/asaas"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { workspaceId, name, email, phone, cpfCnpj } = body
    const supabase = await createClient()

    const { data: settings } = await supabase
      .from("asaas_settings")
      .select("*")
      .eq("workspace_id", workspaceId)
      .single()

    if (!settings) {
      return NextResponse.json({ error: "Configure a API Asaas primeiro" }, { status: 400 })
    }

    const asaas = new AsaasClient({ apiKey: settings.api_key, sandbox: settings.sandbox_mode })
    const customer = await asaas.createCustomer({ name, email, phone, cpfCnpj }) as Record<string, unknown>

    await supabase.from("asaas_customers").insert({
      workspace_id: workspaceId,
      asaas_id: customer.id as string,
      name,
      email: email || null,
      phone: phone || null,
      cpf_cnpj: cpfCnpj || null,
    })

    return NextResponse.json(customer)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
