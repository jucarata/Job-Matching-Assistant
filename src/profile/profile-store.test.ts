import { describe, expect, it } from "vitest"
import { PROFILE_DB_NAME, PROFILE_STORE_NAME, readProfile, readProfileStorage } from "@/profile/profile-store"
import type { Profile } from "@/profile/types"

const legacyProfile = {
  tech_skills: ["TypeScript"],
  soft_skills: ["Comunicación"],
  languages: [{ language: "Español", level: "nativo" }],
  education: ["Ingeniería"],
  experience_time: 4,
  flat_text: "perfil viejo",
}

const currentProfile: Profile = {
  tech_skills: ["TypeScript"],
  soft_skills: ["Comunicación"],
  languages: [{ language: "Español", level: "nativo" }],
  education: ["Ingeniería"],
  roles: [{ role: "Full Stack", experience_time: 2, reliability: 0.95, evidence: "frase" }],
  flat_text: "perfil nuevo",
}

function putRecord(record: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PROFILE_DB_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(PROFILE_STORE_NAME)) {
        request.result.createObjectStore(PROFILE_STORE_NAME)
      }
    }
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      const tx = db.transaction(PROFILE_STORE_NAME, "readwrite")
      tx.objectStore(PROFILE_STORE_NAME).put(record, "active")
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => {
        db.close()
        reject(tx.error)
      }
    }
  })
}

describe("perfil ya guardado", () => {
  it("ignora experience_time numérico sin roles y no borra la base", async () => {
    await putRecord(legacyProfile)

    expect(await readProfile()).toBeNull()
    const stored = await readProfileStorage()
    expect(stored.storeNames).toEqual(["profile"])
    expect(stored.records).toEqual([legacyProfile])

    await putRecord(currentProfile)

    expect(await readProfile()).toEqual(currentProfile)
  })
})
