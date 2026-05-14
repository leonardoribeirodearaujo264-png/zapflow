import OpenAI from "openai"
import { AIConfig, AIMessage } from "@/types"

export async function callOpenAI(config: AIConfig, messages: AIMessage[]): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY não configurada")

  const openai = new OpenAI({ apiKey })

  const response = await openai.chat.completions.create({
    model: config.model,
    messages: [
      { role: "system", content: config.systemPrompt },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ],
    temperature: config.temperature ?? 0.7,
    max_tokens: config.maxTokens ?? 1024,
  })

  return response.choices[0].message.content ?? ""
}
