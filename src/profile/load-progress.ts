export const LOAD_STEP_LABELS = [
  "Validar el PDF",
  "Extraer el texto",
  "Guardar el texto",
  "Leer los datos con Gemini",
  "Proponer los roles",
  "Redondear la experiencia",
  "Armar el perfil",
] as const

export const LOAD_READY_LABEL = "CV listo"

export const PDF_STEP_TIMEOUT_MS = 30_000
export const MODEL_STEP_TIMEOUT_MS = 90_000
