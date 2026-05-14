import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { UazAPIClient } from "@/lib/uazapi"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: instance } = await supabase.from("instances").select("*").eq("id", id).single()

    if (!instance) {
      return NextResponse.json({ error: "Instância não encontrada" }, { status: 404 })
    }

    const client = new UazAPIClient({ baseUrl: instance.base_url, token: instance.token })
    const data = await client.logout(instance.name)
    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao desconectar instância"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
