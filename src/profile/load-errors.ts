export const NOT_A_PDF = "El archivo no es un PDF."
export const EMPTY_PDF = "El PDF no tiene texto."
export const PDF_READ_FAILED = "No se pudo extraer el texto del PDF."
export const PDF_STEP_TIMEOUT = "Se agotó el tiempo al extraer el texto del PDF."
export const MODEL_STEP_TIMEOUT = "Se agotó el tiempo al leer los datos con Gemini."
export const ROLE_STEP_TIMEOUT = "Se agotó el tiempo al proponer los roles."
export const EDUCATION_STEP_TIMEOUT = "Se agotó el tiempo al leer la educación."
export const GEMINI_UNAVAILABLE =
  "Gemini respondió 503 UNAVAILABLE: no hay capacidad para atender el modelo."
export const UNUSABLE_PROFILE = "No se pudo leer el estado del CV."
export const PROFILE_SAVE_FAILED = "No se pudo guardar el perfil."

export class LoadStepError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "LoadStepError"
  }
}
