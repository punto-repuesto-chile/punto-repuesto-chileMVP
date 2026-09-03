import { useEffect, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { createReport } from "../../services/reportService"
import type {
  ReportReason,
  ReportTargetPart,
  ReportTargetType,
} from "../../types/report"

type ReportContentDialogProps = {
  targetType: ReportTargetType
  targetId: string
  targetPart?: ReportTargetPart
  title?: string
  disabled?: boolean
}

type ReasonOption = {
  value: ReportReason
  label: string
}

const REASONS: Record<ReportTargetType, ReasonOption[]> = {
  listing: [
    { value: "spam", label: "Spam" },
    { value: "fraud", label: "Fraude o estafa" },
    { value: "prohibited_item", label: "Producto prohibido" },
    { value: "incorrect_information", label: "Información incorrecta" },
    { value: "duplicate_content", label: "Publicación duplicada" },
    { value: "offensive_content", label: "Contenido ofensivo" },
    { value: "other", label: "Otro" },
  ],
  review: [
    { value: "spam", label: "Spam" },
    { value: "fraud", label: "Fraude" },
    { value: "offensive_content", label: "Contenido ofensivo" },
    { value: "harassment", label: "Acoso" },
    { value: "personal_data", label: "Datos personales" },
    { value: "unrelated_to_transaction", label: "No corresponde al trato" },
    { value: "other", label: "Otro" },
  ],
  listing_question: [
    { value: "spam", label: "Spam" },
    { value: "offensive_content", label: "Contenido ofensivo" },
    { value: "harassment", label: "Acoso" },
    { value: "personal_data", label: "Datos personales" },
    { value: "off_topic", label: "Fuera de tema" },
    { value: "other", label: "Otro" },
  ],
}

export default function ReportContentDialog({
  targetType,
  targetId,
  targetPart = "content",
  title = "Reportar contenido",
  disabled = false,
}: ReportContentDialogProps) {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [reason, setReason] = useState<ReportReason | "">("")
  const [details, setDetails] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const firstFieldRef = useRef<HTMLSelectElement>(null)

  const options = REASONS[targetType]
  const isOther = reason === "other"
  const trimmedDetails = details.trim()
  const hasShortDetails =
    trimmedDetails.length > 0 && trimmedDetails.length < 10
  const detailsInvalid =
    trimmedDetails.length > 1500 || (isOther && trimmedDetails.length < 10)

  useEffect(() => {
    if (!isDialogOpen) return

    firstFieldRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsDialogOpen(false)
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isDialogOpen])

  if (disabled) return null

  const openReportFlow = () => {
    setIsMenuOpen(false)
    setError(null)
    if (!user) {
      navigate("/login", {
        state: {
          from: `${location.pathname}${location.search}${location.hash}`,
          reason: "report",
        },
      })
      return
    }
    setReason("")
    setDetails("")
    setIsDialogOpen(true)
  }

  const submit = async () => {
    const normalizedReason = reason
      .trim()
      .toLocaleLowerCase("es-CL") as ReportReason | ""
    const currentTrimmedDetails = details.trim()

    if (!normalizedReason) {
      setError("Selecciona un motivo para continuar.")
      return
    }
    if (currentTrimmedDetails.length > 1500) {
      setError("Los detalles no pueden superar los 1500 caracteres.")
      return
    }
    if (normalizedReason === "other" && currentTrimmedDetails.length < 10) {
      setError("Escribe al menos 10 caracteres para explicar el motivo.")
      return
    }
    if (currentTrimmedDetails.length > 0 && currentTrimmedDetails.length < 10) {
      setError("Si agregas detalles, escribe al menos 10 caracteres.")
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      if (targetType === "listing_question") {
        await createReport({
          targetType,
          targetId,
          targetPart: targetPart === "answer" ? "answer" : "question",
          reason: normalizedReason,
          details: currentTrimmedDetails || null,
        })
      } else {
        await createReport({
          targetType,
          targetId,
          targetPart: "content",
          reason: normalizedReason,
          details: currentTrimmedDetails || null,
        })
      }
      setIsDialogOpen(false)
      setFeedback("Gracias. Recibimos tu reporte y lo revisaremos.")
      window.setTimeout(() => setFeedback(null), 5000)
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No pudimos enviar tu reporte. Inténtalo nuevamente.",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div className="relative">
        <button
          type="button"
          aria-label={`Más acciones: ${title.toLocaleLowerCase("es-CL")}`}
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((open) => !open)}
          className="rounded-lg px-2 py-1 text-lg leading-none text-muted transition hover:bg-bg hover:text-petrol"
        >
          ⋯
        </button>
        {isMenuOpen && (
          <div className="absolute right-0 top-9 z-20 w-48 rounded-xl border border-border bg-white p-1 shadow-lg">
            <button
              type="button"
              onClick={openReportFlow}
              className="block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-petrol-dark hover:bg-bg"
            >
              {title}
            </button>
          </div>
        )}
      </div>

      {isDialogOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-petrol-dark/45 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsDialogOpen(false)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-dialog-title"
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
          >
            <h2
              id="report-dialog-title"
              className="font-display text-xl font-extrabold text-petrol-dark"
            >
              Reportar contenido
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Cuéntanos qué problema tiene este contenido.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="report-reason"
                  className="text-sm font-semibold text-petrol-dark"
                >
                  ¿Por qué quieres reportarlo?
                </label>
                <select
                  ref={firstFieldRef}
                  id="report-reason"
                  value={reason}
                  onChange={(event) => {
                    setReason(event.target.value as ReportReason)
                    setError(null)
                  }}
                  className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-3 text-sm text-petrol-dark outline-none focus:border-orange focus:ring-2 focus:ring-orange/20"
                  aria-invalid={Boolean(error)}
                >
                  <option value="">Selecciona un motivo</option>
                  {options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="report-details"
                  className="text-sm font-semibold text-petrol-dark"
                >
                  Detalles adicionales
                </label>
                <textarea
                  id="report-details"
                  value={details}
                  maxLength={1500}
                  onChange={(event) => {
                    setDetails(event.target.value)
                    setError(null)
                  }}
                  rows={4}
                  placeholder={
                    isOther
                      ? "Describe el problema (mínimo 10 caracteres)"
                      : "Opcional"
                  }
                  className="mt-2 w-full resize-y rounded-xl border border-border px-3 py-3 text-sm text-petrol-dark outline-none focus:border-orange focus:ring-2 focus:ring-orange/20"
                />
                <p className="mt-1 text-right text-xs text-muted">
                  {details.length}/1500
                </p>
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="mt-3 text-sm font-semibold text-red-700"
              >
                {error}
              </p>
            )}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsDialogOpen(false)}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-muted hover:bg-bg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={
                  isSubmitting || !reason || detailsInvalid || hasShortDetails
                }
                className="rounded-xl bg-petrol px-4 py-2.5 text-sm font-bold text-white hover:bg-petrol-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Enviando…" : "Enviar reporte"}
              </button>
            </div>
          </div>
        </div>
      )}

      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 left-1/2 z-[110] w-[min(92vw,32rem)] -translate-x-1/2 rounded-xl bg-petrol px-4 py-3 text-center text-sm font-semibold text-white shadow-xl"
        >
          {feedback}
        </div>
      )}
    </>
  )
}
