import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import css from "../index.css?raw"
import { toast } from "sonner"
import { AssistantShell } from "@/shell/AssistantShell"
import type { CvLoader, LoadResult, Profile } from "@/profile/types"

const profileA: Profile = {
  techSkills: ["React"],
  softSkills: ["Comunicación"],
  languages: [{ language: "Español", level: "nativo" }],
  experienceTime: 3,
  education: ["Ingeniería"],
}

const profileB: Profile = {
  techSkills: ["Golang"],
  softSkills: ["Mentoría"],
  languages: [{ language: "Inglés", level: "avanzado" }],
  experienceTime: 1.5,
  education: ["Maestría"],
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

function renderShell() {
  const calls: Array<ReturnType<typeof deferred<LoadResult>>> = []
  const loadCv: CvLoader = () => {
    const pending = deferred<LoadResult>()
    calls.push(pending)
    return pending.promise
  }
  const user = userEvent.setup()
  render(<AssistantShell loadCv={loadCv} />)
  return { calls, user }
}

function fileInput() {
  const input = document.querySelector('input[type="file"]')
  if (!(input instanceof HTMLInputElement)) throw new Error("Falta el input de archivo")
  return input
}

async function chooseFile(user: ReturnType<typeof userEvent.setup>) {
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
    const primary = document.querySelectorAll("[data-primary='true']")
    expect(primary).toHaveLength(1)
    expect(primary[0]).toHaveAccessibleName("Cargar CV")

    const input = fileInput()
    const click = vi.spyOn(input, "click")
    await user.click(screen.getByRole("button", { name: "Cargar CV" }))
    expect(click).toHaveBeenCalled()
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

    const replace = screen.getByRole("button", { name: "Reemplazar CV" })
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
})
