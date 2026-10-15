import { afterEach, describe, expect, it } from "vitest"
import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import { RunnableSequence } from "@langchain/core/runnables"
import {
  GEMINI_API_KEY_STORAGE,
  GEMINI_MODEL,
  createGeminiChat,
  readGeminiApiKey,
  writeGeminiApiKey,
} from "@/ai/gemini"
import { createLoadChain } from "@/ai/load-chain"
import { createCvLoader } from "@/profile/load-cv"

afterEach(() => {
  localStorage.removeItem(GEMINI_API_KEY_STORAGE)
})

describe("clave de Gemini", () => {
  it("guarda la clave y la relee", () => {
    writeGeminiApiKey("clave-guardada")
    expect(localStorage.getItem(GEMINI_API_KEY_STORAGE)).toBe("clave-guardada")
    expect(readGeminiApiKey()).toBe("clave-guardada")
  })

  it("olvida la clave cuando el campo queda vacío", () => {
    writeGeminiApiKey("clave-guardada")
    writeGeminiApiKey("")
    expect(localStorage.getItem(GEMINI_API_KEY_STORAGE)).toBeNull()
    expect(readGeminiApiKey()).toBe("")
  })

  it("asocia la clave con la cadena de carga", () => {
    const chain = createLoadChain("  clave-de-prueba  ")
    expect(chain).toBeInstanceOf(RunnableSequence)
    const sequence = chain as RunnableSequence
    const model = sequence.steps.at(-1)
    expect(model).toBeInstanceOf(ChatGoogleGenerativeAI)
    expect(model).toMatchObject({
      apiKey: "clave-de-prueba",
      model: GEMINI_MODEL,
    })
    expect(model).not.toHaveProperty("project")
    expect(model).not.toHaveProperty("projectId")
    expect(`${createGeminiChat}\n${createLoadChain}`.toLowerCase()).not.toContain("project")
  })

  it("no construye el chat sin clave", () => {
    expect(() => createGeminiChat("   ")).toThrow("Falta la clave de Gemini.")
  })

  it("sin clave no guarda profile ni arma la cadena", async () => {
    const calls: string[] = []
    const loadCv = createCvLoader((apiKey) => {
      calls.push(apiKey)
      return createLoadChain(apiKey)
    })

    const result = await loadCv(new File(["cv"], "cv.pdf", { type: "application/pdf" }), "  ")

    expect(result).toEqual({ ok: false, message: "Falta la clave de Gemini." })
    expect(calls).toEqual([])
    expect(result).not.toHaveProperty("profile")
  })
})
