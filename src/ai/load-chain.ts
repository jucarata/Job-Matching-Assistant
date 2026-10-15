import { ChatPromptTemplate } from "@langchain/core/prompts"
import { z } from "zod"
import { createGeminiChat } from "@/ai/gemini"
import { LoadStepError, UNUSABLE_PROFILE } from "@/profile/load-errors"

export const LANGUAGE_LEVELS = ["básico", "intermedio", "avanzado", "nativo"] as const

export const extractedFieldsSchema = z
  .object({
    tech_skills: z.array(z.string()),
    soft_skills: z.array(z.string()),
    languages: z.array(
      z.object({
        language: z.string(),
        level: z.enum(LANGUAGE_LEVELS),
      }),
    ),
    experience_years: z.number().min(0).nullable(),
    experience_months: z.number().int().min(0).max(11).nullable(),
    education: z.array(z.string()),
  })
  .refine((fields) => fields.experience_years !== null || fields.experience_months === null)

export type ExtractedFields = z.infer<typeof extractedFieldsSchema>

const loadPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    [
      "Extrae del CV únicamente lo que el texto sostiene.",
      "Devuelve tech_skills, soft_skills, languages, education, experience_years y experience_months.",
      "En languages, cada idioma humano lleva level: básico, intermedio, avanzado o nativo.",
      "Si el CV indica años y meses, experience_years es el entero de años y experience_months son los meses sobrantes, de 0 a 11.",
      "Si el CV ya expresa los años con un decimal, como 1.5, experience_years es ese número y experience_months es null.",
      "Si no hay experiencia en el sector, experience_years y experience_months son null.",
      "No inventes habilidades, idiomas ni títulos.",
    ].join(" "),
  ],
  ["human", "{text}"],
])

export type FieldChain = {
  invoke: (input: { text: string }) => Promise<unknown>
}

export function createLoadChain(apiKey: string) {
  const model = createGeminiChat(apiKey).withStructuredOutput(extractedFieldsSchema)
  return loadPrompt.pipe(model)
}

export function parseExtractedFields(value: unknown): ExtractedFields {
  const parsed = extractedFieldsSchema.safeParse(value)
  if (!parsed.success) throw new LoadStepError(UNUSABLE_PROFILE)
  return parsed.data
}
