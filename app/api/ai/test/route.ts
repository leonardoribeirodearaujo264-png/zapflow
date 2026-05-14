import { NextRequest, NextResponse } from "next/server"
import { callAI } from "@/lib/ai/router"
import { AIConfig } from "@/types"

export async function POST(req: NextRequest) {
  try {
    const { provider, apiKey } = await req.json()

    // Temporarily override env for test
    const originalKey =
      provider === "gemini"
        ? process.env.GEMINI_API_KEY
        : provider === "openai"
        ? process.env.OPENAI_API_KEY
        : process.env.ANTHROPIC_API_KEY

    if (provider === "gemini") process.env.GEMINI_API_KEY = apiKey
    else if (provider === "openai") process.env.OPENAI_API_KEY = apiKey
    else process.env.ANTHROPIC_API_KEY = apiKey

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

    await callAI(config, [{ role: "user", content: "Responda apenas: OK" }])

    // Restore original
    if (provider === "gemini") process.env.GEMINI_API_KEY = originalKey
    else if (provider === "openai") process.env.OPENAI_API_KEY = originalKey
    else process.env.ANTHROPIC_API_KEY = originalKey

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
