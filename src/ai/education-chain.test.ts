import { describe, expect, it } from "vitest"
import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import { ChatPromptTemplate } from "@langchain/core/prompts"
import { RunnableSequence } from "@langchain/core/runnables"
import {
  createEducationChain,
  extractedEducationListSchema,
  extractedEducationSchema,
} from "@/ai/education-chain"
import { GEMINI_MODEL, createGeminiChat } from "@/ai/gemini"

const educationFields = ["name", "issuer", "end_year", "end_month", "ongoing"] as const

const completeEducation = {
  name: "Ingeniero en Sistemas",
  issuer: "Universidad ICESI",
  end_year: 2026,
  end_month: 3,
  ongoing: false,
}

const months = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
]

function todayPhrases(today: Date): string[] {
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")
  return [
    `${year}-${month}-${day}`,
    `${day}/${month}/${year}`,
    `${day}-${month}-${year}`,
    `${Number(day)} de ${months[today.getMonth()]} de ${year}`,
  ]
}

function findChatModel(runnable: unknown): ChatGoogleGenerativeAI | undefined {
  if (runnable instanceof ChatGoogleGenerativeAI) return runnable
  if (!runnable || typeof runnable !== "object") return undefined
  const record = runnable as { bound?: unknown; steps?: unknown[] }
  if (record.bound) {
    const found = findChatModel(record.bound)
    if (found) return found
  }
  if (Array.isArray(record.steps)) {
    for (const step of record.steps) {
      const found = findChatModel(step)
      if (found) return found
    }
  }
  return undefined
}

describe("cadena de educación", () => {
  it("pide estudios y certificaciones sin variable de fecha", async () => {
    const chain = createEducationChain("clave-de-prueba")
    expect(chain).toBeInstanceOf(RunnableSequence)
    if (!(chain instanceof RunnableSequence)) throw new Error("La cadena no es una secuencia")
    const prompt = chain.steps[0]
    expect(prompt).toBeInstanceOf(ChatPromptTemplate)
    if (!(prompt instanceof ChatPromptTemplate)) throw new Error("Falta el prompt")
    expect(prompt.inputVariables).toEqual(["text"])

    const messages = await prompt.formatMessages({ text: "cv sin fecha" })
    const formatted = messages.map((message) => String(message.content)).join("\n")
    const system = String(messages[0].content)

    expect(system).toContain("estudios y certificaciones")
    expect(system).toContain("Copia la fecha de cierre o de graduación")
    expect(system).toContain("end_month queda vacío")
    expect(system).toContain("ongoing en true solo cuando el CV dice que sigue y no hay fecha de fin")
    expect(system).toContain("Si hay fecha, ongoing queda en false")
    expect(system).toContain("copia la emisión y no su vencimiento")
    expect(system).toContain("No inventes fechas")
    for (const phrase of todayPhrases(new Date())) {
      expect(formatted).not.toContain(phrase)
    }
  })

  it("exige name, issuer, end_year, end_month y ongoing", () => {
    expect(extractedEducationSchema.safeParse(completeEducation).success).toBe(true)
    expect(extractedEducationListSchema.safeParse([completeEducation]).success).toBe(true)
    expect(extractedEducationListSchema.safeParse(completeEducation).success).toBe(false)
    expect(
      extractedEducationSchema.safeParse({ ...completeEducation, end_month: 13 }).success,
    ).toBe(true)
    expect(
      extractedEducationSchema.safeParse({ ...completeEducation, end_year: null, end_month: null })
        .success,
    ).toBe(true)

    for (const field of educationFields) {
      const partial = { ...completeEducation }
      delete partial[field]
      expect(extractedEducationSchema.safeParse(partial).success).toBe(false)
    }
  })

  it("usa el mismo modelo y no lleva project id", () => {
    const chain = createEducationChain("  clave-de-prueba  ")
    const model = findChatModel(chain)
    expect(model).toBeInstanceOf(ChatGoogleGenerativeAI)
    expect(model).toMatchObject({
      apiKey: "clave-de-prueba",
      model: GEMINI_MODEL,
      caller: { maxRetries: 0 },
    })
    expect(model).not.toHaveProperty("project")
    expect(model).not.toHaveProperty("projectId")
    expect(`${createGeminiChat}\n${createEducationChain}`.toLowerCase()).not.toContain("project")
  })
})
