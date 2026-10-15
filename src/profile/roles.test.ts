import { describe, expect, it } from "vitest"
import { filterProposedRoles, type ProposedRole } from "@/profile/roles"

function role(overrides: Partial<ProposedRole> = {}): ProposedRole {
  return {
    role: "Full Stack",
    experience_years: 2,
    experience_months: 0,
    reliability: 0.95,
    evidence: "Full Stack",
    ...overrides,
  }
}

describe("corte de roles", () => {
  it("conserva fiabilidad 0.7 cuando la frase está en el texto", () => {
    const kept = filterProposedRoles([role({ reliability: 0.7 })], "Full Stack durante dos años")
    expect(kept).toEqual([role({ reliability: 0.7 })])
  })

  it("descarta fiabilidad 0.3", () => {
    const kept = filterProposedRoles(
      [role({ role: "Arquitecto", reliability: 0.3, evidence: "arquitectura" })],
      "tareas de arquitectura",
    )
    expect(kept).toEqual([])
  })

  it("descarta fiabilidad fuera de 0 a 1", () => {
    const kept = filterProposedRoles(
      [role({ reliability: 1.2 }), role({ reliability: -0.1 })],
      "Full Stack",
    )
    expect(kept).toEqual([])
  })

  it("descarta fiabilidad 0.95 si la frase no está en el texto", () => {
    const kept = filterProposedRoles([role({ reliability: 0.95, evidence: "frase ausente" })], "otro texto")
    expect(kept).toEqual([])
  })

  it("conserva la misma frase cuando solo cambian los espacios", () => {
    const kept = filterProposedRoles(
      [role({ evidence: "Full   Stack   durante dos años" })],
      "Full Stack durante   dos años",
    )
    expect(kept).toEqual([role({ evidence: "Full   Stack   durante dos años" })])
  })

  it("un ítem incompleto no aborta el resto", () => {
    const incomplete = { role: "Arquitecto", reliability: 0.9 }
    const backend = role({ role: "Backend", evidence: "Backend" })
    const kept = filterProposedRoles([incomplete, backend], "Backend y frontend")
    expect(kept).toEqual([backend])
  })

  it("descarta años o meses que el redondeo no acepta y sigue con el resto", () => {
    const invalid = role({ experience_months: 12, evidence: "meses inválidos" })
    const valid = role({ role: "Frontend", evidence: "Frontend" })
    const kept = filterProposedRoles([invalid, valid], "meses inválidos y Frontend")
    expect(kept).toEqual([valid])
  })
})
