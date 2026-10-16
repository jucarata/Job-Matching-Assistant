import { ChatPromptTemplate } from "@langchain/core/prompts"
import { z } from "zod"
import { structuredGemini } from "@/ai/gemini"
import { LoadStepError, UNUSABLE_PROFILE } from "@/profile/load-errors"

export const LANGUAGE_LEVELS = ["básico", "intermedio", "avanzado", "nativo"] as const

export const extractedFieldsSchema = z.object({
  tech_skills: z.array(z.string()),
  soft_skills: z.array(z.string()),
  languages: z.array(
    z.object({
      language: z.string(),
      level: z.enum(LANGUAGE_LEVELS),
    }),
  ),
})

export type ExtractedFields = z.infer<typeof extractedFieldsSchema>

const loadPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    [
      "Extrae del CV únicamente lo que el texto sostiene.",
      "Devuelve tech_skills, soft_skills y languages.",
      "En languages, cada idioma humano lleva level: básico, intermedio, avanzado o nativo.",
      "No inventes habilidades ni idiomas.",
    ].join(" "),
  ],
  ["human", "{text}"],
])

export type FieldChain = {
  invoke: (input: { text: string }) => Promise<unknown>
}

export function createLoadChain(apiKey: string) {
  const model = structuredGemini(apiKey, extractedFieldsSchema)
  return loadPrompt.pipe(model)
}

export function parseExtractedFields(value: unknown): ExtractedFields {
  const parsed = extractedFieldsSchema.safeParse(value)
  if (!parsed.success) throw new LoadStepError(UNUSABLE_PROFILE)
  return parsed.data
}
