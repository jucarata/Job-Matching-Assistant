import { MISSING_GEMINI_KEY } from "@/ai/gemini"
import type { FieldChain } from "@/ai/load-chain"
import { createLoadChain } from "@/ai/load-chain"
import { LoadStepError, UNUSABLE_PROFILE } from "@/profile/load-errors"
import { createLoadPipeline } from "@/profile/load-pipeline"
import type { CvLoader } from "@/profile/types"

function failureMessage(error: unknown): string {
  let current: unknown = error
  while (current instanceof Error) {
    if (current instanceof LoadStepError) return current.message
    if (current.cause === undefined) break
    current = current.cause
  }
  return UNUSABLE_PROFILE
}

export function createCvLoader(
  createChain: (apiKey: string) => FieldChain = createLoadChain,
  extractText?: (file: File) => Promise<string>,
): CvLoader {
  return async (file, apiKey, onProgress) => {
    const key = apiKey.trim()
    if (!key) return { ok: false, message: MISSING_GEMINI_KEY }

    try {
      const pipeline = createLoadPipeline({
        apiKey: key,
        createChain,
        extractText,
        onProgress,
      })
      const profile = await pipeline.invoke(file)
      return { ok: true, profile }
    } catch (error) {
      return { ok: false, message: failureMessage(error) }
    }
  }
}

export const defaultLoadCv: CvLoader = createCvLoader()
