import { ChatPromptTemplate } from "@langchain/core/prompts"
import { z } from "zod"
import { isGridScore } from "@/ai/fit-threshold"
import { createGeminiChat } from "@/ai/gemini"
import type { Profile } from "@/profile/types"

export const VERDICT_FAILED = "No se pudo revisar la vacante."

export const verdictSchema = z.object({
  matches: z.array(z.string()),
  mismatches: z.array(z.string()),
  score: z.number(),
})

export type Verdict = z.infer<typeof verdictSchema>

export type VerdictProfile = {
  tech_skills: string[]
  soft_skills: string[]
  languages: { language: string; level: string }[]
  roles: { role: string; experience_time: number | null }[]
  education: string[]
  flat_text: string
}

const verdictPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    [
      "Compare the candidate profile with the vacancy in the message.",
      "Return matches, mismatches, and score.",
      "Write the matches and mismatches in the language of the profile.",
      "score is coverage from 0 to 10 in steps of 0.5.",
      "0 means the experience has nothing in common with the vacancy.",
      "10 means the experience covers every requirement.",
      "Do not round score.",
      "A match must be visible in the profile fields or in flat_text.",
      "If the fields and flat_text disagree, flat_text wins.",
      "Words in the message that are not the vacancy are notes from the user and are not job requirements.",
      "Do not give advice.",
    ].join(" "),
  ],
  ["human", "Profile:\n{profile}\n\nMessage:\n{message}"],
])

export function profileForVerdict(profile: Profile): VerdictProfile {
  return {
    tech_skills: [...profile.tech_skills],
    soft_skills: [...profile.soft_skills],
    languages: profile.languages.map(({ language, level }) => ({ language, level })),
    roles: profile.roles.map(({ role, experience_time }) => ({ role, experience_time })),
    education: [...profile.education],
    flat_text: profile.flat_text,
  }
}

export function createVerdictChain(apiKey: string) {
  const model = createGeminiChat(apiKey).withStructuredOutput(verdictSchema)
  return verdictPrompt.pipe(model)
}

export type VerdictClient = {
  invoke: (input: { profile: string; message: string }) => Promise<unknown>
}

export function verdictCallInput(profile: Profile, message: string) {
  return {
    profile: JSON.stringify(profileForVerdict(profile)),
    message,
  }
}

export function parseVerdict(value: unknown): Verdict {
  const parsed = verdictSchema.safeParse(value)
  if (!parsed.success || !isGridScore(parsed.data.score)) {
    throw new Error(VERDICT_FAILED)
  }
  return parsed.data
}

export async function requestVerdict(
  client: VerdictClient,
  profile: Profile,
  message: string,
): Promise<Verdict> {
  return parseVerdict(await client.invoke(verdictCallInput(profile, message)))
}

export function requestProfileVerdict(profile: Profile, message: string, apiKey: string) {
  return requestVerdict(createVerdictChain(apiKey), profile, message)
}
