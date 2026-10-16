import { describe, expect, it } from "vitest"
import { createEducationChain, extractedEducationListSchema } from "@/ai/education-chain"
import { toGeminiResponseSchema } from "@/ai/gemini-schema"
import { createLoadChain, extractedFieldsSchema } from "@/ai/load-chain"
import { createRoleChain, proposedRolesSchema } from "@/ai/role-chain"
import { createVerdictChain, verdictSchema } from "@/ai/verdict-chain"

function findResponseSchema(runnable: unknown): unknown {
  if (!runnable || typeof runnable !== "object") return undefined
  const record = runnable as {
    config?: { responseSchema?: unknown }
    bound?: unknown
    steps?: unknown[]
  }
  if (record.config && "responseSchema" in record.config) return record.config.responseSchema
  if (record.bound) {
    const found = findResponseSchema(record.bound)
    if (found) return found
  }
  if (Array.isArray(record.steps)) {
    for (const step of record.steps) {
      const found = findResponseSchema(step)
      if (found) return found
    }
  }
  return undefined
}

function expectAcceptedSchema(schema: unknown) {
  const json = JSON.stringify(schema)
  expect(json).not.toMatch(/"type":\[/)
  expect(json).not.toContain('"anyOf"')
  expect(json).not.toContain('"additionalProperties"')
}

describe("esquema de Gemini", () => {
  it("deja los nulos de educación como nullable", () => {
    const schema = toGeminiResponseSchema(extractedEducationListSchema)
    expect(schema).toMatchObject({
      type: "array",
      items: {
        type: "object",
        properties: {
          end_year: { type: "number", nullable: true },
          end_month: { type: "number", nullable: true },
          ongoing: { type: "boolean" },
        },
      },
    })
    expectAcceptedSchema(schema)
  })

  it("deja los nulos de roles como nullable y conserva los límites", () => {
    const schema = toGeminiResponseSchema(proposedRolesSchema)
    expect(schema).toMatchObject({
      items: {
        properties: {
          experience_years: { type: "number", minimum: 0, nullable: true },
          experience_months: { type: "integer", minimum: 0, maximum: 11, nullable: true },
          reliability: { type: "number", minimum: 0, maximum: 1 },
        },
      },
    })
    expectAcceptedSchema(schema)
  })

  it("conserva el enum de idiomas", () => {
    const schema = toGeminiResponseSchema(extractedFieldsSchema)
    expect(schema).toMatchObject({
      properties: {
        languages: {
          items: {
            properties: {
              level: { type: "string", enum: ["básico", "intermedio", "avanzado", "nativo"] },
            },
          },
        },
      },
    })
    expectAcceptedSchema(schema)
  })

  it("envía a Gemini el esquema ya convertido", () => {
    const chains = [
      [createLoadChain("clave"), extractedFieldsSchema],
      [createRoleChain("clave"), proposedRolesSchema],
      [createEducationChain("clave"), extractedEducationListSchema],
      [createVerdictChain("clave"), verdictSchema],
    ] as const

    for (const [chain, schema] of chains) {
      const sent = findResponseSchema(chain)
      expect(sent).toEqual(toGeminiResponseSchema(schema))
      expectAcceptedSchema(sent)
    }
  })
})
