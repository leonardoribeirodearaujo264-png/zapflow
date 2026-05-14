import { NextRequest, NextResponse } from "next/server"
import { callAI } from "@/lib/ai/router"
import { AIConfig, AIMessage } from "@/types"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { provider, model, systemPrompt, temperature, maxTokens, messages } = body

    if (!provider || !model || !systemPrompt || !messages?.length) {
      return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 })
    }

    const config: AIConfig = { provider, model, systemPrompt, temperature, maxTokens }
    const text = await callAI(config, messages as AIMessage[])
    return NextResponse.json({ text })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
