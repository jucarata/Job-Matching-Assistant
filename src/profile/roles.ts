import { roundExperienceTime } from "@/profile/experience"

export type ProposedRole = {
  role: string
  experience_years: number | null
  experience_months: number | null
  reliability: number
  evidence: string
}

function collapseSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function isProposedRole(value: unknown): value is ProposedRole {
  if (!value || typeof value !== "object") return false
  const item = value as Record<string, unknown>
  if (typeof item.role !== "string" || item.role.trim() === "") return false
  if (typeof item.evidence !== "string" || item.evidence.trim() === "") return false
  if (!isNumber(item.reliability)) return false
  if (!("experience_years" in item) || !("experience_months" in item)) return false
  if (item.experience_years !== null && !isNumber(item.experience_years)) return false
  if (item.experience_months !== null && !isNumber(item.experience_months)) return false
  return true
}

function reliabilityAccepted(value: number): boolean {
  return value >= 0.7 && value <= 1
}

function evidenceInText(evidence: string, flatText: string): boolean {
  const phrase = collapseSpaces(evidence)
  if (!phrase) return false
  return collapseSpaces(flatText).includes(phrase)
}

export function filterProposedRoles(items: unknown[], flatText: string): ProposedRole[] {
  const kept: ProposedRole[] = []
  for (const item of items) {
    if (!isProposedRole(item)) continue
    if (!reliabilityAccepted(item.reliability)) continue
    if (!evidenceInText(item.evidence, flatText)) continue
    try {
      roundExperienceTime(item.experience_years, item.experience_months)
    } catch {
      continue
    }
    kept.push(item)
  }
  return kept
}
