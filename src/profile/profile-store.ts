import { LoadStepError, PROFILE_SAVE_FAILED } from "@/profile/load-errors"
import type { Profile, ProfileEducation, ProfileLanguage, ProfileRole } from "@/profile/types"

export const PROFILE_DB_NAME = "johai"
export const PROFILE_STORE_NAME = "profile"
const PROFILE_RECORD_KEY = "active"

function openProfileDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest
    try {
      request = indexedDB.open(PROFILE_DB_NAME, 1)
    } catch (error) {
      reject(error)
      return
    }

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(PROFILE_STORE_NAME)) {
        db.createObjectStore(PROFILE_STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error(PROFILE_SAVE_FAILED))
  })
}

function profileRecord(profile: Profile): Profile {
  return {
    tech_skills: [...profile.tech_skills],
    soft_skills: [...profile.soft_skills],
    languages: profile.languages.map((item) => ({
      language: item.language,
      level: item.level,
    })),
    roles: profile.roles.map((item) => ({
      role: item.role,
      experience_time: item.experience_time,
      reliability: item.reliability,
      evidence: item.evidence,
    })),
    education: profile.education.map((item) => ({
      name: item.name,
      issuer: item.issuer,
      status: item.status,
    })),
    flat_text: profile.flat_text,
  }
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
}

function isLanguage(value: unknown): value is ProfileLanguage {
  if (!value || typeof value !== "object") return false
  const item = value as ProfileLanguage
  return typeof item.language === "string" && typeof item.level === "string"
}

function isEducation(value: unknown): value is ProfileEducation {
  if (!value || typeof value !== "object") return false
  const item = value as ProfileEducation
  return (
    typeof item.name === "string" &&
    typeof item.issuer === "string" &&
    (item.status === null || item.status === "FINALIZADO" || item.status === "ACTUALMENTE")
  )
}

function isRole(value: unknown): value is ProfileRole {
  if (!value || typeof value !== "object") return false
  const item = value as ProfileRole
  return (
    typeof item.role === "string" &&
    (item.experience_time === null || typeof item.experience_time === "number") &&
    typeof item.reliability === "number" &&
    typeof item.evidence === "string"
  )
}

function asProfile(value: unknown): Profile | null {
  if (!value || typeof value !== "object") return null
  const record = value as Profile
  if (!isStringArray(record.tech_skills) || !isStringArray(record.soft_skills)) return null
  if (!Array.isArray(record.education) || !record.education.every(isEducation)) return null
  if (typeof record.flat_text !== "string") return null
  if (!Array.isArray(record.roles) || !record.roles.every(isRole)) return null
  if (!Array.isArray(record.languages) || !record.languages.every(isLanguage)) return null
  return profileRecord(record)
}

function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openProfileDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        let settled = false
        let ready = false
        let result: T | undefined

        const finish = (settle: () => void) => {
          if (settled) return
          settled = true
          db.close()
          settle()
        }
        const fail = (error: unknown) => finish(() => reject(error))

        const tx = db.transaction(PROFILE_STORE_NAME, mode)
        tx.oncomplete = () => {
          if (!ready) {
            fail(new Error(PROFILE_SAVE_FAILED))
            return
          }
          finish(() => resolve(result as T))
        }
        tx.onerror = (event) => {
          event.preventDefault()
          fail(tx.error ?? new Error(PROFILE_SAVE_FAILED))
        }
        tx.onabort = () => fail(tx.error ?? new Error(PROFILE_SAVE_FAILED))

        try {
          const request = run(tx.objectStore(PROFILE_STORE_NAME))
          request.onsuccess = () => {
            result = request.result
            ready = true
          }
          request.onerror = (event) => {
            event.preventDefault()
            fail(request.error ?? new Error(PROFILE_SAVE_FAILED))
          }
        } catch (error) {
          try {
            tx.abort()
          } catch {
            // The transaction can already be finished when the write throws.
          }
          fail(error)
        }
      }),
  )
}

export function readProfile(): Promise<Profile | null> {
  return withStore("readonly", (store) => store.get(PROFILE_RECORD_KEY))
    .then(asProfile)
    .catch(() => null)
}

export async function saveProfile(profile: Profile): Promise<void> {
  try {
    await withStore("readwrite", (store) => store.put(profileRecord(profile), PROFILE_RECORD_KEY))
  } catch (error) {
    if (error instanceof LoadStepError) throw error
    throw new LoadStepError(PROFILE_SAVE_FAILED)
  }
}

export async function readProfileStorage(): Promise<{ storeNames: string[]; records: unknown[] }> {
  const db = await openProfileDb()
  const storeNames = [...db.objectStoreNames]
  db.close()
  const records = await withStore("readonly", (store) => store.getAll())
  return { storeNames, records }
}
