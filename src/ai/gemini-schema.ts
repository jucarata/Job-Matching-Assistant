import { toJsonSchema } from "@langchain/core/utils/json_schema"
import type { z } from "zod"

const droppedKeys = new Set(["$schema", "$id", "additionalProperties", "strict"])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isNullSchema(value: unknown): boolean {
  return isRecord(value) && value.type === "null"
}

function collapseNullUnion(node: Record<string, unknown>): Record<string, unknown> {
  if (Array.isArray(node.anyOf)) {
    const branches = node.anyOf.filter((branch) => !isNullSchema(branch))
    const nullable = branches.length !== node.anyOf.length
    if (nullable && branches.length === 1 && isRecord(branches[0])) {
      const rest = { ...node }
      delete rest.anyOf
      return { ...rest, ...branches[0], nullable: true }
    }
  }

  if (Array.isArray(node.type)) {
    const types = node.type.filter((item) => item !== "null")
    const nullable = types.length !== node.type.length
    if (nullable && types.length === 1) {
      return { ...node, type: types[0], nullable: true }
    }
  }

  return node
}

function geminiSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(geminiSchema)
  if (!isRecord(value)) return value

  const collapsed = collapseNullUnion(value)
  const next: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(collapsed)) {
    if (droppedKeys.has(key)) continue
    next[key] = geminiSchema(child)
  }
  return next
}

export function toGeminiResponseSchema(schema: z.ZodType): Record<string, unknown> {
  const converted = geminiSchema(toJsonSchema(schema))
  if (!isRecord(converted)) throw new Error("El esquema de Gemini no es un objeto.")
  return converted
}
