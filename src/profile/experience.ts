import { LoadStepError, UNUSABLE_PROFILE } from "@/profile/load-errors"

export function roundExperienceTime(years: number | null, months: number | null): number | null {
  if (years === null && months === null) return null
  if (years === null || !Number.isFinite(years) || years < 0) {
    throw new LoadStepError(UNUSABLE_PROFILE)
  }
  if (months === null) return Math.round(years * 10) / 10
  if (!Number.isInteger(months) || months < 0 || months > 11) {
    throw new LoadStepError(UNUSABLE_PROFILE)
  }
  const wholeYears = Math.trunc(years)
  return months >= 6 ? wholeYears + 1 : wholeYears
}
