import { AIConfig, AIMessage } from "@/types"
import { callGemini } from "./gemini"
import { callOpenAI } from "./openai"
import { callClaude } from "./claude"

export async function callAI(config: AIConfig, messages: AIMessage[]): Promise<string> {
  switch (config.provider) {
    case "gemini":
      return callGemini(config, messages)
    case "openai":
      return callOpenAI(config, messages)
    case "claude":
      return callClaude(config, messages)
    default:
      throw new Error(`Provider desconhecido: ${config.provider}`)
  }
}
