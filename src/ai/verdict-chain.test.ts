import { describe, expect, it } from "vitest"
import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import { ChatPromptTemplate } from "@langchain/core/prompts"
import { RunnableSequence } from "@langchain/core/runnables"
import { FIT_THRESHOLD_STORAGE } from "@/ai/fit-threshold"
import { GEMINI_MODEL, createGeminiChat } from "@/ai/gemini"
import {
  createVerdictChain,
  parseVerdict,
  requestVerdict,
  type VerdictClient,
} from "@/ai/verdict-chain"
import type { Profile } from "@/profile/types"

const profile: Profile = {
  tech_skills: ["React"],
  soft_skills: ["Comunicación"],
  languages: [{ language: "Español", level: "nativo" }],
  roles: [
    {
      role: "Full Stack",
      experience_time: 2,
      reliability: 0.95,
      evidence: "frase oculta del arquitecto",
    },
  ],
  education: [{ name: "Ingeniería", issuer: "Universidad", status: null }],
  flat_text: "texto literal del cv",
}

const usable = {
  matches: ["React en el puesto"],
  mismatches: ["Falta Go"],
  score: 7.5,
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

describe("cadena de veredicto", () => {
  it("pide la comparación en inglés, sin corte ni recomendación de postular", async () => {
    const chain = createVerdictChain("clave-de-prueba")
    expect(chain).toBeInstanceOf(RunnableSequence)
    if (!(chain instanceof RunnableSequence)) throw new Error("La cadena no es una secuencia")
    const prompt = chain.steps[0]
    expect(prompt).toBeInstanceOf(ChatPromptTemplate)
    if (!(prompt instanceof ChatPromptTemplate)) throw new Error("Falta el prompt")
    const messages = await prompt.formatMessages({
      profile: JSON.stringify({ flat_text: "texto literal del cv" }),
      message: "Vacante de datos",
    })
    const system = String(messages[0].content)
    const human = String(messages[1].content)

    expect(system).toContain("matches")
    expect(system).toContain("mismatches")
    expect(system).toContain("score")
    expect(system).toContain("language of the profile")
    expect(system).toContain("are not job requirements")
    expect(system.toLowerCase()).not.toMatch(/threshold|fitthreshold|recommend|\bapply\b|postular|\bcorte\b/)
    expect(system).not.toMatch(/[áéíóúñ]/)
    expect(human).toContain("texto literal del cv")
    expect(human).toContain("Vacante de datos")
    expect(system).not.toContain("Vacante de datos")
  })

  it("usa el mismo modelo y no lleva project id", () => {
    const chain = createVerdictChain("  clave-de-prueba  ")
    const model = findChatModel(chain)
    expect(model).toBeInstanceOf(ChatGoogleGenerativeAI)
    expect(model).toMatchObject({
      apiKey: "clave-de-prueba",
      model: GEMINI_MODEL,
      caller: { maxRetries: 0 },
    })
    expect(model).not.toHaveProperty("project")
    expect(model).not.toHaveProperty("projectId")
    expect(`${createGeminiChat}\n${createVerdictChain}`.toLowerCase()).not.toContain("project")
  })

  it("envía los roles conservados y el mensaje, sin corte ni veredicto previo", async () => {
    localStorage.setItem(FIT_THRESHOLD_STORAGE, "8.5")
    const seen: string[] = []
    const client: VerdictClient = {
      invoke: async (input) => {
        seen.push(JSON.stringify(input))
        return seen.length === 1
          ? { matches: ["Coincidencia previa única"], mismatches: ["Hueco previo"], score: 7.5 }
          : { matches: ["Otra"], mismatches: [], score: 8 }
      },
    }
    const loaded = {
      ...profile,
      experience_time: 9,
      discarded: ["Arquitecto de software"],
    } as Profile

    await requestVerdict(client, loaded, "Primera vacante única")
    await requestVerdict(client, loaded, "Segunda vacante única")

    const first = JSON.parse(seen[0]) as { profile: string; message: string }
    const body = JSON.parse(first.profile) as {
      flat_text: string
      roles: Array<Record<string, unknown>>
      experience_time?: number
    }
    expect(first.message).toBe("Primera vacante única")
    expect(body.flat_text).toBe("texto literal del cv")
    expect(body.roles).toEqual([{ role: "Full Stack", experience_time: 2 }])
    expect(body).not.toHaveProperty("experience_time")
    expect(seen[0]).not.toContain("Arquitecto de software")
    expect(seen[0]).not.toContain("reliability")
    expect(seen[0]).not.toContain("evidence")
    expect(seen[0]).not.toContain("frase oculta del arquitecto")
    expect(seen[0]).not.toContain("fitThreshold")
    expect(seen[0]).not.toContain("8.5")

    expect(seen[1]).toContain("Segunda vacante única")
    expect(seen[1]).not.toContain("Primera vacante única")
    expect(seen[1]).not.toContain("Coincidencia previa única")
    expect(seen[1]).not.toContain("Hueco previo")
    localStorage.removeItem(FIT_THRESHOLD_STORAGE)
  })

  it("envía name, issuer y status, y el estado manda sobre flat_text", async () => {
    const chain = createVerdictChain("clave-de-prueba")
    expect(chain).toBeInstanceOf(RunnableSequence)
    if (!(chain instanceof RunnableSequence)) throw new Error("La cadena no es una secuencia")
    const prompt = chain.steps[0]
    expect(prompt).toBeInstanceOf(ChatPromptTemplate)
    if (!(prompt instanceof ChatPromptTemplate)) throw new Error("Falta el prompt")
    const messages = await prompt.formatMessages({ profile: "{}", message: "Vacante" })
    const system = String(messages[0].content)

    expect(system).toContain("FINALIZADO means it was already obtained")
    expect(system).toContain("ACTUALMENTE means it is still in progress")
    expect(system).toContain("A null status does not assert either")
    expect(system).toContain("status wins over flat_text")
    expect(system).not.toMatch(/[áéíóúñ]/)

    const seen: string[] = []
    const client: VerdictClient = {
      invoke: async (input) => {
        seen.push(JSON.stringify(input))
        return usable
      },
    }
    const stored = {
      name: "Ingeniero en Sistemas",
      issuer: "Universidad ICESI",
      status: "FINALIZADO" as const,
      end_year: 2026,
      end_month: 3,
      ongoing: true,
    }
    const loaded = {
      ...profile,
      education: [stored],
    } as Profile

    await requestVerdict(client, loaded, "Vacante de sistemas")

    const first = JSON.parse(seen[0]) as { profile: string }
    const body = JSON.parse(first.profile) as { education: Array<Record<string, unknown>> }
    expect(body.education).toEqual([
      { name: "Ingeniero en Sistemas", issuer: "Universidad ICESI", status: "FINALIZADO" },
    ])
    expect(seen[0]).not.toContain("end_year")
    expect(seen[0]).not.toContain("end_month")
    expect(seen[0]).not.toContain("ongoing")
  })

  it("acepta 7.5 y rechaza un veredicto incompleto, 7.3 y 11", () => {
    expect(parseVerdict(usable)).toEqual(usable)
    expect(() => parseVerdict({ mismatches: ["Falta Go"], score: 7.5 })).toThrow(
      "No se pudo revisar la vacante.",
    )
    expect(() => parseVerdict({ matches: ["React"], mismatches: ["Go"], score: 7.3 })).toThrow(
      "No se pudo revisar la vacante.",
    )
    expect(() => parseVerdict({ matches: ["React"], mismatches: ["Go"], score: 11 })).toThrow(
      "No se pudo revisar la vacante.",
    )
  })
})
