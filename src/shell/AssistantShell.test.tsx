import { act, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import css from "../index.css?raw"
import { toast } from "sonner"
import { requestVerdict as runVerdict } from "@/ai/verdict-chain"
import { createCvLoader } from "@/profile/load-cv"
import { saveProfile } from "@/profile/profile-store"
import { AssistantShell } from "@/shell/AssistantShell"
import type { Verdict } from "@/ai/verdict-chain"
import type { CvLoader, LoadProgress, LoadResult, Profile } from "@/profile/types"

const profileA: Profile = {
  tech_skills: ["React"],
  soft_skills: ["Comunicación"],
  languages: [{ language: "Español", level: "nativo" }],
  roles: [{ role: "Full Stack", experience_time: 3, reliability: 0.95, evidence: "CV de React" }],
  education: ["Ingeniería"],
  flat_text: "CV de React",
}

const profileB: Profile = {
  tech_skills: ["Golang"],
  soft_skills: ["Mentoría"],
  languages: [{ language: "Inglés", level: "avanzado" }],
  roles: [{ role: "Backend", experience_time: 1.5, reliability: 0.9, evidence: "CV de Golang" }],
  education: ["Maestría"],
  flat_text: "CV de Golang",
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function renderShell() {
  localStorage.removeItem("geminiApiKey")
  localStorage.removeItem("fitThreshold")
  const calls: Array<ReturnType<typeof deferred<LoadResult>>> = []
  const loadCv: CvLoader = () => {
    const pending = deferred<LoadResult>()
    calls.push(pending)
    return pending.promise
  }
  const user = userEvent.setup()
  const view = render(<AssistantShell loadCv={loadCv} />)
  return { calls, user, unmount: view.unmount }
}

function fileInput() {
  const input = document.querySelector('input[type="file"]')
  if (!(input instanceof HTMLInputElement)) throw new Error("Falta el input de archivo")
  return input
}

async function chooseFile(
  user: ReturnType<typeof userEvent.setup>,
  options?: { key?: boolean },
) {
  if (options?.key !== false) {
    const field = screen.getByLabelText("Clave de Gemini")
    if (field instanceof HTMLInputElement && field.value === "") {
      await user.type(field, "clave-de-prueba")
    }
  }
  const file = new File(["cv"], "cv.pdf", { type: "application/pdf" })
  await act(async () => {
    await user.upload(fileInput(), file)
  })
}

async function finishLoad(
  pending: ReturnType<typeof deferred<LoadResult>>,
  result: LoadResult,
) {
  await act(async () => {
    pending.resolve(result)
  })
}

afterEach(() => {
  localStorage.removeItem("geminiApiKey")
  localStorage.removeItem("fitThreshold")
  toast.dismiss()
  vi.restoreAllMocks()
})

async function expectLoadedNotice(count: number) {
  await screen.findAllByText("CV cargado.")
  expect(document.querySelectorAll("[data-sonner-toast]")).toHaveLength(count)
}

describe("pantalla sin perfil", () => {
  it("Pantalla inicial: muestra conversación, perfil y ajustes", () => {
    renderShell()
    expect(screen.getByRole("region", { name: "Conversación" })).toBeInTheDocument()
    expect(screen.getByRole("region", { name: "Perfil" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Ajustes" })).toBeInTheDocument()
  })

  it("Ventana estrecha: la conversación queda encima del perfil bajo 768 px", () => {
    renderShell()
    const main = screen.getByRole("main")
    expect(main.className).toContain("flex-col")
    expect(main.className).toContain("md:flex-row")
    const conversation = screen.getByRole("region", { name: "Conversación" })
    const profile = screen.getByRole("region", { name: "Perfil" })
    expect(conversation.compareDocumentPosition(profile) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("Sin perfil: la conversación se ve y no acepta texto ni envío", () => {
    renderShell()
    expect(screen.getByRole("region", { name: "Conversación" })).toBeVisible()
    expect(screen.getByLabelText("Mensaje")).toBeDisabled()
    expect(screen.queryByRole("button", { name: "Enviar" })).not.toBeInTheDocument()
  })

  it("Aviso de conversación cerrada", () => {
    renderShell()
    expect(
      screen.getByText("La conversación se abre cuando hay un perfil."),
    ).toBeInTheDocument()
  })

  it("Sin perfil: la única acción primaria es Cargar CV y abre el archivo", async () => {
    const { user } = renderShell()
    const key = screen.getByLabelText("Clave de Gemini")
    const load = screen.getByRole("button", { name: "Cargar CV" })
    expect(key).toHaveAttribute("type", "password")
    expect(key).not.toHaveAttribute("data-primary")
    expect(key.parentElement?.parentElement).toContainElement(load)

    const primary = document.querySelectorAll("[data-primary='true']")
    expect(primary).toHaveLength(1)
    expect(primary[0]).toHaveAccessibleName("Cargar CV")

    const input = fileInput()
    const click = vi.spyOn(input, "click")
    await user.click(load)
    expect(click).toHaveBeenCalled()
  })

  it("Sin clave: no carga el perfil y el error queda junto a Cargar CV", async () => {
    const { calls, user } = renderShell()
    await chooseFile(user, { key: false })

    expect(calls).toHaveLength(0)
    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("Falta la clave de Gemini.")
    const profile = screen.getByRole("region", { name: "Perfil" })
    expect(profile.contains(alert)).toBe(true)
    expect(profile.contains(screen.getByRole("button", { name: "Cargar CV" }))).toBe(true)
    expect(screen.queryByRole("region", { name: "Estado del perfil" })).not.toBeInTheDocument()
  })

  it("la barra avanza con los pasos y el error deja el botón otra vez usable", async () => {
    const { calls, user } = renderShell()
    await chooseFile(user)

    expect(screen.getByRole("button", { name: "Cargando CV…" })).toBeDisabled()
    const bar = screen.getByRole("progressbar")
    expect(bar).toHaveAttribute("aria-valuemin", "0")
    expect(bar).toHaveAttribute("aria-valuemax", "7")
    expect(bar).toHaveAttribute("aria-valuenow", "0")
    expect(bar).toHaveAttribute("aria-valuetext", "Validar el PDF")
    expect(screen.getByRole("list", { name: "Pasos de la carga" })).toBeInTheDocument()
    expect(screen.getByText("Cargando el CV")).toBeInTheDocument()

    await finishLoad(calls[0], { ok: false, message: "El PDF no tiene texto." })

    expect(await screen.findByRole("alert")).toHaveTextContent("El PDF no tiene texto.")
    expect(screen.getByRole("button", { name: "Cargar CV" })).toBeEnabled()
    expect(screen.getByText("La carga se detuvo")).toBeInTheDocument()
    expect(screen.queryByRole("region", { name: "Estado del perfil" })).not.toBeInTheDocument()
  })

  it("completa la barra cuando la carga termina bien", async () => {
    localStorage.removeItem("geminiApiKey")
    let report: ((progress: LoadProgress) => void) | undefined
    const pending = deferred<LoadResult>()
    const loadCv: CvLoader = (_file, _key, onProgress) => {
      report = onProgress
      return pending.promise
    }
    const user = userEvent.setup()
    render(<AssistantShell loadCv={loadCv} />)
    await user.type(screen.getByLabelText("Clave de Gemini"), "clave-de-prueba")
    const file = new File(["cv"], "cv.pdf", { type: "application/pdf" })
    await act(async () => {
      await user.upload(fileInput(), file)
    })

    await act(async () => {
      report?.({
        completed: 3,
        total: 7,
        label: "Leer los datos con Gemini",
        status: "active",
      })
    })
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "3")
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "Leer los datos con Gemini")

    await finishLoad(pending, { ok: true, profile: profileA })

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "7")
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "CV listo")
    expect(screen.getByText("React")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Reemplazar CV" })).toBeEnabled()
  })

  it("guarda la clave y la rellena al abrir la página", async () => {
    const { user, unmount } = renderShell()
    await user.type(screen.getByLabelText("Clave de Gemini"), "clave-guardada")
    expect(localStorage.getItem("geminiApiKey")).toBe("clave-guardada")

    unmount()
    render(<AssistantShell />)
    expect(screen.getByLabelText("Clave de Gemini")).toHaveValue("clave-guardada")
  })

  it("Zona vacía: el perfil no muestra un estado", () => {
    renderShell()
    expect(screen.queryByRole("region", { name: "Estado del perfil" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Reemplazar CV" })).not.toBeInTheDocument()
  })

  it("Control enfocado: etiqueta visible en español y foco visible", async () => {
    const { user } = renderShell()
    await user.tab()
    const ajustes = screen.getByRole("button", { name: "Ajustes" })
    expect(ajustes).toHaveFocus()
    expect(ajustes).toHaveTextContent("Ajustes")
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline:\s*2px\s+solid\s+var\(--teal\)/)
  })

  it("Abrir ajustes: el diálogo queda fuera de la conversación", async () => {
    const { user } = renderShell()
    await user.click(screen.getByRole("button", { name: "Ajustes" }))
    const dialog = await screen.findByRole("dialog", { name: "Ajustes" })
    const conversation = screen.getByRole("region", { name: "Conversación", hidden: true })
    expect(conversation.contains(dialog)).toBe(false)
    expect(screen.getByRole("button", { name: "Cerrar" })).toBeVisible()
    expect(within(dialog).queryByLabelText("Clave de Gemini")).not.toBeInTheDocument()
    expect(dialog.textContent?.toLowerCase()).not.toContain("project")
  })
})

describe("pantalla con perfil", () => {
  it("Perfil listo, perfil existente y perfil activo", async () => {
    const { calls, user } = renderShell()
    await chooseFile(user)
    await finishLoad(calls[0], { ok: true, profile: profileA })

    expect(await screen.findByRole("region", { name: "Estado del perfil" })).toBeInTheDocument()
    expect(screen.getByText("React")).toBeInTheDocument()
    expect(screen.getByLabelText("Mensaje")).toBeEnabled()

    const primary = document.querySelectorAll("[data-primary='true']")
    expect(primary).toHaveLength(1)
    expect(primary[0]).toHaveAccessibleName("Enviar")

    const message = screen.getByLabelText("Mensaje")
    const send = screen.getByRole("button", { name: "Enviar" })
    const composer = message.parentElement?.parentElement
    expect(composer).toContainElement(send)
    expect(composer).toHaveClass("flex", "items-center")
    expect(composer).not.toHaveClass("flex-col")

    const key = screen.getByLabelText("Clave de Gemini")
    const replace = screen.getByRole("button", { name: "Reemplazar CV" })
    expect(key).toBeVisible()
    expect(key).not.toHaveAttribute("data-primary")
    expect(key.parentElement?.parentElement).toContainElement(replace)
    expect(replace).not.toHaveAttribute("data-primary", "true")
    const click = vi.spyOn(fileInput(), "click")
    await user.click(replace)
    expect(click).toHaveBeenCalled()
  })

  it("con perfil la conversación está abierta antes de enviar", async () => {
    const { calls, user } = renderShell()
    await chooseFile(user)
    await finishLoad(calls[0], { ok: true, profile: profileA })
    expect(await screen.findByText("La conversación está abierta")).toBeInTheDocument()
  })

  it("Reemplazo en curso: Enviar inactivo y el perfil anterior sigue visible", async () => {
    const { calls, user } = renderShell()
    await chooseFile(user)
    await finishLoad(calls[0], { ok: true, profile: profileA })
    await screen.findByText("React")

    await chooseFile(user)
    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled()
    expect(screen.getByText("React")).toBeInTheDocument()
    expect(screen.queryByText("Golang")).not.toBeInTheDocument()
  })

  it("Primera carga válida: habilita la conversación, Enviar y el aviso", async () => {
    const { calls, user } = renderShell()
    expect(screen.getByLabelText("Mensaje")).toBeDisabled()
    expect(screen.getByLabelText("Mensaje")).toHaveValue("")

    await chooseFile(user)
    await finishLoad(calls[0], { ok: true, profile: profileA })

    await expectLoadedNotice(1)
    expect(screen.getByLabelText("Mensaje")).toBeEnabled()
    expect(screen.getByLabelText("Mensaje")).toHaveValue("")
    const primary = document.querySelectorAll("[data-primary='true']")
    expect(primary).toHaveLength(1)
    expect(primary[0]).toHaveAccessibleName("Enviar")
    expect(screen.queryByText("La conversación se abre cuando hay un perfil.")).not.toBeInTheDocument()
  })

  it("Reemplazo válido: vacía el borrador y muestra solo el perfil nuevo", async () => {
    const { calls, user } = renderShell()
    await chooseFile(user)
    await finishLoad(calls[0], { ok: true, profile: profileA })
    await screen.findByText("React")
    await user.type(screen.getByLabelText("Mensaje"), "borrador anterior")

    await chooseFile(user)
    await finishLoad(calls[1], { ok: true, profile: profileB })

    expect(await screen.findByText("Golang")).toBeInTheDocument()
    expect(screen.queryByText("React")).not.toBeInTheDocument()
    expect(screen.getByLabelText("Mensaje")).toHaveValue("")
    expect(screen.getByLabelText("Mensaje")).toBeEnabled()
    await expectLoadedNotice(2)
  })

  it("Reemplazo rechazado: conserva perfil y borrador, y el error queda junto a Reemplazar CV", async () => {
    const { calls, user } = renderShell()
    await chooseFile(user)
    await finishLoad(calls[0], { ok: true, profile: profileA })
    await screen.findByText("React")
    await user.type(screen.getByLabelText("Mensaje"), "borrador que se queda")

    await chooseFile(user)
    await finishLoad(calls[1], { ok: false, message: "El PDF no tiene texto." })

    expect(await screen.findByRole("alert")).toHaveTextContent("El PDF no tiene texto.")
    expect(screen.getByText("React")).toBeInTheDocument()
    expect(screen.queryByText("Golang")).not.toBeInTheDocument()
    expect(screen.getByLabelText("Mensaje")).toHaveValue("borrador que se queda")

    const profile = screen.getByRole("region", { name: "Perfil" })
    const alert = screen.getByRole("alert")
    const replace = screen.getByRole("button", { name: "Reemplazar CV" })
    expect(profile.contains(alert)).toBe(true)
    expect(profile.contains(replace)).toBe(true)
    expect(screen.getByRole("button", { name: "Enviar" })).toBeEnabled()
  })

  it("muestra cada rol conservado con sus años, sin fiabilidad ni frase", async () => {
    const { calls, user } = renderShell()
    await chooseFile(user)
    await finishLoad(calls[0], {
      ok: true,
      profile: {
        ...profileA,
        roles: [
          { role: "Full Stack", experience_time: 2, reliability: 0.95, evidence: "frase de evidencia" },
          { role: "Backend", experience_time: 2, reliability: 0.84, evidence: "otra frase" },
          { role: "Frontend", experience_time: 2, reliability: 0.8, evidence: "tercera frase" },
        ],
      },
    })

    const profile = await screen.findByRole("region", { name: "Estado del perfil" })
    const experience = within(profile).getByText("Experiencia").parentElement
    expect(within(profile).getAllByText("Experiencia")).toHaveLength(1)
    expect(experience).toHaveTextContent("Full Stack: 2 años")
    expect(experience).toHaveTextContent("Backend: 2 años")
    expect(experience).toHaveTextContent("Frontend: 2 años")
    expect(within(profile).getByText("Full Stack: 2 años")).toBeInTheDocument()
    expect(within(profile).getByText("Backend: 2 años")).toBeInTheDocument()
    expect(within(profile).getByText("Frontend: 2 años")).toBeInTheDocument()
    expect(profile.textContent).not.toContain("0.95")
    expect(profile.textContent).not.toContain("frase de evidencia")
    expect(profile.textContent).not.toContain("otra frase")
    expect(profile.textContent).not.toContain("tercera frase")
  })

  it("no muestra el arquitecto que se descartó", async () => {
    const { calls, user } = renderShell()
    await chooseFile(user)
    await finishLoad(calls[0], {
      ok: true,
      profile: {
        ...profileA,
        roles: [{ role: "Full Stack", experience_time: 2, reliability: 0.95, evidence: "Full Stack" }],
      },
    })

    const profile = await screen.findByRole("region", { name: "Estado del perfil" })
    expect(within(profile).getByText("Full Stack: 2 años")).toBeInTheDocument()
    expect(within(profile).queryByText(/Arquitecto/)).not.toBeInTheDocument()
  })

  it("sin roles no hay línea de experiencia y la conversación acepta texto", async () => {
    const { calls, user } = renderShell()
    await chooseFile(user)
    await finishLoad(calls[0], { ok: true, profile: { ...profileA, roles: [] } })

    const profile = await screen.findByRole("region", { name: "Estado del perfil" })
    expect(within(profile).queryByText("Experiencia")).not.toBeInTheDocument()
    expect(profile.textContent).not.toContain("años")
    const message = screen.getByLabelText("Mensaje")
    expect(message).toBeEnabled()
    await user.type(message, "quiero revisar una vacante")
    expect(message).toHaveValue("quiero revisar una vacante")
  })

  it("al volver a abrir la página muestra el perfil que guardó la carga", async () => {
    const loadCv = createCvLoader(
      () => ({
        invoke: async () => ({
          tech_skills: ["React"],
          soft_skills: ["Comunicación"],
          languages: [{ language: "Español", level: "nativo" }],
          education: ["Ingeniería"],
        }),
      }),
      async () => "CV de React",
      () => ({
        invoke: async () => [
          {
            role: "Full Stack",
            experience_years: 3,
            experience_months: null,
            reliability: 0.95,
            evidence: "CV de React",
          },
        ],
      }),
    )
    const user = userEvent.setup()
    const first = render(<AssistantShell loadCv={loadCv} />)
    await user.type(screen.getByLabelText("Clave de Gemini"), "clave-de-prueba")
    await act(async () => {
      await user.upload(fileInput(), new File(["cv"], "cv.pdf", { type: "application/pdf" }))
    })

    expect(await screen.findByText("React")).toBeInTheDocument()
    first.unmount()

    render(<AssistantShell />)
    expect(await screen.findByText("React")).toBeInTheDocument()
    expect(screen.getByText("Comunicación")).toBeInTheDocument()
    expect(screen.getByText("Español (nativo)")).toBeInTheDocument()
    expect(screen.getByText("Full Stack: 3 años")).toBeInTheDocument()
    expect(screen.getByText("Ingeniería")).toBeInTheDocument()
    expect(screen.getByLabelText("Mensaje")).toBeEnabled()
    expect(screen.getByRole("button", { name: "Reemplazar CV" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Cargar CV" })).not.toBeInTheDocument()
  })
})

const lowVerdict: Verdict = {
  matches: ["React en el puesto"],
  mismatches: ["Falta Go"],
  score: 6.5,
}

function renderChat() {
  localStorage.removeItem("geminiApiKey")
  localStorage.removeItem("fitThreshold")
  const loads: Array<ReturnType<typeof deferred<LoadResult>>> = []
  const verdicts: Array<ReturnType<typeof deferred<Verdict>>> = []
  const verdictCalls: string[] = []
  const loadCv: CvLoader = () => {
    const pending = deferred<LoadResult>()
    loads.push(pending)
    return pending.promise
  }
  const requestVerdict = (_profile: Profile, message: string) => {
    verdictCalls.push(message)
    const pending = deferred<Verdict>()
    verdicts.push(pending)
    return pending.promise
  }
  const user = userEvent.setup()
  const view = render(<AssistantShell loadCv={loadCv} requestVerdict={requestVerdict} />)
  return { loads, verdicts, verdictCalls, user, unmount: view.unmount }
}

async function loadChatProfile(chat: ReturnType<typeof renderChat>, profile: Profile = profileA) {
  await chooseFile(chat.user)
  await finishLoad(chat.loads[0], { ok: true, profile })
  await screen.findByText(profile.tech_skills[0])
}

async function sendVacancy(chat: ReturnType<typeof renderChat>, text: string) {
  await chat.user.type(screen.getByLabelText("Mensaje"), text)
  await chat.user.click(screen.getByRole("button", { name: "Enviar" }))
}

describe("chat de una vacante", () => {
  it("muestra el intercambio y no lo guarda en el navegador", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, "open")
    const chat = renderChat()
    await loadChatProfile(chat)
    expect(screen.getByText("La conversación está abierta")).toBeInTheDocument()

    await sendVacancy(chat, "Vacante de plataforma")

    expect(screen.getByLabelText("Mensaje")).toHaveValue("")
    expect(screen.getByText("Vacante de plataforma")).toBeInTheDocument()
    expect(screen.queryByText("La conversación está abierta")).not.toBeInTheDocument()
    expect(screen.queryByText("Puntaje")).not.toBeInTheDocument()
    expect(chat.verdictCalls).toEqual(["Vacante de plataforma"])

    await act(async () => {
      chat.verdicts[0].resolve(lowVerdict)
    })

    expect(screen.getByText("Puntaje")).toBeInTheDocument()
    expect(screen.getByText("6.5")).toBeInTheDocument()
    expect(screen.getByText("No postular")).toBeInTheDocument()
    expect(screen.getByText("Coincidencias")).toBeInTheDocument()
    expect(screen.getByText("React en el puesto")).toBeInTheDocument()
    expect(screen.getByText("No coinciden")).toBeInTheDocument()
    expect(screen.getByText("Falta Go")).toBeInTheDocument()
    const conversation = screen.getByRole("region", { name: "Conversación" })
    const scroller = conversation.querySelector("[data-chat-scroll]")
    expect(scroller).toBeInstanceOf(HTMLElement)
    expect(scroller?.className).toContain("overflow-y-auto")
    expect(scroller?.className).toContain("min-h-0")
    expect(scroller).toContainElement(screen.getByText("Vacante de plataforma"))
    expect(scroller).toContainElement(screen.getByText("Puntaje"))
    expect(scroller).not.toContainElement(screen.getByLabelText("Mensaje"))
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(xhrSpy).not.toHaveBeenCalled()
    expect(Object.keys(localStorage).sort()).toEqual(["fitThreshold", "geminiApiKey"])
    const stored = Object.values(localStorage).join("\n")
    expect(stored).not.toContain("Vacante de plataforma")
    expect(stored).not.toContain("React en el puesto")
  })

  it("sin clave o sin texto conserva el intercambio y no llama", async () => {
    const chat = renderChat()
    await loadChatProfile(chat)
    await sendVacancy(chat, "Vacante de plataforma")
    await act(async () => {
      chat.verdicts[0].resolve(lowVerdict)
    })
    await screen.findByText("No postular")

    await chat.user.clear(screen.getByLabelText("Clave de Gemini"))
    await chat.user.type(screen.getByLabelText("Mensaje"), "otra vacante")
    await chat.user.click(screen.getByRole("button", { name: "Enviar" }))

    expect(chat.verdictCalls).toEqual(["Vacante de plataforma"])
    expect(screen.getByLabelText("Mensaje")).toHaveValue("otra vacante")
    expect(screen.getByText("Vacante de plataforma")).toBeInTheDocument()
    expect(screen.getByText("No postular")).toBeInTheDocument()

    await chat.user.type(screen.getByLabelText("Clave de Gemini"), "clave-de-prueba")
    await chat.user.clear(screen.getByLabelText("Mensaje"))
    await chat.user.click(screen.getByRole("button", { name: "Enviar" }))

    expect(chat.verdictCalls).toEqual(["Vacante de plataforma"])
    expect(screen.getByLabelText("Mensaje")).toHaveValue("")
    expect(screen.getByText("No postular")).toBeInTheDocument()
  })

  it("si la llamada falla devuelve el aviso, el texto y el error junto a Enviar", async () => {
    const chat = renderChat()
    await loadChatProfile(chat)
    await sendVacancy(chat, "Vacante de plataforma")
    await act(async () => {
      chat.verdicts[0].reject(new Error("No se pudo revisar la vacante."))
    })

    expect(screen.getByLabelText("Mensaje")).toHaveValue("Vacante de plataforma")
    expect(screen.getByText("La conversación está abierta")).toBeInTheDocument()
    expect(screen.queryByText("Puntaje")).not.toBeInTheDocument()
    const conversation = screen.getByRole("region", { name: "Conversación" })
    const alert = screen.getByRole("alert")
    expect(alert).toHaveTextContent("No se pudo revisar la vacante.")
    expect(conversation.contains(alert)).toBe(true)
    expect(conversation.contains(screen.getByRole("button", { name: "Enviar" }))).toBe(true)
  })

  it("un envío nuevo quita el anterior y, si falla, deja la conversación sin intercambio", async () => {
    const chat = renderChat()
    await loadChatProfile(chat)
    await sendVacancy(chat, "Vacante de plataforma")
    await act(async () => {
      chat.verdicts[0].resolve(lowVerdict)
    })
    await screen.findByText("React en el puesto")

    await sendVacancy(chat, "Segunda vacante")

    expect(screen.queryByText("React en el puesto")).not.toBeInTheDocument()
    expect(screen.queryByText("Vacante de plataforma")).not.toBeInTheDocument()
    expect(screen.getByText("Segunda vacante")).toBeInTheDocument()
    expect(screen.getByLabelText("Mensaje")).toHaveValue("")

    await act(async () => {
      chat.verdicts[1].reject(new Error("No se pudo revisar la vacante."))
    })

    expect(screen.queryByText("Puntaje")).not.toBeInTheDocument()
    expect(screen.queryByText("React en el puesto")).not.toBeInTheDocument()
    expect(screen.getByText("La conversación está abierta")).toBeInTheDocument()
    expect(screen.getByLabelText("Mensaje")).toHaveValue("Segunda vacante")
    const conversation = screen.getByRole("region", { name: "Conversación" })
    expect(conversation.contains(screen.getByRole("alert"))).toBe(true)
  })

  it("un puntaje fuera de la grilla no deja intercambio", async () => {
    localStorage.removeItem("geminiApiKey")
    localStorage.removeItem("fitThreshold")
    const loads: Array<ReturnType<typeof deferred<LoadResult>>> = []
    const loadCv: CvLoader = () => {
      const pending = deferred<LoadResult>()
      loads.push(pending)
      return pending.promise
    }
    const requestVerdict = (profile: Profile, message: string) =>
      runVerdict({ invoke: async () => ({ matches: ["a"], mismatches: ["b"], score: 7.3 }) }, profile, message)
    const user = userEvent.setup()
    render(<AssistantShell loadCv={loadCv} requestVerdict={requestVerdict} />)
    await chooseFile(user)
    await finishLoad(loads[0], { ok: true, profile: profileA })
    await screen.findByText("React")
    await user.type(screen.getByLabelText("Mensaje"), "Vacante rara")
    await user.click(screen.getByRole("button", { name: "Enviar" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo revisar la vacante.")
    expect(screen.getByLabelText("Mensaje")).toHaveValue("Vacante rara")
    expect(screen.getByText("La conversación está abierta")).toBeInTheDocument()
    expect(screen.queryByText("Puntaje")).not.toBeInTheDocument()
  })

  it("un reemplazo válido borra el intercambio y uno rechazado lo conserva", async () => {
    const chat = renderChat()
    await loadChatProfile(chat)
    await sendVacancy(chat, "Vacante de plataforma")
    await act(async () => {
      chat.verdicts[0].resolve(lowVerdict)
    })
    await screen.findByText("Puntaje")
    await chat.user.type(screen.getByLabelText("Mensaje"), "borrador que se queda")

    await chooseFile(chat.user)
    await finishLoad(chat.loads[1], { ok: false, message: "El PDF no tiene texto." })

    expect(await screen.findByRole("alert")).toHaveTextContent("El PDF no tiene texto.")
    expect(screen.getByText("Vacante de plataforma")).toBeInTheDocument()
    expect(screen.getByText("No postular")).toBeInTheDocument()
    expect(screen.getByLabelText("Mensaje")).toHaveValue("borrador que se queda")
    const profile = screen.getByRole("region", { name: "Perfil" })
    expect(profile.contains(screen.getByRole("alert"))).toBe(true)

    await chooseFile(chat.user)
    await finishLoad(chat.loads[2], { ok: true, profile: profileB })

    expect(await screen.findByText("Golang")).toBeInTheDocument()
    expect(screen.queryByText("Vacante de plataforma")).not.toBeInTheDocument()
    expect(screen.queryByText("Puntaje")).not.toBeInTheDocument()
    expect(screen.getByText("La conversación está abierta")).toBeInTheDocument()
    expect(screen.getByLabelText("Mensaje")).toHaveValue("")
  })

  it("recargar no recupera el intercambio y el perfil sigue", async () => {
    const chat = renderChat()
    await loadChatProfile(chat)
    await sendVacancy(chat, "Vacante de plataforma")
    await act(async () => {
      chat.verdicts[0].resolve(lowVerdict)
    })
    await screen.findByText("React en el puesto")
    await saveProfile(profileA)

    chat.unmount()
    render(<AssistantShell />)

    expect(await screen.findByText("React")).toBeInTheDocument()
    expect(screen.queryByText("Vacante de plataforma")).not.toBeInTheDocument()
    expect(screen.queryByText("React en el puesto")).not.toBeInTheDocument()
    expect(screen.getByText("La conversación está abierta")).toBeInTheDocument()
    expect(Object.values(localStorage).join("\n")).not.toContain("Vacante de plataforma")
  })

  it("cambiar el corte de 7 a 6 vuelve a etiquetar 6.5 sin otra llamada", async () => {
    const chat = renderChat()
    await loadChatProfile(chat)
    await sendVacancy(chat, "Vacante de plataforma")
    await act(async () => {
      chat.verdicts[0].resolve(lowVerdict)
    })
    expect(await screen.findByText("No postular")).toBeInTheDocument()
    expect(screen.getByText("6.5")).toBeInTheDocument()

    await chat.user.click(screen.getByRole("button", { name: "Ajustes" }))
    const dialog = await screen.findByRole("dialog", { name: "Ajustes" })
    const conversation = screen.getByRole("region", { name: "Conversación", hidden: true })
    expect(conversation.contains(dialog)).toBe(false)
    const control = within(dialog).getByLabelText("Postular desde")
    expect(control).toHaveValue("7")
    expect(within(dialog).queryByLabelText("Clave de Gemini")).not.toBeInTheDocument()

    await chat.user.selectOptions(control, "6")
    await chat.user.click(screen.getByRole("button", { name: "Cerrar" }))

    expect(screen.getByText("Postular")).toBeInTheDocument()
    expect(screen.queryByText("No postular")).not.toBeInTheDocument()
    expect(screen.getByText("6.5")).toBeInTheDocument()
    expect(chat.verdictCalls).toEqual(["Vacante de plataforma"])
    expect(localStorage.getItem("fitThreshold")).toBe("6")
  })
})
