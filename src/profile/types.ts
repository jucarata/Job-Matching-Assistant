export type ProfileLanguage = {
  language: string
  level: string
}

export type ProfileRole = {
  role: string
  experience_time: number | null
  reliability: number
  evidence: string
}

export type Profile = {
  tech_skills: string[]
  soft_skills: string[]
  languages: ProfileLanguage[]
  roles: ProfileRole[]
  education: string[]
  flat_text: string
}

export type LoadResult =
  | { ok: true; profile: Profile }
  | { ok: false; message: string }

export type LoadProgress = {
  completed: number
  total: number
  label: string
  status: "active" | "done" | "error"
}

export type CvLoader = (
  file: File,
  apiKey: string,
  onProgress?: (progress: LoadProgress) => void,
) => Promise<LoadResult>
