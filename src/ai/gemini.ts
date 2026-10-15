import { ChatGoogleGenerativeAI } from "@langchain/google-genai"

export const GEMINI_API_KEY_STORAGE = "geminiApiKey"
export const GEMINI_MODEL = "gemini-3.8-flash"
export const MISSING_GEMINI_KEY = "Falta la clave de Gemini."

export function readGeminiApiKey(): string {
  try {
    return localStorage.getItem(GEMINI_API_KEY_STORAGE) ?? ""
  } catch {
    return ""
  }
}

export function writeGeminiApiKey(value: string): void {
  if (value.length === 0) {
    localStorage.removeItem(GEMINI_API_KEY_STORAGE)
    return
  }
  localStorage.setItem(GEMINI_API_KEY_STORAGE, value)
}

export function createGeminiChat(apiKey: string) {
  const key = apiKey.trim()
  if (!key) throw new Error(MISSING_GEMINI_KEY)
  return new ChatGoogleGenerativeAI({
    model: GEMINI_MODEL,
    apiKey: key,
    maxRetries: 0,
  })
}
