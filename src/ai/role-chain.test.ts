import { describe, expect, it } from "vitest"
import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import { ChatPromptTemplate } from "@langchain/core/prompts"
import { RunnableSequence } from "@langchain/core/runnables"
import { GEMINI_MODEL, createGeminiChat } from "@/ai/gemini"
import { createRoleChain, proposedRoleSchema, proposedRolesSchema } from "@/ai/role-chain"

const roleFields = [
  "role",
  "experience_years",
  "experience_months",
  "reliability",
  "evidence",
] as const

const completeRole = {
  role: "Full Stack",
  experience_years: 2,
  experience_months: 0,
  reliability: 0.95,
  evidence: "Full Stack",
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

describe("cadena de roles", () => {
  it("pide el cargo y sus partes, el tiempo entero y el techo de 0.7", async () => {
    const chain = createRoleChain("clave-de-prueba")
    expect(chain).toBeInstanceOf(RunnableSequence)
    if (!(chain instanceof RunnableSequence)) throw new Error("La cadena no es una secuencia")
    const prompt = chain.steps[0]
    expect(prompt).toBeInstanceOf(ChatPromptTemplate)
    if (!(prompt instanceof ChatPromptTemplate)) throw new Error("Falta el prompt")
    const messages = await prompt.formatMessages({ text: "cv" })
    const system = String(messages[0].content)

    expect(system).toContain("el cargo ejercido y sus partes")
    expect(system).toContain("Copia el tiempo entero de la experiencia de origen")
    expect(system).toContain("Deja bajo 0.7 un título inferido de tareas sueltas")
  })

  it("exige role, años, meses, fiabilidad y frase", () => {
    expect(proposedRoleSchema.safeParse(completeRole).success).toBe(true)
    expect(proposedRolesSchema.safeParse([completeRole]).success).toBe(true)
    expect(proposedRolesSchema.safeParse(completeRole).success).toBe(false)

    for (const field of roleFields) {
      const partial = { ...completeRole }
      delete partial[field]
      expect(proposedRoleSchema.safeParse(partial).success).toBe(false)
    }
  })

  it("usa el mismo modelo y no lleva project id", () => {
    const chain = createRoleChain("  clave-de-prueba  ")
    const model = findChatModel(chain)
    expect(model).toBeInstanceOf(ChatGoogleGenerativeAI)
    expect(model).toMatchObject({
      apiKey: "clave-de-prueba",
      model: GEMINI_MODEL,
      caller: { maxRetries: 0 },
    })
    expect(model).not.toHaveProperty("project")
    expect(model).not.toHaveProperty("projectId")
    expect(`${createGeminiChat}\n${createRoleChain}`.toLowerCase()).not.toContain("project")
  })
})
