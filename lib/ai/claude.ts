import Anthropic from "@anthropic-ai/sdk"
import { AIConfig, AIMessage } from "@/types"

export async function callClaude(config: AIConfig, messages: AIMessage[]): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada")

  const anthropic = new Anthropic({ apiKey })

  const response = await anthropic.messages.create({
    model: config.model,
    max_tokens: config.maxTokens ?? 1024,
    system: config.systemPrompt,
    messages: messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
  })

  const block = response.content[0]
  if (block.type !== "text") throw new Error("Resposta inesperada do Claude")
  return block.text
}
