import { ChatPromptTemplate } from "@langchain/core/prompts"
import { z } from "zod"
import { createGeminiChat } from "@/ai/gemini"

export const extractedEducationSchema = z.object({
  name: z.string(),
  issuer: z.string(),
  end_year: z.number().nullable(),
  end_month: z.number().nullable(),
  ongoing: z.boolean(),
})

export const extractedEducationListSchema = z.array(extractedEducationSchema)

export type ExtractedEducation = z.infer<typeof extractedEducationSchema>

const educationPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    [
      "Extrae del CV los estudios y certificaciones.",
      "Devuelve una lista.",
      "Cada ítem tiene name, issuer, end_year, end_month y ongoing.",
      "Copia la fecha de cierre o de graduación.",
      "Si el CV solo trae el año, end_month queda vacío.",
      "Pon ongoing en true solo cuando el CV dice que sigue y no hay fecha de fin.",
      "Usa palabras como actual, en curso, presente o cursando.",
      "Si hay fecha, ongoing queda en false.",
      "En una certificación, copia la emisión y no su vencimiento.",
      "No inventes fechas.",
    ].join(" "),
  ],
  ["human", "{text}"],
])

export function createEducationChain(apiKey: string) {
  const model = createGeminiChat(apiKey).withStructuredOutput(extractedEducationListSchema)
  return educationPrompt.pipe(model)
}
