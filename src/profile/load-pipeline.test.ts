import { describe, expect, it, vi } from "vitest"
import type { FieldChain } from "@/ai/load-chain"
import { roundExperienceTime } from "@/profile/experience"
import { EMPTY_PDF, GEMINI_UNAVAILABLE, NOT_A_PDF, PDF_READ_FAILED, PROFILE_SAVE_FAILED, UNUSABLE_PROFILE } from "@/profile/load-errors"
import { createCvLoader } from "@/profile/load-cv"
import { extractPdfText } from "@/profile/pdf-text"
import { readProfile, readProfileStorage } from "@/profile/profile-store"
import type { LoadProgress, Profile } from "@/profile/types"
import { GEMINI_MODEL } from "@/ai/gemini"

function escapePdf(text: string) {
  return text.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)")
}

function pdfBytes(text: string) {
  const stream = text ? `BT /F1 12 Tf 72 72 Td (${escapePdf(text)}) Tj ET` : ""
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ]
  let body = "%PDF-1.4\n"
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(body.length)
    body += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xrefStart = body.length
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (let index = 1; index < offsets.length; index += 1) {
    xref += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`
  }
  body += `${xref}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`
  return new TextEncoder().encode(body)
}

function pdfFile(text: string, name = "cv.pdf") {
  const bytes = pdfBytes(text)
  return new File([bytes], name, { type: "application/pdf" })
}

function extracted(years: number | null, months: number | null) {
  return {
    tech_skills: ["TypeScript"],
    soft_skills: ["Comunicación"],
    languages: [{ language: "Español", level: "nativo" }],
    education: ["Ingeniería"],
    experience_years: years,
    experience_months: months,
  }
}

function fakeChain(response: unknown | Error, calls: string[]): FieldChain {
  return {
    invoke: async (input) => {
      calls.push(input.text)
      if (response instanceof Error) throw response
      return response
    },
  }
}

describe("redondeo de experience_time", () => {
  it("deja 2 años y 3 meses en 2", () => {
    expect(roundExperienceTime(2, 3)).toBe(2)
  })

  it("sube 2 años y 6 meses a 3", () => {
    expect(roundExperienceTime(2, 6)).toBe(3)
  })

  it("conserva 1.5 años", () => {
    expect(roundExperienceTime(1.5, null)).toBe(1.5)
  })
})

describe("cadena de carga", () => {
  it("guarda el texto del PDF en flat_text y redondea la experiencia", async () => {
    const file = pdfFile("Ana estudia TypeScript")
    const extractedText = await extractPdfText(file)
    const calls: string[] = []
    const loadCv = createCvLoader(() => fakeChain(extracted(2, 3), calls))

    const result = await loadCv(file, "clave-de-prueba")

    expect(result).toEqual({
      ok: true,
      profile: {
        tech_skills: ["TypeScript"],
        soft_skills: ["Comunicación"],
        languages: [{ language: "Español", level: "nativo" }],
        education: ["Ingeniería"],
        experience_time: 2,
        flat_text: extractedText,
      },
    })
    expect(extractedText).toContain("Ana estudia TypeScript")
    expect(calls).toEqual([extractedText])
  })

  it("redondea 2 años y 6 meses a 3, y conserva 1.5", async () => {
    const file = pdfFile("experiencia")
    const sixMonths = createCvLoader(() => fakeChain(extracted(2, 6), []))
    const decimal = createCvLoader(() => fakeChain(extracted(1.5, null), []))

    const roundedUp = await sixMonths(file, "clave")
    const kept = await decimal(file, "clave")

    expect(roundedUp).toMatchObject({ ok: true, profile: { experience_time: 3 } })
    expect(kept).toMatchObject({ ok: true, profile: { experience_time: 1.5 } })
  })

  it("rechaza un archivo que no es PDF antes de extraer texto y sin llamar al modelo", async () => {
    const calls: string[] = []
    const extractText = vi.fn(async () => "no debe leerse")
    const loadCv = createCvLoader(() => fakeChain(extracted(1, null), calls), extractText)

    const result = await loadCv(new File(["hola"], "nota.txt", { type: "text/plain" }), "clave")

    expect(result).toEqual({ ok: false, message: NOT_A_PDF })
    expect(result).not.toHaveProperty("profile")
    expect(extractText).not.toHaveBeenCalled()
    expect(calls).toEqual([])
  })

  it("rechaza un PDF sin texto sin llamar al modelo", async () => {
    const calls: string[] = []
    const loadCv = createCvLoader(() => fakeChain(extracted(1, null), calls))

    const result = await loadCv(pdfFile(""), "clave")

    expect(result).toEqual({ ok: false, message: EMPTY_PDF })
    expect(result).not.toHaveProperty("profile")
    expect(calls).toEqual([])
  })

  it("no guarda profile si el modelo falla o devuelve un estado incompleto", async () => {
    const file = pdfFile("CV con texto")
    const failed = createCvLoader(() => fakeChain(new Error("fallo de red"), []))
    const incomplete = createCvLoader(() => fakeChain({ tech_skills: "TypeScript" }, []))

    expect(await failed(file, "clave")).toEqual({
      ok: false,
      message: `${UNUSABLE_PROFILE} fallo de red`,
    })
    expect(await incomplete(file, "clave")).toEqual({ ok: false, message: UNUSABLE_PROFILE })
    expect(await failed(file, "clave")).not.toHaveProperty("profile")
  })

  it("avisa los seis pasos y se detiene en el que falla", async () => {
    const steps: LoadProgress[] = []
    const succeeded = createCvLoader(
      () => fakeChain(extracted(1.5, null), []),
      async () => "texto del cv",
    )
    const file = new File(["cv"], "cv.pdf", { type: "application/pdf" })
    const ok = await succeeded(file, "clave", (progress) => steps.push(progress))

    expect(ok.ok).toBe(true)
    expect(steps.map((step) => step.completed)).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(steps.at(-1)).toMatchObject({ completed: 6, label: "CV listo", status: "done" })

    const failedSteps: LoadProgress[] = []
    const calls: string[] = []
    const failed = createCvLoader(
      () => fakeChain(extracted(1, null), calls),
      async () => "   ",
    )
    const stopped = await failed(file, "clave", (progress) => failedSteps.push(progress))

    expect(stopped).toEqual({ ok: false, message: EMPTY_PDF })
    expect(calls).toEqual([])
    expect(failedSteps.at(-1)).toMatchObject({ label: "Guardar el texto", status: "error" })
    expect(failedSteps.some((step) => step.label === "Leer los datos con Gemini")).toBe(false)
  })

  it("si Gemini responde 503, el paso 4 falla enseguida", async () => {
    const steps: LoadProgress[] = []
    const unavailable = Object.assign(new Error("[503 Service Unavailable]"), { status: 503 })
    const loadCv = createCvLoader(
      () => fakeChain(unavailable, []),
      async () => "texto del cv",
    )
    const file = new File(["cv"], "cv.pdf", { type: "application/pdf" })

    const result = await loadCv(file, "clave", (progress) => steps.push(progress))

    expect(result).toEqual({
      ok: false,
      message: `${GEMINI_UNAVAILABLE} (${GEMINI_MODEL})`,
    })
    expect(result).not.toHaveProperty("profile")
    expect(steps.at(-1)).toMatchObject({
      label: "Leer los datos con Gemini",
      status: "error",
    })
  })

  it("no llama al modelo si el PDF no se puede leer", async () => {
    const calls: string[] = []
    const loadCv = createCvLoader(() => fakeChain(extracted(1, null), calls))
    const file = new File(["no es un pdf"], "cv.pdf", { type: "application/pdf" })

    const result = await loadCv(file, "clave")

    expect(result).toEqual({ ok: false, message: PDF_READ_FAILED })
    expect(calls).toEqual([])
  })
})

const storedProfileFields = [
  "education",
  "experience_time",
  "flat_text",
  "languages",
  "soft_skills",
  "tech_skills",
]

function storedProfile(flatText: string, experience: number): Profile {
  return {
    tech_skills: ["TypeScript"],
    soft_skills: ["Comunicación"],
    languages: [{ language: "Español", level: "nativo" }],
    education: ["Ingeniería"],
    experience_time: experience,
    flat_text: flatText,
  }
}

describe("perfil guardado", () => {
  it("guarda un solo profile, lo reemplaza y no deja chunks ni embeddings", async () => {
    const file = new File(["cv"], "cv.pdf", { type: "application/pdf" })
    const first = createCvLoader(() => fakeChain(extracted(2, 3), []), async () => "texto uno")
    const second = createCvLoader(() => fakeChain(extracted(1.5, null), []), async () => "texto dos")

    const saved = await first(file, "clave")
    const created = await readProfileStorage()

    expect(saved).toMatchObject({ ok: true, profile: storedProfile("texto uno", 2) })
    expect(created.storeNames).toEqual(["profile"])
    expect(created.records).toEqual([storedProfile("texto uno", 2)])
    expect(Object.keys(created.records[0] as Profile).sort()).toEqual(storedProfileFields)
    expect(created.records[0]).not.toHaveProperty("embedding")
    expect(created.records[0]).not.toHaveProperty("chunks")

    const replaced = await second(file, "clave")
    const after = await readProfileStorage()

    expect(replaced).toMatchObject({ ok: true, profile: storedProfile("texto dos", 1.5) })
    expect(after.storeNames).toEqual(["profile"])
    expect(after.records).toEqual([storedProfile("texto dos", 1.5)])
    expect(await readProfile()).toEqual(storedProfile("texto dos", 1.5))
  })

  it("si la escritura falla conserva el perfil anterior y no informa éxito", async () => {
    const file = new File(["cv"], "cv.pdf", { type: "application/pdf" })
    const first = createCvLoader(() => fakeChain(extracted(2, 3), []), async () => "texto uno")
    await first(file, "clave")
    const previous = await readProfile()

    const put = vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(() => {
      throw new DOMException("QuotaExceededError")
    })
    try {
      const steps: LoadProgress[] = []
      const second = createCvLoader(() => fakeChain(extracted(1, null), []), async () => "texto dos")
      const result = await second(file, "clave", (progress) => steps.push(progress))

      expect(result).toEqual({ ok: false, message: PROFILE_SAVE_FAILED })
      expect(result).not.toHaveProperty("profile")
      expect(steps.at(-1)).toMatchObject({ label: "Armar el perfil", status: "error" })
      expect(steps.some((step) => step.label === "CV listo")).toBe(false)
    } finally {
      put.mockRestore()
    }

    expect(await readProfile()).toEqual(previous)
    expect(await readProfileStorage()).toMatchObject({
      storeNames: ["profile"],
      records: [previous],
    })
  })

  it("una carga rechazada no borra el profile ya guardado", async () => {
    const file = new File(["cv"], "cv.pdf", { type: "application/pdf" })
    const loadCv = createCvLoader(() => fakeChain(extracted(2, 3), []), async () => "texto uno")
    await loadCv(file, "clave")

    const rejected = await loadCv(new File(["hola"], "nota.txt", { type: "text/plain" }), "clave")

    expect(rejected).toEqual({ ok: false, message: NOT_A_PDF })
    expect(await readProfile()).toEqual(storedProfile("texto uno", 2))
  })
})
