import type { ProfileEducation } from "@/profile/types"

export type ExtractedEducation = {
  name: string
  issuer: string
  end_year: number | null
  end_month: number | null
  ongoing: boolean
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function isExtractedEducation(value: unknown): value is ExtractedEducation {
  if (!value || typeof value !== "object") return false
  const item = value as Record<string, unknown>
  if (typeof item.name !== "string" || typeof item.issuer !== "string") return false
  if (typeof item.ongoing !== "boolean") return false
  if (item.end_year !== null && !isFiniteNumber(item.end_year)) return false
  if (item.end_month !== null && !isFiniteNumber(item.end_month)) return false
  return true
}

function usableEnd(item: ExtractedEducation): { year: number; month: number | null } | null {
  const year = item.end_year
  const month = item.end_month
  if (month !== null) {
    if (year === null || !Number.isInteger(month) || month < 1 || month > 12) return null
    return { year, month }
  }
  if (year === null) return null
  return { year, month: null }
}

function statusFor(item: ExtractedEducation, today: Date): ProfileEducation["status"] {
  const end = usableEnd(item)
  if (!end) return item.ongoing ? "ACTUALMENTE" : null

  const todayYear = today.getFullYear()
  const todayMonth = today.getMonth() + 1
  if (end.month === null) {
    if (end.year < todayYear) return "FINALIZADO"
    if (end.year > todayYear) return "ACTUALMENTE"
    return null
  }
  if (end.year < todayYear || (end.year === todayYear && end.month < todayMonth)) return "FINALIZADO"
  if (end.year > todayYear || (end.year === todayYear && end.month > todayMonth)) return "ACTUALMENTE"
  return null
}

export function markEducation(items: unknown[], today: Date): ProfileEducation[] {
  const marked: ProfileEducation[] = []
  for (const item of items) {
    if (!isExtractedEducation(item)) continue
    const name = item.name.trim()
    if (name.length === 0) continue
    marked.push({
      name,
      issuer: item.issuer,
      status: statusFor(item, today),
    })
  }
  return marked
}
