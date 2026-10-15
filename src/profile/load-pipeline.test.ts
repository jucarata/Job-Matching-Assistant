import { describe, expect, it, vi } from "vitest"
import { ChatPromptTemplate } from "@langchain/core/prompts"
import { RunnableSequence } from "@langchain/core/runnables"
import { createLoadChain, extractedFieldsSchema, type FieldChain } from "@/ai/load-chain"
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

function extracted() {
  return {
    tech_skills: ["TypeScript"],
    soft_skills: ["Comunicación"],
    languages: [{ language: "Español", level: "nativo" }],
    education: ["Ingeniería"],
  }
}

function proposed(
  role: string,
  years: number | null,
  months: number | null,
  reliability: number,
  evidence: string,
) {
  return {
    role,
    experience_years: years,
    experience_months: months,
    reliability,
    evidence,
  }
}

function loadWith(
  fields: unknown | Error,
  roles: unknown | Error,
  extractText?: (file: File) => Promise<string>,
) {
  const fieldCalls: string[] = []
  const roleCalls: string[] = []
  const loadCv = createCvLoader(
    () => fakeChain(fields, fieldCalls),
    extractText,
    () => fakeChain(roles, roleCalls),
  )
  return { loadCv, fieldCalls, roleCalls }
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
  it("la primera cadena ya no pide la experiencia", async () => {
    const chain = createLoadChain("clave")
    expect(chain).toBeInstanceOf(RunnableSequence)
    const prompt = chain.steps[0]
    expect(prompt).toBeInstanceOf(ChatPromptTemplate)
    const messages = await prompt.formatMessages({ text: "cv" })
    const system = String(messages[0].content)
    expect(system).not.toContain("experience_years")
    expect(system).not.toContain("experience_months")
    expect(extractedFieldsSchema.safeParse(extracted()).success).toBe(true)
  })

  it("guarda el texto del PDF en flat_text y redondea la experiencia", async () => {
    const file = pdfFile("Ana estudia TypeScript")
    const extractedText = await extractPdfText(file)
    const { loadCv, fieldCalls, roleCalls } = loadWith(
      extracted(),
      [proposed("Full Stack", 2, 3, 0.95, "Ana estudia TypeScript")],
    )

    const result = await loadCv(file, "clave-de-prueba")

    expect(result).toEqual({
      ok: true,
      profile: {
        tech_skills: ["TypeScript"],
        soft_skills: ["Comunicación"],
        languages: [{ language: "Español", level: "nativo" }],
        education: ["Ingeniería"],
        roles: [
          {
            role: "Full Stack",
            experience_time: 2,
            reliability: 0.95,
            evidence: "Ana estudia TypeScript",
          },
        ],
        flat_text: extractedText,
      },
    })
    expect(extractedText).toContain("Ana estudia TypeScript")
    expect(fieldCalls).toEqual([extractedText])
    expect(roleCalls).toEqual([extractedText])
  })

  it("guarda Full Stack en 0.95 y descarta Arquitecto en 0.3 de la misma experiencia", async () => {
    const file = new File(["cv"], "cv.pdf", { type: "application/pdf" })
    const { loadCv } = loadWith(
      extracted(),
      [
        proposed("Full Stack", 2, 0, 0.95, "Full Stack"),
        proposed("Arquitecto", 2, 0, 0.3, "arquitectura"),
      ],
      async () => "Full Stack con tareas de arquitectura",
    )

    const result = await loadCv(file, "clave")

    expect(result).toMatchObject({
      ok: true,
      profile: {
        roles: [
          {
            role: "Full Stack",
            experience_time: 2,
            reliability: 0.95,
            evidence: "Full Stack",
          },
        ],
      },
    })
    expect(JSON.stringify(result)).not.toContain("Arquitecto")
  })

  it("redondea 1 año y 6 meses a 2, 1 año y 2 meses a 1, y conserva 1.5", async () => {
    const file = new File(["cv"], "cv.pdf", { type: "application/pdf" })
    const sixMonths = loadWith(
      extracted(),
      [proposed("Full Stack", 1, 6, 0.95, "texto")],
      async () => "texto",
    )
    const twoMonths = loadWith(
      extracted(),
      [proposed("Full Stack", 1, 2, 0.95, "texto")],
      async () => "texto",
    )
    const decimal = loadWith(
      extracted(),
      [proposed("Full Stack", 1.5, null, 0.95, "texto")],
      async () => "texto",
    )

    const roundedUp = await sixMonths.loadCv(file, "clave")
    const roundedDown = await twoMonths.loadCv(file, "clave")
    const kept = await decimal.loadCv(file, "clave")

    expect(roundedUp).toMatchObject({ ok: true, profile: { roles: [{ experience_time: 2 }] } })
    expect(roundedDown).toMatchObject({ ok: true, profile: { roles: [{ experience_time: 1 }] } })
    expect(kept).toMatchObject({ ok: true, profile: { roles: [{ experience_time: 1.5 }] } })
  })

  it("guarda el mismo nombre de dos experiencias como dos entradas", async () => {
    const file = new File(["cv"], "cv.pdf", { type: "application/pdf" })
    const { loadCv } = loadWith(
      extracted(),
      [
        proposed("Full Stack", 2, 0, 0.9, "primer Full Stack"),
        proposed("Full Stack", 1, 0, 0.8, "segundo Full Stack"),
      ],
      async () => "primer Full Stack y segundo Full Stack",
    )

    const result = await loadCv(file, "clave")

    expect(result).toMatchObject({
      ok: true,
      profile: {
        roles: [
          { role: "Full Stack", experience_time: 2, reliability: 0.9, evidence: "primer Full Stack" },
          { role: "Full Stack", experience_time: 1, reliability: 0.8, evidence: "segundo Full Stack" },
        ],
      },
    })
  })

  it("guarda roles vacío si la lista llega vacía o todos quedan bajo 0.7", async () => {
    const file = new File(["cv"], "cv.pdf", { type: "application/pdf" })
    const empty = loadWith(extracted(), [], async () => "texto")
    const weak = loadWith(
      extracted(),
      [proposed("Full Stack", 2, 0, 0.3, "texto"), proposed("Backend", 2, 0, 0.6, "texto")],
      async () => "texto",
    )

    const none = await empty.loadCv(file, "clave")
    const discarded = await weak.loadCv(file, "clave")

    expect(none).toMatchObject({ ok: true, profile: { roles: [] } })
    expect(discarded).toMatchObject({ ok: true, profile: { roles: [] } })
  })

  it("rechaza un archivo que no es PDF antes de extraer texto y sin llamar al modelo", async () => {
    const calls: string[] = []
    const extractText = vi.fn(async () => "no debe leerse")
    const loadCv = createCvLoader(() => fakeChain(extracted(), calls), extractText)

    const result = await loadCv(new File(["hola"], "nota.txt", { type: "text/plain" }), "clave")

    expect(result).toEqual({ ok: false, message: NOT_A_PDF })
    expect(result).not.toHaveProperty("profile")
    expect(extractText).not.toHaveBeenCalled()
    expect(calls).toEqual([])
  })

  it("rechaza un PDF sin texto sin llamar al modelo", async () => {
    const calls: string[] = []
    const loadCv = createCvLoader(() => fakeChain(extracted(), calls))

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

  it("avisa los siete pasos y marca Proponer los roles", async () => {
    const steps: LoadProgress[] = []
    const succeeded = createCvLoader(
      () => fakeChain(extracted(), []),
      async () => "texto del cv",
      () => fakeChain([proposed("Full Stack", 1.5, null, 0.95, "texto")], []),
    )
    const file = new File(["cv"], "cv.pdf", { type: "application/pdf" })
    const ok = await succeeded(file, "clave", (progress) => steps.push(progress))

    expect(ok.ok).toBe(true)
    expect(steps.map((step) => step.label)).toEqual([
      "Validar el PDF",
      "Extraer el texto",
      "Guardar el texto",
      "Leer los datos con Gemini",
      "Proponer los roles",
      "Redondear la experiencia",
      "Armar el perfil",
      "CV listo",
    ])
    expect(steps.map((step) => step.completed)).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
    expect(steps.at(-1)).toMatchObject({ completed: 7, label: "CV listo", status: "done" })
    expect(steps[4]).toMatchObject({ label: "Proponer los roles", status: "active", total: 7 })

    const failedSteps: LoadProgress[] = []
    const calls: string[] = []
    const failed = createCvLoader(
      () => fakeChain(extracted(), calls),
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
    const loadCv = createCvLoader(() => fakeChain(extracted(), calls))
    const file = new File(["no es un pdf"], "cv.pdf", { type: "application/pdf" })

    const result = await loadCv(file, "clave")

    expect(result).toEqual({ ok: false, message: PDF_READ_FAILED })
    expect(calls).toEqual([])
  })
})

const storedProfileFields = [
  "education",
  "flat_text",
  "languages",
  "roles",
  "soft_skills",
  "tech_skills",
]

function storedProfile(flatText: string, experience: number): Profile {
  return {
    tech_skills: ["TypeScript"],
    soft_skills: ["Comunicación"],
    languages: [{ language: "Español", level: "nativo" }],
    education: ["Ingeniería"],
    roles: [
      {
        role: "Full Stack",
        experience_time: experience,
        reliability: 0.95,
        evidence: "texto",
      },
    ],
    flat_text: flatText,
  }
}

function loaderWithExperience(
  years: number | null,
  months: number | null,
  extractText: (file: File) => Promise<string>,
) {
  return createCvLoader(
    () => fakeChain(extracted(), []),
    extractText,
    () => fakeChain([proposed("Full Stack", years, months, 0.95, "texto")], []),
  )
}

describe("perfil guardado", () => {
  it("guarda un solo profile, lo reemplaza y no deja chunks ni embeddings", async () => {
    const file = new File(["cv"], "cv.pdf", { type: "application/pdf" })
    const first = loaderWithExperience(2, 3, async () => "texto uno")
    const second = loaderWithExperience(1.5, null, async () => "texto dos")

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
    const first = loaderWithExperience(2, 3, async () => "texto uno")
    await first(file, "clave")
    const previous = await readProfile()

    const put = vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(() => {
      throw new DOMException("QuotaExceededError")
    })
    try {
      const steps: LoadProgress[] = []
      const second = loaderWithExperience(1, null, async () => "texto dos")
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

  it("si los roles fallan o no son una lista, no escribe el perfil nuevo", async () => {
    const file = new File(["cv"], "cv.pdf", { type: "application/pdf" })
    const first = loaderWithExperience(2, 3, async () => "texto uno")
    await first(file, "clave")
    const previous = await readProfile()

    const failed = loadWith(extracted(), new Error("fallo de roles"), async () => "texto dos")
    const broken = await failed.loadCv(file, "clave")

    expect(broken.ok).toBe(false)
    expect(broken).not.toHaveProperty("profile")
    expect(await readProfile()).toEqual(previous)

    const notAList = loadWith(extracted(), { role: "Full Stack" }, async () => "texto tres")
    const rejected = await notAList.loadCv(file, "clave")

    expect(rejected).toEqual({ ok: false, message: UNUSABLE_PROFILE })
    expect(await readProfile()).toEqual(previous)
    expect(await readProfileStorage()).toMatchObject({
      storeNames: ["profile"],
      records: [previous],
    })
  })

  it("una carga rechazada no borra el profile ya guardado", async () => {
    const file = new File(["cv"], "cv.pdf", { type: "application/pdf" })
    const loadCv = loaderWithExperience(2, 3, async () => "texto uno")
    await loadCv(file, "clave")

    const rejected = await loadCv(new File(["hola"], "nota.txt", { type: "text/plain" }), "clave")

    expect(rejected).toEqual({ ok: false, message: NOT_A_PDF })
    expect(await readProfile()).toEqual(storedProfile("texto uno", 2))
  })
})
