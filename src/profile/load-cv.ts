import type { CvLoader } from "./types"

/**
 * Punto de enganche de la carga. job-fit-assistant lo sustituye
 * por la validación del PDF y el perfil guardado.
 * Mientras tanto, elegir un archivo no cambia el perfil.
 */
export const defaultLoadCv: CvLoader = async () => ({
  ok: false,
  message: "La carga del CV todavía no está disponible.",
})
