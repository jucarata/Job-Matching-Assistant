import { describe, expect, it } from "vitest"
import { markEducation, type ExtractedEducation } from "@/profile/education"

const loadDay = new Date(2026, 9, 15)

function entry(overrides: Partial<ExtractedEducation> = {}): ExtractedEducation {
  return {
    name: "Ingeniero en Sistemas",
    issuer: "Universidad ICESI",
    end_year: null,
    end_month: null,
    ongoing: false,
    ...overrides,
  }
}

describe("marca de educación", () => {
  it("compara el año y el mes locales, y la fecha manda sobre ongoing", () => {
    const marked = markEducation(
      [
        entry({ end_year: 2026, end_month: 3 }),
        entry({ name: "Maestría", end_year: 2027, end_month: 3 }),
        entry({ name: "Técnico en Sistemas", issuer: "SENA", end_year: 2019 }),
        entry({ name: "Especialización", end_year: 2027 }),
        entry({ name: "Diplomado de octubre", end_year: 2026, end_month: 10 }),
        entry({ name: "Diplomado de este año", end_year: 2026 }),
        entry({ name: "Curso actual", ongoing: true }),
        entry({ name: "Curso suelto" }),
        entry({ name: "Marcado y fechado", end_year: 2026, end_month: 3, ongoing: true }),
      ],
      loadDay,
    )

    expect(marked).toEqual([
      { name: "Ingeniero en Sistemas", issuer: "Universidad ICESI", status: "FINALIZADO" },
      { name: "Maestría", issuer: "Universidad ICESI", status: "ACTUALMENTE" },
      { name: "Técnico en Sistemas", issuer: "SENA", status: "FINALIZADO" },
      { name: "Especialización", issuer: "Universidad ICESI", status: "ACTUALMENTE" },
      { name: "Diplomado de octubre", issuer: "Universidad ICESI", status: null },
      { name: "Diplomado de este año", issuer: "Universidad ICESI", status: null },
      { name: "Curso actual", issuer: "Universidad ICESI", status: "ACTUALMENTE" },
      { name: "Curso suelto", issuer: "Universidad ICESI", status: null },
      { name: "Marcado y fechado", issuer: "Universidad ICESI", status: "FINALIZADO" },
    ])
    expect(Object.keys(marked[0]).sort()).toEqual(["issuer", "name", "status"])
  })

  it("deja sin fecha un mes fuera de 1 a 12 o un mes sin año", () => {
    const marked = markEducation(
      [
        entry({ name: "Mes inválido", end_year: 2020, end_month: 13 }),
        entry({ name: "Mes sin año", end_year: null, end_month: 3, ongoing: true }),
      ],
      loadDay,
    )

    expect(marked).toEqual([
      { name: "Mes inválido", issuer: "Universidad ICESI", status: null },
      { name: "Mes sin año", issuer: "Universidad ICESI", status: "ACTUALMENTE" },
    ])
  })

  it("descarta el nombre vacío, conserva el emisor vacío y sigue con el resto", () => {
    const marked = markEducation(
      [
        entry({ name: "   ", end_year: 2019 }),
        { name: "Roto" },
        entry({ name: "Certificación", issuer: "", end_year: 2019 }),
      ],
      loadDay,
    )

    expect(marked).toEqual([{ name: "Certificación", issuer: "", status: "FINALIZADO" }])
  })
})
