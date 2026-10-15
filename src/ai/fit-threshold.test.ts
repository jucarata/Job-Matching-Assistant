import { afterEach, describe, expect, it } from "vitest"
import {
  DEFAULT_FIT_THRESHOLD,
  FIT_THRESHOLD_STORAGE,
  fitDecision,
  readFitThreshold,
  writeFitThreshold,
} from "@/ai/fit-threshold"

afterEach(() => {
  localStorage.removeItem(FIT_THRESHOLD_STORAGE)
})

describe("corte de postular", () => {
  it("guarda 7 cuando no hay corte", () => {
    localStorage.removeItem(FIT_THRESHOLD_STORAGE)
    expect(readFitThreshold()).toBe(DEFAULT_FIT_THRESHOLD)
    expect(localStorage.getItem(FIT_THRESHOLD_STORAGE)).toBe("7")
  })

  it("vuelve a 7 cuando el valor no está en la grilla", () => {
    localStorage.setItem(FIT_THRESHOLD_STORAGE, "7.3")
    expect(readFitThreshold()).toBe(7)
    expect(localStorage.getItem(FIT_THRESHOLD_STORAGE)).toBe("7")
  })

  it("conserva 6.5", () => {
    localStorage.setItem(FIT_THRESHOLD_STORAGE, "6.5")
    expect(readFitThreshold()).toBe(6.5)
    expect(localStorage.getItem(FIT_THRESHOLD_STORAGE)).toBe("6.5")
  })

  it("etiqueta Postular en el corte y por encima, y No postular por debajo", () => {
    expect(fitDecision(7, 7)).toBe("Postular")
    expect(fitDecision(6.5, 7)).toBe("No postular")
    expect(fitDecision(6.5, 6)).toBe("Postular")
    writeFitThreshold(6.5)
    expect(localStorage.getItem(FIT_THRESHOLD_STORAGE)).toBe("6.5")
  })
})
