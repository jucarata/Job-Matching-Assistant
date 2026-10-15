import { act, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import css from "../index.css?raw"
import { toast } from "sonner"
import { createCvLoader } from "@/profile/load-cv"
import { AssistantShell } from "@/shell/AssistantShell"
import type { CvLoader, LoadProgress, LoadResult, Profile } from "@/profile/types"

const profileA: Profile = {
  tech_skills: ["React"],
  soft_skills: ["Comunicación"],
  languages: [{ language: "Español", level: "nativo" }],
  experience_time: 3,
  education: ["Ingeniería"],
  flat_text: "CV de React",
}

const profileB: Profile = {
  tech_skills: ["Golang"],
  soft_skills: ["Mentoría"],
  languages: [{ language: "Inglés", level: "avanzado" }],
  experience_time: 1.5,
  education: ["Maestría"],
  flat_text: "CV de Golang",
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

function renderShell() {
  localStorage.removeItem("geminiApiKey")
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
    expect(bar).toHaveAttribute("aria-valuemax", "6")
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
        total: 6,
        label: "Leer los datos con Gemini",
        status: "active",
      })
    })
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "3")
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "Leer los datos con Gemini")

    await finishLoad(pending, { ok: true, profile: profileA })

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "6")
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

  it("Envío sin respuesta: conserva el texto y no llama a la red", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    const xhrSpy = vi.spyOn(XMLHttpRequest.prototype, "open")
    const { calls, user } = renderShell()
    await chooseFile(user)
    await finishLoad(calls[0], { ok: true, profile: profileA })
    await screen.findByText("React")

    await user.type(screen.getByLabelText("Mensaje"), "Hola, quiero revisar mi perfil")
    await user.click(screen.getByRole("button", { name: "Enviar" }))

    expect(screen.getByLabelText("Mensaje")).toHaveValue("Hola, quiero revisar mi perfil")
    expect(screen.getByRole("region", { name: "Conversación" }).textContent).not.toContain(
      "Hola, quiero revisar mi perfil",
    )
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(xhrSpy).not.toHaveBeenCalled()
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

  it("al volver a abrir la página muestra el perfil que guardó la carga", async () => {
    const loadCv = createCvLoader(
      () => ({
        invoke: async () => ({
          tech_skills: ["React"],
          soft_skills: ["Comunicación"],
          languages: [{ language: "Español", level: "nativo" }],
          education: ["Ingeniería"],
          experience_years: 3,
          experience_months: null,
        }),
      }),
      async () => "CV de React",
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
    expect(screen.getByText("3 años")).toBeInTheDocument()
    expect(screen.getByText("Ingeniería")).toBeInTheDocument()
    expect(screen.getByLabelText("Mensaje")).toBeEnabled()
    expect(screen.getByRole("button", { name: "Reemplazar CV" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Cargar CV" })).not.toBeInTheDocument()
  })
})
