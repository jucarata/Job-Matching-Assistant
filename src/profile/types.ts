export type ProfileLanguage = {
  language: string
  level: string
}

export type Profile = {
  techSkills: string[]
  softSkills: string[]
  languages: ProfileLanguage[]
  experienceTime: number | null
  education: string[]
}

export type LoadResult =
  | { ok: true; profile: Profile }
  | { ok: false; message: string }

export type CvLoader = (file: File, apiKey: string) => Promise<LoadResult>
