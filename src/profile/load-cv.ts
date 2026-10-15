import { MISSING_GEMINI_KEY } from "@/ai/gemini"
import { createLoadChain } from "@/ai/load-chain"
import type { CvLoader } from "./types"

const LOAD_NOT_READY = "La carga del CV todavía no está disponible."

type LoadChain = ReturnType<typeof createLoadChain>

/**
 * La cadena de carga se arma con la clave de Gemini.
 * La extracción del PDF todavía no la invoca.
 */
export function createCvLoader(
  createChain: (apiKey: string) => LoadChain = createLoadChain,
): CvLoader {
  return async (_file, apiKey) => {
    const key = apiKey.trim()
    if (!key) {
      return { ok: false, message: MISSING_GEMINI_KEY }
    }
    createChain(key)
    return { ok: false, message: LOAD_NOT_READY }
  }
}

export const defaultLoadCv: CvLoader = createCvLoader()
