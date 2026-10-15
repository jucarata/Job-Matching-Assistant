import { ChatPromptTemplate } from "@langchain/core/prompts"
import { z } from "zod"
import { createGeminiChat } from "@/ai/gemini"

export const proposedRoleSchema = z
  .object({
    role: z.string(),
    experience_years: z.number().min(0).nullable(),
    experience_months: z.number().int().min(0).max(11).nullable(),
    reliability: z.number().min(0).max(1),
    evidence: z.string(),
  })
  .refine((role) => role.experience_years !== null || role.experience_months === null)

export const proposedRolesSchema = z.array(proposedRoleSchema)

export type ProposedRole = z.infer<typeof proposedRoleSchema>

const rolePrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    [
      "Propón, desde el CV, el cargo ejercido y sus partes.",
      "Incluye el cargo y los roles que se desprenden del trabajo de esa experiencia, aunque el título no esté escrito.",
      "Copia el tiempo entero de la experiencia de origen.",
      "La fiabilidad no acorta ese tiempo.",
      "Cerca de 1: el CV nombra ese cargo y describe el trabajo.",
      "De 0.7 a menos de 1: es una parte directa del cargo, como Backend o Frontend dentro de Full Stack, y hay actividades de ese lado.",
      "Deja bajo 0.7 un título inferido de tareas sueltas o básicas, o un título más alto que no fue el cargo.",
      "Aunque existan unas tareas de arquitectura, Arquitecto de software queda bajo 0.7.",
      "Devuelve una lista.",
      "Cada ítem tiene role, experience_years, experience_months, reliability y evidence.",
      "evidence es una frase copiada del CV.",
      "Si el CV indica años y meses, experience_years es el entero de años y experience_months son los meses sobrantes, de 0 a 11.",
      "Si el CV ya expresa los años con un decimal, como 1.5, experience_years es ese número y experience_months es null.",
    ].join(" "),
  ],
  ["human", "{text}"],
])

export function createRoleChain(apiKey: string) {
  const model = createGeminiChat(apiKey).withStructuredOutput(proposedRolesSchema)
  return rolePrompt.pipe(model)
}
