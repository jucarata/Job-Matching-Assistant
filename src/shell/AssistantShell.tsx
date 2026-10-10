import { useEffect, useRef, useState, type ChangeEvent } from "react"
import {
  Briefcase,
  FileText,
  GraduationCap,
  Languages,
  MessageCircle,
  Send,
  Settings,
  Sparkles,
  Upload,
  UserRound,
  type LucideIcon,
} from "lucide-react"
import { toast, Toaster } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { defaultLoadCv } from "@/profile/load-cv"
import type { CvLoader, Profile } from "@/profile/types"

const CLOSED_CONVERSATION = "La conversación se abre cuando hay un perfil."

type ErrorBeside = "cargar" | "reemplazar"

type AssistantShellProps = {
  loadCv?: CvLoader
}

export function AssistantShell({ loadCv = defaultLoadCv }: AssistantShellProps) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [draft, setDraft] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorBeside, setErrorBeside] = useState<ErrorBeside | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const loadingRef = useRef(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const hasProfile = profile !== null

  function openFilePicker() {
    fileRef.current?.click()
  }

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file || loadingRef.current) return

    const beside: ErrorBeside = profile ? "reemplazar" : "cargar"
    loadingRef.current = true
    setLoading(true)
    setError(null)
    setErrorBeside(null)

    try {
      const result = await loadCv(file)
      if (!mountedRef.current) return
      if (result.ok) {
        setProfile(result.profile)
        setDraft("")
        setError(null)
        setErrorBeside(null)
        toast.success("CV cargado.")
      } else {
        setError(result.message)
        setErrorBeside(beside)
      }
    } catch {
      if (!mountedRef.current) return
      setError("No se pudo cargar el CV.")
      setErrorBeside(beside)
    } finally {
      loadingRef.current = false
      if (mountedRef.current) setLoading(false)
    }
  }

  function onSend() {
    if (!profile || loadingRef.current) return
  }

  return (
    <div className="flex min-h-screen flex-col text-[var(--tinta)] md:h-screen">
      <header className="shrink-0 border-b border-[var(--linea)] bg-[var(--superficie)]/85 backdrop-blur-md">
        <div className="flex w-full flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-[var(--teal)] text-white shadow-[0_10px_24px_-12px_var(--teal)]">
              <Sparkles aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Asistente</h1>
              <p className="texto-meta">Perfil, conversación y ajustes</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill active={!hasProfile} tone="coral">
              CV
            </StatusPill>
            <StatusPill active={hasProfile} tone="violeta">
              Perfil
            </StatusPill>
            <StatusPill active={hasProfile && !loading} tone="cielo">
              Conversación
            </StatusPill>
            <Button variant="ghost" onClick={() => setSettingsOpen(true)}>
              <Settings aria-hidden="true" className="size-4" />
              Ajustes
            </Button>
          </div>
        </div>
        <div
          aria-hidden="true"
          className="h-1.5"
          style={{
            background:
              "linear-gradient(90deg, var(--coral), var(--ambar), var(--teal), var(--cielo), var(--violeta))",
          }}
        />
      </header>

      <main className="flex w-full flex-1 flex-col md:min-h-0 md:flex-row">
        <section
          aria-label="Conversación"
          className="flex min-w-0 flex-1 flex-col border-[var(--linea)] p-4 md:min-h-0 md:border-r"
        >
          <Card className="flex h-full w-full flex-col">
            <div
              aria-hidden="true"
              className="h-1.5"
              style={{ background: "linear-gradient(90deg, var(--cielo), var(--teal))" }}
            />
            <CardHeader className="bg-[var(--cielo-suave)]">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--cielo)] text-white">
                  <MessageCircle aria-hidden="true" className="size-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold">Conversación</h2>
                  {hasProfile ? (
                    <p className="texto-meta">Escribe y envía cuando quieras revisar el perfil.</p>
                  ) : (
                    <p className="texto-meta">{CLOSED_CONVERSATION}</p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
              <div
                className={`flex min-h-40 flex-1 flex-col items-center justify-center rounded-[var(--radio-tarjeta)] px-6 py-8 text-center ${
                  hasProfile
                    ? "bg-[var(--teal-suave)]"
                    : "border border-[var(--ambar)]/40 bg-[var(--ambar-suave)]"
                }`}
              >
                {hasProfile ? (
                  <>
                    <span className="grid size-14 place-items-center rounded-2xl bg-white text-[var(--teal)] shadow-[0_10px_24px_-16px_var(--teal)]">
                      <MessageCircle aria-hidden="true" className="size-7" />
                    </span>
                    <p className="mt-3 font-semibold text-[var(--teal)]">La conversación está abierta</p>
                    <p className="texto-meta mt-1 max-w-xs">
                      El mensaje se conserva aquí hasta que decidas enviarlo.
                    </p>
                  </>
                ) : (
                  <>
                    <span className="grid size-14 place-items-center rounded-2xl bg-white text-[var(--aviso)] shadow-[0_10px_24px_-16px_var(--ambar)]">
                      <Upload aria-hidden="true" className="size-7" />
                    </span>
                    <p className="mt-3 font-semibold text-[var(--aviso)]">Primero hace falta un CV</p>
                    <p className="texto-meta mt-1 max-w-xs">
                      Carga un PDF para abrir el mensaje y el envío.
                    </p>
                  </>
                )}
              </div>
              <div className="flex flex-col gap-3 rounded-[var(--radio-tarjeta)] border border-[var(--linea)] bg-[var(--superficie-2)] p-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="mensaje">Mensaje</Label>
                  <Input
                    id="mensaje"
                    value={draft}
                    placeholder={hasProfile ? "Escribe un mensaje" : "Disponible con un perfil"}
                    disabled={!hasProfile}
                    onChange={(event) => setDraft(event.target.value)}
                  />
                </div>
                {hasProfile ? (
                  <div className="flex justify-end">
                    <Button variant="primary" disabled={loading} onClick={onSend}>
                      <Send aria-hidden="true" className="size-4" />
                      Enviar
                    </Button>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </section>

        <section aria-label="Perfil" className="flex min-w-0 flex-1 flex-col p-4 md:min-h-0">
          <div className="mb-4 flex shrink-0 flex-col gap-2">
            {hasProfile ? (
              <Button
                variant="secondary"
                className="w-full"
                disabled={loading}
                onClick={openFilePicker}
              >
                <Upload aria-hidden="true" className="size-4" />
                Reemplazar CV
              </Button>
            ) : (
              <Button
                variant="primary"
                className="w-full"
                disabled={loading}
                onClick={openFilePicker}
              >
                <Upload aria-hidden="true" className="size-4" />
                Cargar CV
              </Button>
            )}
            {error && (errorBeside === "cargar" || errorBeside === "reemplazar") ? (
              <Alert>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
          </div>
          <Card className="flex min-h-0 w-full flex-1 flex-col">
            <div
              aria-hidden="true"
              className="h-1.5"
              style={{ background: "linear-gradient(90deg, var(--violeta), var(--coral))" }}
            />
            <CardHeader className="bg-[var(--violeta-suave)]">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--violeta)] text-white">
                  <UserRound aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <h2 className="text-base font-semibold">Perfil</h2>
                  <p className="texto-meta">
                    {hasProfile ? "Datos leídos del CV." : "Aparece cuando el CV es válido."}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col">
              {profile ? (
                <ScrollArea className="min-h-0 flex-1">
                  <ProfileStatus profile={profile} />
                </ScrollArea>
              ) : (
                <div className="flex min-h-64 flex-1 flex-col items-center justify-center gap-3 rounded-[var(--radio-tarjeta)] border border-dashed border-[var(--cielo)] bg-[var(--cielo-suave)] px-6 py-8 text-center">
                  <span className="grid size-14 place-items-center rounded-2xl bg-white text-[var(--cielo)] shadow-[0_10px_24px_-16px_var(--cielo)]">
                    <FileText aria-hidden="true" className="size-7" />
                  </span>
                  <p className="font-semibold">Todavía no hay un CV</p>
                  <p className="texto-meta max-w-xs">
                    Habilidades, idiomas, experiencia y educación se muestran aquí.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </main>

      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,.pdf"
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        onChange={onFileChange}
      />

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <div
            aria-hidden="true"
            className="h-2"
            style={{
              background:
                "linear-gradient(90deg, var(--coral), var(--ambar), var(--teal), var(--cielo), var(--violeta))",
            }}
          />
          <div className="p-6">
            <DialogTitle>Ajustes</DialogTitle>
            <p className="texto-meta mt-2">
              Esta ventana queda fuera de la conversación.
            </p>
            <DialogClose>Cerrar</DialogClose>
          </div>
        </DialogContent>
      </Dialog>

      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "var(--ok-suave)",
            color: "var(--ok)",
            border: "1px solid var(--ok)",
            borderRadius: "var(--radio-tarjeta)",
          },
        }}
      />
    </div>
  )
}

const pillTones = {
  coral: {
    on: "bg-[var(--coral)] text-white",
    off: "bg-[var(--coral-suave)] text-[var(--coral)]",
  },
  violeta: {
    on: "bg-[var(--violeta)] text-white",
    off: "bg-[var(--violeta-suave)] text-[var(--violeta)]",
  },
  cielo: {
    on: "bg-[var(--cielo)] text-white",
    off: "bg-[var(--cielo-suave)] text-[var(--cielo)]",
  },
} as const

function StatusPill({
  active,
  tone,
  children,
}: {
  active: boolean
  tone: keyof typeof pillTones
  children: string
}) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-sm font-medium ${active ? pillTones[tone].on : pillTones[tone].off}`}
    >
      {children}
    </span>
  )
}

const fieldTones = {
  cielo: "border-[var(--cielo)]/25 bg-[var(--cielo-suave)] text-[var(--cielo)]",
  violeta: "border-[var(--violeta)]/25 bg-[var(--violeta-suave)] text-[var(--violeta)]",
  ambar: "border-[var(--ambar)]/40 bg-[var(--ambar-suave)] text-[var(--aviso)]",
  teal: "border-[var(--teal)]/25 bg-[var(--teal-suave)] text-[var(--teal)]",
  coral: "border-[var(--coral)]/30 bg-[var(--coral-suave)] text-[var(--coral)]",
} as const

function ProfileStatus({ profile }: { profile: Profile }) {
  const languages = profile.languages
    .map((item) => `${item.language} (${item.level})`)
    .join(", ")

  return (
    <div aria-label="Estado del perfil" role="region" className="pr-3">
      <h3 className="inline-flex items-center gap-2 rounded-full bg-[var(--ok-suave)] px-3 py-1 text-sm font-semibold text-[var(--ok)]">
        <span aria-hidden="true" className="size-2 rounded-full bg-[var(--ok)]" />
        Estado del perfil
      </h3>
      <dl className="mt-3 flex flex-col gap-3">
        <ProfileField
          icon={Sparkles}
          tone="cielo"
          label="Habilidades técnicas"
          value={profile.techSkills.join(", ")}
        />
        <ProfileField
          icon={UserRound}
          tone="violeta"
          label="Habilidades blandas"
          value={profile.softSkills.join(", ")}
        />
        <ProfileField icon={Languages} tone="ambar" label="Idiomas" value={languages} />
        <ProfileField
          icon={Briefcase}
          tone="teal"
          label="Experiencia"
          value={profile.experienceTime === null ? "" : `${profile.experienceTime} años`}
        />
        <ProfileField
          icon={GraduationCap}
          tone="coral"
          label="Educación"
          value={profile.education.join(", ")}
        />
      </dl>
    </div>
  )
}

function ProfileField({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string
  value: string
  tone: keyof typeof fieldTones
  icon: LucideIcon
}) {
  if (!value) return null
  return (
    <div className={`rounded-[var(--radio-control)] border px-3 py-2 ${fieldTones[tone]}`}>
      <dt className="flex items-center gap-2 text-sm font-medium">
        <Icon aria-hidden="true" className="size-4" />
        {label}
      </dt>
      <dd className="mt-1 text-[var(--tinta)]">{value}</dd>
    </div>
  )
}
