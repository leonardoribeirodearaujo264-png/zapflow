import { NextRequest, NextResponse } from "next/server"
import { AIConfig } from "@/types"

export async function POST(req: NextRequest) {
  try {
    const { provider, apiKey } = await req.json()

    if (!provider || !apiKey) {
      return NextResponse.json({ ok: false, error: "Provider e apiKey são obrigatórios" }, { status: 400 })
    }

    const config: AIConfig = {
      provider,
      model:
        provider === "gemini"
          ? "gemini-2.0-flash"
          : provider === "openai"
          ? "gpt-4o-mini"
          : "claude-haiku-4-5-20251001",
      systemPrompt: "Você é um assistente de teste.",
      temperature: 0.5,
      maxTokens: 50,
    }

    const testMessage = [{ role: "user" as const, content: "Responda apenas: OK" }]

    if (provider === "gemini") {
      const { GoogleGenerativeAI } = await import("@google/generative-ai")
      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({
        model: config.model,
        systemInstruction: config.systemPrompt,
        generationConfig: { temperature: 0.5, maxOutputTokens: 50 },
      })
      const chat = model.startChat({ history: [] })
      await chat.sendMessage("Responda apenas: OK")
    } else if (provider === "openai") {
      const OpenAI = (await import("openai")).default
      const openai = new OpenAI({ apiKey })
      await openai.chat.completions.create({
        model: config.model,
        messages: [
          { role: "system", content: config.systemPrompt },
          ...testMessage.map((m) => ({ role: m.role, content: m.content })),
        ],
        max_tokens: 50,
      })
    } else if (provider === "claude") {
      const Anthropic = (await import("@anthropic-ai/sdk")).default
      const anthropic = new Anthropic({ apiKey })
      await anthropic.messages.create({
        model: config.model,
        system: config.systemPrompt,
        messages: testMessage,
        max_tokens: 50,
      })
    } else {
      return NextResponse.json({ ok: false, error: "Provider desconhecido" }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido"
    console.error("AI test error:", message)
    return NextResponse.json({ ok: false, error: message })
  }
}
