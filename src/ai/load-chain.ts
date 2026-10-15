import { ChatPromptTemplate } from "@langchain/core/prompts"
import { createGeminiChat } from "@/ai/gemini"

const loadPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "Extrae del CV tech_skills, soft_skills, languages, experience_time y education.",
  ],
  ["human", "{text}"],
])

export function createLoadChain(apiKey: string) {
  return loadPrompt.pipe(createGeminiChat(apiKey))
}
