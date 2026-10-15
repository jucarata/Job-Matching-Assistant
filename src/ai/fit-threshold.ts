export const FIT_THRESHOLD_STORAGE = "fitThreshold"
export const DEFAULT_FIT_THRESHOLD = 7

export const FIT_GRID = Array.from({ length: 21 }, (_, step) => step / 2)

export function isGridScore(value: number): boolean {
  if (!Number.isFinite(value)) return false
  const steps = value * 2
  return Math.abs(steps - Math.round(steps)) < 1e-9 && steps >= -1e-9 && steps <= 20 + 1e-9
}

function storedThreshold(raw: string | null): number | null {
  if (raw === null || !/^\d+(?:\.\d+)?$/.test(raw)) return null
  const value = Number(raw)
  return isGridScore(value) ? value : null
}

export function readFitThreshold(): number {
  try {
    const value = storedThreshold(localStorage.getItem(FIT_THRESHOLD_STORAGE))
    if (value === null) {
      localStorage.setItem(FIT_THRESHOLD_STORAGE, String(DEFAULT_FIT_THRESHOLD))
      return DEFAULT_FIT_THRESHOLD
    }
    return value
  } catch {
    return DEFAULT_FIT_THRESHOLD
  }
}

export function writeFitThreshold(value: number): void {
  const next = isGridScore(value) ? value : DEFAULT_FIT_THRESHOLD
  localStorage.setItem(FIT_THRESHOLD_STORAGE, String(next))
}

export function fitDecision(score: number, threshold: number): "Postular" | "No postular" {
  return score >= threshold ? "Postular" : "No postular"
}
