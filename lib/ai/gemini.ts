import { GoogleGenerativeAI } from "@google/generative-ai"
import { AIConfig, AIMessage } from "@/types"

export async function callGemini(config: AIConfig, messages: AIMessage[]): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("GEMINI_API_KEY não configurada")

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: config.model,
    systemInstruction: config.systemPrompt,
    generationConfig: {
      temperature: config.temperature ?? 0.7,
      maxOutputTokens: config.maxTokens ?? 1024,
    },
  })

  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }))

  const chat = model.startChat({ history })
  const lastMessage = messages.at(-1)
  if (!lastMessage) throw new Error("Nenhuma mensagem fornecida")

  const result = await chat.sendMessage(lastMessage.content)
  return result.response.text()
}
