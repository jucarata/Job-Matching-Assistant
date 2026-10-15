import { RunnableLambda, RunnableSequence } from "@langchain/core/runnables"
import { GEMINI_MODEL } from "@/ai/gemini"
import {
  createLoadChain,
  parseExtractedFields,
  type ExtractedFields,
  type FieldChain,
} from "@/ai/load-chain"
import { roundExperienceTime } from "@/profile/experience"
import {
  LoadStepError,
  GEMINI_UNAVAILABLE,
  MODEL_STEP_TIMEOUT,
  PDF_STEP_TIMEOUT,
  PROFILE_SAVE_FAILED,
  UNUSABLE_PROFILE,
} from "@/profile/load-errors"
import { saveProfile } from "@/profile/profile-store"
import {
  LOAD_READY_LABEL,
  LOAD_STEP_LABELS,
  MODEL_STEP_TIMEOUT_MS,
  PDF_STEP_TIMEOUT_MS,
} from "@/profile/load-progress"
import { assignFlatText, extractPdfText, validatePdfFile } from "@/profile/pdf-text"
import type { LoadProgress, Profile } from "@/profile/types"

export type TextDraft = {
  flat_text: string
}

export type FieldDraft = TextDraft & {
  fields: ExtractedFields
}

export type RoundedDraft = FieldDraft & {
  experience_time: number | null
}

export type LoadPipelineOptions = {
  apiKey: string
  extractText?: (file: File) => Promise<string>
  createChain?: (apiKey: string) => FieldChain
  persistProfile?: (profile: Profile) => Promise<void>
  onProgress?: (progress: LoadProgress) => void
}

function withTimeout<T>(work: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new LoadStepError(message)), ms)
    work.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

function trackStep<In, Out>(
  index: number,
  run: (input: In) => Out | Promise<Out>,
  onProgress?: (progress: LoadProgress) => void,
) {
  return async (input: In) => {
    onProgress?.({
      completed: index,
      total: LOAD_STEP_LABELS.length,
      label: LOAD_STEP_LABELS[index],
      status: "active",
    })
    try {
      const output = await run(input)
      if (index + 1 === LOAD_STEP_LABELS.length) {
        onProgress?.({
          completed: LOAD_STEP_LABELS.length,
          total: LOAD_STEP_LABELS.length,
          label: LOAD_READY_LABEL,
          status: "done",
        })
      }
      return output
    } catch (error) {
      onProgress?.({
        completed: index,
        total: LOAD_STEP_LABELS.length,
        label: LOAD_STEP_LABELS[index],
        status: "error",
      })
      throw error
    }
  }
}

function geminiUnavailable(error: unknown, depth = 0): boolean {
  if (!error || typeof error !== "object" || depth > 4) return false
  const record = error as { status?: unknown; message?: unknown; cause?: unknown }
  if (record.status === 503) return true
  if (typeof record.message === "string" && /\b503\b/.test(record.message)) return true
  return geminiUnavailable(record.cause, depth + 1)
}

function modelFailure(error: unknown): LoadStepError {
  if (error instanceof LoadStepError) return error
  if (geminiUnavailable(error)) {
    return new LoadStepError(`${GEMINI_UNAVAILABLE} (${GEMINI_MODEL})`)
  }
  const detail = error instanceof Error ? error.message.split("\n")[0].replace(/key=[^\s&]+/gi, "key=…") : ""
  const message = detail ? `${UNUSABLE_PROFILE} ${detail.slice(0, 160)}` : UNUSABLE_PROFILE
  return new LoadStepError(message)
}

export async function extractStructuredFields(
  input: TextDraft,
  extractFields: (text: string) => Promise<unknown>,
): Promise<FieldDraft> {
  let raw: unknown
  try {
    raw = await extractFields(input.flat_text)
  } catch (error) {
    throw modelFailure(error)
  }
  return {
    flat_text: input.flat_text,
    fields: parseExtractedFields(raw),
  }
}

export function createExtractFieldsStep(extractFields: (text: string) => Promise<unknown>) {
  return (input: TextDraft) => extractStructuredFields(input, extractFields)
}

export function applyExperienceRounding(draft: FieldDraft): RoundedDraft {
  return {
    ...draft,
    experience_time: roundExperienceTime(
      draft.fields.experience_years,
      draft.fields.experience_months,
    ),
  }
}

export function composeProfile(draft: RoundedDraft): Profile {
  return {
    tech_skills: draft.fields.tech_skills,
    soft_skills: draft.fields.soft_skills,
    languages: draft.fields.languages,
    education: draft.fields.education,
    experience_time: draft.experience_time,
    flat_text: draft.flat_text,
  }
}

async function storeComposedProfile(
  draft: RoundedDraft,
  persist: (profile: Profile) => Promise<void>,
): Promise<Profile> {
  const profile = composeProfile(draft)
  try {
    await persist(profile)
  } catch (error) {
    if (error instanceof LoadStepError) throw error
    throw new LoadStepError(PROFILE_SAVE_FAILED)
  }
  return profile
}

export function createLoadPipeline(options: LoadPipelineOptions) {
  const readText = options.extractText ?? extractPdfText
  const createChain = options.createChain ?? createLoadChain
  const persist = options.persistProfile ?? saveProfile
  const extractFields = (text: string) => createChain(options.apiKey).invoke({ text })
  const { onProgress } = options

  return RunnableSequence.from([
    RunnableLambda.from(trackStep(0, validatePdfFile, onProgress)),
    RunnableLambda.from(
      trackStep(
        1,
        (file: File) =>
          withTimeout(Promise.resolve(readText(file)), PDF_STEP_TIMEOUT_MS, PDF_STEP_TIMEOUT),
        onProgress,
      ),
    ),
    RunnableLambda.from(trackStep(2, assignFlatText, onProgress)),
    RunnableLambda.from(
      trackStep(
        3,
        (input: TextDraft) =>
          withTimeout(
            extractStructuredFields(input, extractFields),
            MODEL_STEP_TIMEOUT_MS,
            MODEL_STEP_TIMEOUT,
          ),
        onProgress,
      ),
    ),
    RunnableLambda.from(trackStep(4, applyExperienceRounding, onProgress)),
    RunnableLambda.from(
      trackStep(5, (draft: RoundedDraft) => storeComposedProfile(draft, persist), onProgress),
    ),
  ])
}
