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
import { FIT_GRID, fitDecision, isGridScore, readFitThreshold, writeFitThreshold } from "@/ai/fit-threshold"
import { MISSING_GEMINI_KEY, readGeminiApiKey, writeGeminiApiKey } from "@/ai/gemini"
import { VERDICT_FAILED, requestProfileVerdict, type Verdict } from "@/ai/verdict-chain"
import { LOAD_READY_LABEL, LOAD_STEP_LABELS } from "@/profile/load-progress"
import { readProfile } from "@/profile/profile-store"
import { defaultLoadCv } from "@/profile/load-cv"
import type { CvLoader, LoadProgress, Profile } from "@/profile/types"

const CLOSED_CONVERSATION = "La conversación se abre cuando hay un perfil."

type ErrorBeside = "cargar" | "reemplazar"

type Exchange = {
  message: string
  verdict: Verdict | null
}

type VerdictRequester = (profile: Profile, message: string, apiKey: string) => Promise<Verdict>

type AssistantShellProps = {
  loadCv?: CvLoader
  requestVerdict?: VerdictRequester
}

export function AssistantShell({
  loadCv = defaultLoadCv,
  requestVerdict = requestProfileVerdict,
}: AssistantShellProps) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [apiKey, setApiKey] = useState(readGeminiApiKey)
  const [threshold, setThreshold] = useState(readFitThreshold)
  const [draft, setDraft] = useState("")
  const [exchange, setExchange] = useState<Exchange | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState<LoadProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errorBeside, setErrorBeside] = useState<ErrorBeside | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const loadingRef = useRef(false)
  const sendingRef = useRef(false)
  const sendSeq = useRef(0)
  const mountedRef = useRef(true)
  const profileCommitted = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    let cancelled = false
    readProfile()
      .then((saved) => {
        if (cancelled || profileCommitted.current || !saved) return
        setProfile(saved)
      })
      .catch(() => {})
    return () => {
      cancelled = true
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
    const key = apiKey.trim()
    if (!key) {
      setError(MISSING_GEMINI_KEY)
      setErrorBeside(beside)
      return
    }

    loadingRef.current = true
    setLoading(true)
    setError(null)
    setErrorBeside(null)
    setProgress({
      completed: 0,
      total: LOAD_STEP_LABELS.length,
      label: LOAD_STEP_LABELS[0],
      status: "active",
    })

    try {
      const result = await loadCv(file, key, (next) => {
        if (mountedRef.current) setProgress(next)
      })
      if (!mountedRef.current) return
      if (result.ok) {
        profileCommitted.current = true
        sendSeq.current += 1
        sendingRef.current = false
        setSending(false)
        setExchange(null)
        setSendError(null)
        setProfile(result.profile)
        setDraft("")
        setError(null)
        setErrorBeside(null)
        setProgress({
          completed: LOAD_STEP_LABELS.length,
          total: LOAD_STEP_LABELS.length,
          label: LOAD_READY_LABEL,
          status: "done",
        })
        toast.success("CV cargado.")
      } else {
        setError(result.message)
        setErrorBeside(beside)
        setProgress((current) =>
          current ? { ...current, status: "error" } : current,
        )
      }
    } catch {
      if (!mountedRef.current) return
      setError("No se pudo cargar el CV.")
      setErrorBeside(beside)
      setProgress((current) => (current ? { ...current, status: "error" } : current))
    } finally {
      loadingRef.current = false
      if (mountedRef.current) setLoading(false)
    }
  }

  async function onSend() {
    if (!profile || loadingRef.current || sendingRef.current) return
    const text = draft
    const key = apiKey.trim()
    if (!key || text.trim().length === 0) return

    const seq = ++sendSeq.current
    const current = profile
    sendingRef.current = true
    setSending(true)
    setExchange({ message: text, verdict: null })
    setDraft("")
    setSendError(null)

    try {
      const verdict = await requestVerdict(current, text, key)
      if (!mountedRef.current || seq !== sendSeq.current) return
      setExchange({ message: text, verdict })
    } catch (caught) {
      if (!mountedRef.current || seq !== sendSeq.current) return
      setExchange(null)
      setDraft(text)
      setSendError(caught instanceof Error && caught.message ? caught.message : VERDICT_FAILED)
    } finally {
      if (seq === sendSeq.current) {
        sendingRef.current = false
        if (mountedRef.current) setSending(false)
      }
    }
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden text-[var(--tinta)]">
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

      <main className="flex min-h-0 w-full flex-1 flex-col md:flex-row">
        <section
          aria-label="Conversación"
          className="flex min-h-0 min-w-0 flex-1 flex-col border-[var(--linea)] p-4 md:border-r"
        >
          <Card className="flex h-full min-h-0 w-full flex-1 flex-col">
            <div
              aria-hidden="true"
              className="h-1.5"
              style={{ background: "linear-gradient(90deg, var(--cielo), var(--teal))" }}
            />
            <CardHeader className="shrink-0 bg-[var(--cielo-suave)]">
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
                data-chat-scroll=""
                className={`min-h-0 flex-1 overflow-y-auto rounded-[var(--radio-tarjeta)] ${
                  hasProfile
                    ? "bg-[var(--teal-suave)]"
                    : "border border-[var(--ambar)]/40 bg-[var(--ambar-suave)]"
                }`}
              >
                <div
                  className={`flex min-h-full flex-col px-6 py-8 ${
                    exchange
                      ? "items-stretch justify-start text-left"
                      : "items-center justify-center text-center"
                  }`}
                >
                  {exchange ? (
                    <div className="flex w-full flex-col gap-4">
                      <p className="whitespace-pre-wrap rounded-[var(--radio-control)] bg-white px-4 py-3 text-[var(--tinta)]">
                        {exchange.message}
                      </p>
                      {exchange.verdict ? (
                        <VerdictPanel verdict={exchange.verdict} threshold={threshold} />
                      ) : (
                        <p className="text-sm font-medium text-[var(--teal)]">Revisando la vacante…</p>
                      )}
                    </div>
                  ) : hasProfile ? (
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
              </div>
              <div className="flex shrink-0 flex-col gap-2 rounded-[var(--radio-tarjeta)] border border-[var(--linea)] bg-[var(--superficie-2)] p-3">
                <Label htmlFor="mensaje">Mensaje</Label>
                {hasProfile && sendError ? (
                  <Alert className="w-full">
                    <AlertDescription>{sendError}</AlertDescription>
                  </Alert>
                ) : null}
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <Input
                      id="mensaje"
                      value={draft}
                      placeholder={hasProfile ? "Escribe un mensaje" : "Disponible con un perfil"}
                      disabled={!hasProfile}
                      onChange={(event) => setDraft(event.target.value)}
                    />
                  </div>
                  {hasProfile ? (
                    <Button
                      variant="primary"
                      className="h-11 shrink-0"
                      disabled={loading || sending}
                      onClick={onSend}
                    >
                      <Send aria-hidden="true" className="size-4" />
                      Enviar
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section
          aria-label="Perfil"
          aria-busy={loading}
          className="flex min-h-0 min-w-0 flex-1 flex-col p-4"
        >
          <div className="mb-4 flex shrink-0 flex-col gap-2">
            <div className="flex items-end gap-2">
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Label htmlFor="clave-gemini">Clave de Gemini</Label>
                <Input
                  id="clave-gemini"
                  type="password"
                  autoComplete="off"
                  value={apiKey}
                  onChange={(event) => {
                    const value = event.target.value
                    setApiKey(value)
                    writeGeminiApiKey(value)
                  }}
                />
              </div>
              {hasProfile ? (
                <Button
                  variant="secondary"
                  className="shrink-0"
                  disabled={loading}
                  onClick={openFilePicker}
                >
                  <Upload aria-hidden="true" className="size-4" />
                  {loading ? "Cargando CV…" : "Reemplazar CV"}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  className="shrink-0"
                  disabled={loading}
                  onClick={openFilePicker}
                >
                  <Upload aria-hidden="true" className="size-4" />
                  {loading ? "Cargando CV…" : "Cargar CV"}
                </Button>
              )}
            </div>
            {progress ? <LoadProgressBar progress={progress} /> : null}
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
            <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
              {progress && progress.status !== "done" ? (
                <LoadStepList progress={progress} compact={profile !== null} />
              ) : null}
              {profile ? (
                <ScrollArea className="min-h-0 flex-1">
                  <ProfileStatus profile={profile} />
                </ScrollArea>
              ) : progress && progress.status !== "done" ? null : (
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
            <div className="mt-4 flex flex-col gap-2">
              <Label htmlFor="postular-desde">Postular desde</Label>
              <select
                id="postular-desde"
                className="flex h-11 w-full rounded-[var(--radio-control)] border border-[var(--linea)] bg-white px-3 text-base text-[var(--tinta)]"
                value={String(threshold)}
                onChange={(event) => {
                  const next = Number(event.target.value)
                  if (!isGridScore(next)) return
                  writeFitThreshold(next)
                  setThreshold(next)
                }}
              >
                {FIT_GRID.map((value) => (
                  <option key={value} value={String(value)}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
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

function VerdictPanel({ verdict, threshold }: { verdict: Verdict; threshold: number }) {
  const label = fitDecision(verdict.score, threshold)
  const labelTone = label === "Postular" ? "text-[var(--ok)]" : "text-[var(--error)]"
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radio-control)] bg-white px-4 py-3">
      <div>
        <p className="text-sm font-medium text-[var(--tinta-suave)]">Puntaje</p>
        <p className="text-2xl font-semibold">{verdict.score}</p>
        <p className={`font-semibold ${labelTone}`}>{label}</p>
      </div>
      <div>
        <p className="font-medium">Coincidencias</p>
        <ul className="mt-1 list-disc pl-5">
          {verdict.matches.map((item, index) => (
            <li key={`${item}-${index}`}>{item}</li>
          ))}
        </ul>
      </div>
      <div>
        <p className="font-medium">No coinciden</p>
        <ul className="mt-1 list-disc pl-5">
          {verdict.mismatches.map((item, index) => (
            <li key={`${item}-${index}`}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function LoadProgressBar({ progress }: { progress: LoadProgress }) {
  const failed = progress.status === "error"
  const lead = progress.status === "active" ? 0.35 : 0
  const percent = Math.min(100, Math.max(failed ? 8 : 0, ((progress.completed + lead) / progress.total) * 100))
  const tone = failed ? "bg-[var(--error)]" : progress.status === "done" ? "bg-[var(--ok)]" : "bg-[var(--teal)]"
  const labelTone = failed ? "text-[var(--error)]" : "text-[var(--teal)]"

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <p className={`text-sm font-medium ${labelTone}`}>{progress.label}</p>
        <p className="texto-meta">
          {progress.completed} de {progress.total}
        </p>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={progress.total}
        aria-valuenow={progress.completed}
        aria-valuetext={progress.label}
        className="h-2.5 overflow-hidden rounded-full bg-[var(--superficie-2)]"
      >
        <div className={`h-full rounded-full transition-[width] duration-300 ${tone}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

function LoadStepList({ progress, compact }: { progress: LoadProgress; compact: boolean }) {
  const stopped = progress.status === "error"
  return (
    <div
      className={`flex flex-col justify-center rounded-[var(--radio-tarjeta)] border px-6 py-6 ${
        compact ? "" : "min-h-64 flex-1"
      } ${stopped ? "border-[var(--error)]/30 bg-[var(--error-suave)]" : "border-[var(--teal)]/25 bg-[var(--teal-suave)]"}`}
    >
      <p className={`font-semibold ${stopped ? "text-[var(--error)]" : "text-[var(--teal)]"}`}>
        {stopped ? "La carga se detuvo" : "Cargando el CV"}
      </p>
      <ol aria-label="Pasos de la carga" className="mt-4 flex flex-col gap-2">
        {LOAD_STEP_LABELS.map((label, index) => {
          const failed = progress.status === "error" && index === progress.completed
          const done = index < progress.completed
          const active = progress.status === "active" && index === progress.completed
          const mark = failed ? "!" : done ? "✓" : String(index + 1)
          const row = failed
            ? "border-[var(--error)] bg-[var(--error-suave)] text-[var(--error)]"
            : done
              ? "border-[var(--ok)]/30 bg-white text-[var(--ok)]"
              : active
                ? "border-[var(--teal)] bg-white font-semibold text-[var(--teal)]"
                : "border-[var(--linea)] bg-white/70 text-[var(--tinta-suave)]"
          return (
            <li key={label} aria-current={active ? "step" : undefined} className={`flex items-center gap-3 rounded-[var(--radio-control)] border px-3 py-2 ${row}`}>
              <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-full text-sm">
                {mark}
              </span>
              {label}
            </li>
          )
        })}
      </ol>
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
          value={profile.tech_skills.join(", ")}
        />
        <ProfileField
          icon={UserRound}
          tone="violeta"
          label="Habilidades blandas"
          value={profile.soft_skills.join(", ")}
        />
        <ProfileField icon={Languages} tone="ambar" label="Idiomas" value={languages} />
        <ProfileField
          icon={Briefcase}
          tone="teal"
          label="Experiencia"
          value={profile.roles.flatMap((item) =>
            item.experience_time === null ? [] : [`${item.role}: ${item.experience_time} años`],
          )}
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
  value: string | string[]
  tone: keyof typeof fieldTones
  icon: LucideIcon
}) {
  const lines = (Array.isArray(value) ? value : [value]).filter((line) => line.length > 0)
  if (lines.length === 0) return null
  return (
    <div className={`rounded-[var(--radio-control)] border px-3 py-2 ${fieldTones[tone]}`}>
      <dt className="flex items-center gap-2 text-sm font-medium">
        <Icon aria-hidden="true" className="size-4" />
        {label}
      </dt>
      {lines.map((line, index) => (
        <dd key={`${line}-${index}`} className="mt-1 text-[var(--tinta)]">
          {line}
        </dd>
      ))}
    </div>
  )
}
