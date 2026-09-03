import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import {
  getReport,
  ModerationServiceError,
  updateReportStatus,
} from "../../services/moderationService"
import type {
  ModerationAction,
  ModerationReportDetail,
  ModerationReportStatus,
} from "../../types/moderation"

const statusLabel: Record<ModerationReportStatus, string> = {
  pending: "Pendiente",
  in_review: "En revisión",
  resolved: "Resuelto",
  dismissed: "Descartado",
}

const actionLabel: Record<ModerationAction["action"], string> = {
  take_for_review: "Tomado para revisión",
  resolve: "Resuelto",
  dismiss: "Descartado",
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function statusClass(status: ModerationReportStatus): string {
  if (status === "pending") return "bg-amber-50 text-amber-800"
  if (status === "in_review") return "bg-blue-50 text-blue-800"
  if (status === "resolved") return "bg-emerald-50 text-emerald-800"
  return "bg-slate-100 text-slate-700"
}

function Snapshot({ report }: { report: ModerationReportDetail }) {
  const snapshot = report.targetSnapshot
  if (report.targetType === "listing")
    return (
      <div className="space-y-2">
        <p>
          <strong>Título:</strong> {String(snapshot.title ?? "Sin título")}
        </p>
        <p>
          <strong>Descripción:</strong>{" "}
          {String(snapshot.description ?? "Sin descripción")}
        </p>
        <p>
          <strong>Precio:</strong> {String(snapshot.price ?? "No informado")}
        </p>
        <p>
          <strong>Categoría:</strong>{" "}
          {String(snapshot.category ?? "No informada")}
        </p>
        <p>
          <strong>Estado:</strong> {String(snapshot.status ?? "No informado")}
        </p>
      </div>
    )
  if (report.targetType === "review")
    return (
      <div className="space-y-2">
        <p>
          <strong>Calificación:</strong> {String(snapshot.rating ?? "-")} / 5
        </p>
        <p>
          <strong>Comentario:</strong>{" "}
          {String(snapshot.comment ?? "Sin comentario")}
        </p>
        <p>
          <strong>Autor:</strong>{" "}
          {String(snapshot.author_display_name ?? report.subjectDisplayName)}
        </p>
        <p>
          <strong>Estado:</strong> {String(snapshot.status ?? "No informado")}
        </p>
      </div>
    )
  if (report.targetPart === "question")
    return (
      <div className="space-y-2">
        <p>
          <strong>Pregunta:</strong>{" "}
          {String(snapshot.question ?? "Sin pregunta")}
        </p>
        <p>
          <strong>Autor:</strong>{" "}
          {String(snapshot.asker_display_name ?? report.subjectDisplayName)}
        </p>
      </div>
    )
  return (
    <div className="space-y-2">
      <p>
        <strong>Respuesta:</strong> {String(snapshot.answer ?? "Sin respuesta")}
      </p>
      <p>
        <strong>Pregunta:</strong>{" "}
        {String(snapshot.question_context ?? "No disponible")}
      </p>
      <p>
        <strong>Autor:</strong>{" "}
        {String(snapshot.answerer_display_name ?? report.subjectDisplayName)}
      </p>
    </div>
  )
}

function CurrentTarget({ report }: { report: ModerationReportDetail }) {
  if (!report.targetExists)
    return (
      <p className="text-sm font-semibold text-amber-800">
        Este contenido ya no existe.
      </p>
    )
  if (!report.currentTarget)
    return (
      <p className="text-sm text-muted">No hay contexto actual disponible.</p>
    )
  return (
    <div className="space-y-2 text-sm text-petrol-dark">
      {Object.entries(report.currentTarget).map(([key, value]) => (
        <p key={key}>
          <strong>{key.replace(/_/g, " ")}:</strong> {String(value ?? "-")}
        </p>
      ))}
    </div>
  )
}

export default function AdminReportDetailPage() {
  const { reportId } = useParams<{ reportId: string }>()
  const navigate = useNavigate()
  const [report, setReport] = useState<ModerationReportDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [note, setNote] = useState("")
  const [pendingAction, setPendingAction] =
    useState<"resolved" | "dismissed" | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const loadReport = useCallback(async () => {
    if (!reportId) return
    setLoading(true)
    setError("")
    try {
      setReport(await getReport(reportId))
    } catch (caughtError) {
      setError(
        caughtError instanceof ModerationServiceError
          ? caughtError.message
          : "No pudimos cargar el reporte.",
      )
    } finally {
      setLoading(false)
    }
  }, [reportId])

  useEffect(() => {
    void loadReport()
  }, [loadReport])

  async function performAction(
    nextStatus: "in_review" | "resolved" | "dismissed",
  ) {
    if (!report || submitting) return
    setSubmitting(true)
    setError("")
    try {
      await updateReportStatus({
        reportId: report.id,
        expectedStatus: report.status,
        status: nextStatus,
        note: note.trim() || null,
      })
      setNote("")
      setPendingAction(null)
      await loadReport()
    } catch (caughtError) {
      if (
        caughtError instanceof ModerationServiceError &&
        caughtError.kind === "conflict"
      ) {
        setError(
          "Este reporte fue actualizado por otro moderador. Actualizamos la información.",
        )
        await loadReport()
      } else
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "No pudimos actualizar el reporte.",
        )
    } finally {
      setSubmitting(false)
    }
  }

  if (loading)
    return (
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-bg">
        <p className="text-sm text-muted" aria-live="polite">
          Cargando reporte…
        </p>
      </main>
    )
  if (!report)
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-bg px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="font-semibold text-red-800">
            {error || "No pudimos cargar el reporte."}
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => void loadReport()}
              className="rounded-xl bg-petrol px-4 py-2 text-sm font-bold text-white"
            >
              Reintentar
            </button>
            <Link
              to="/admin/reportes"
              className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-bold text-petrol"
            >
              Volver
            </Link>
          </div>
        </div>
      </main>
    )

  const canAct = report.status === "pending" || report.status === "in_review"
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-bg px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-5 text-sm font-bold text-petrol hover:text-orange"
        >
          ← Volver a reportes
        </button>
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange">
              Reporte #{report.id.slice(0, 8)}
            </p>
            <h1 className="mt-2 font-display text-3xl font-bold text-petrol-dark">
              Detalle del reporte
            </h1>
          </div>
          <span
            className={`self-start rounded-full px-3 py-1.5 text-sm font-bold ${statusClass(report.status)}`}
          >
            {statusLabel[report.status]}
          </span>
        </div>
        {error && (
          <div
            className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800"
            role="alert"
          >
            {error}
          </div>
        )}
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <h2 className="font-display text-lg font-bold text-petrol-dark">
                Información del reporte
              </h2>
              <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted">Tipo</dt>
                  <dd className="mt-1 font-semibold text-petrol-dark">
                    {report.targetType}
                    {report.targetType === "listing_question" &&
                      ` · ${
                        report.targetPart === "question"
                          ? "Pregunta"
                          : "Respuesta"
                      }`}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Motivo</dt>
                  <dd className="mt-1 font-semibold text-petrol-dark">
                    {report.reason.replace(/_/g, " ")}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Fecha</dt>
                  <dd className="mt-1 font-semibold text-petrol-dark">
                    {formatDate(report.createdAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Reportado por</dt>
                  <dd className="mt-1 font-semibold text-petrol-dark">
                    {report.reporterDisplayName}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Autor del contenido</dt>
                  <dd className="mt-1 font-semibold text-petrol-dark">
                    {report.subjectDisplayName}
                  </dd>
                </div>
              </dl>
              {report.details && (
                <div className="mt-5 rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted">
                    Detalles
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-petrol-dark">
                    {report.details}
                  </p>
                </div>
              )}
            </section>
            <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <h2 className="font-display text-lg font-bold text-petrol-dark">
                Contenido reportado
              </h2>
              <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-petrol-dark">
                <Snapshot report={report} />
              </div>
            </section>
            <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-bold text-petrol-dark">
                  Contexto actual
                </h2>
                <span className="text-xs text-muted">
                  {report.targetExists ? "Disponible" : "No disponible"}
                </span>
              </div>
              <div className="mt-4 rounded-xl bg-slate-50 p-4">
                <CurrentTarget report={report} />
              </div>
            </section>
          </div>
          <aside className="space-y-6">
            <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <h2 className="font-display text-lg font-bold text-petrol-dark">
                Acciones
              </h2>
              {canAct ? (
                <>
                  <label className="mt-4 block text-sm font-semibold text-petrol-dark">
                    Nota interna (opcional)
                    <textarea
                      value={note}
                      maxLength={2000}
                      onChange={(event) => setNote(event.target.value)}
                      rows={4}
                      className="mt-2 w-full resize-y rounded-xl border border-border px-3 py-2.5 font-normal outline-none focus:border-orange focus:ring-2 focus:ring-orange/20"
                      placeholder="Añade contexto para el historial…"
                    />
                  </label>
                  {pendingAction ? (
                    <div className="mt-4 rounded-xl border border-orange/30 bg-orange/5 p-4">
                      <p className="text-sm font-semibold text-petrol-dark">
                        ¿Confirmas{" "}
                        {pendingAction === "resolved"
                          ? "resolver"
                          : "descartar"}{" "}
                        este reporte?
                      </p>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => void performAction(pendingAction)}
                          className="rounded-lg bg-petrol px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
                        >
                          Confirmar
                        </button>
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => setPendingAction(null)}
                          className="rounded-lg border border-border px-3 py-2 text-sm font-bold text-petrol"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {report.status === "pending" && (
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => void performAction("in_review")}
                          className="rounded-xl bg-petrol px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                        >
                          Tomar para revisión
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => setPendingAction("resolved")}
                        className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                      >
                        Resolver
                      </button>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => setPendingAction("dismissed")}
                        className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-petrol disabled:opacity-50"
                      >
                        Descartar
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p className="mt-4 text-sm font-semibold text-muted">
                  Este reporte está cerrado. No hay acciones disponibles.
                </p>
              )}
            </section>
            <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <h2 className="font-display text-lg font-bold text-petrol-dark">
                Historial
              </h2>
              {report.actionHistory.length === 0 ? (
                <p className="mt-4 text-sm text-muted">
                  Aún no hay acciones registradas.
                </p>
              ) : (
                <ol className="mt-4 space-y-4">
                  {report.actionHistory.map((action) => (
                    <li
                      key={action.id}
                      className="border-l-2 border-orange/40 pl-4"
                    >
                      <p className="text-sm font-bold text-petrol-dark">
                        {actionLabel[action.action]}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {action.moderatorName} · {formatDate(action.createdAt)}
                      </p>
                      {action.previousStatus && (
                        <p className="mt-1 text-xs text-muted">
                          {statusLabel[action.previousStatus]} →{" "}
                          {
                            statusLabel[
                              action.newStatus ?? action.previousStatus
                            ]
                          }
                        </p>
                      )}
                      {action.note && (
                        <p className="mt-2 whitespace-pre-wrap text-sm text-petrol-dark">
                          {action.note}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </aside>
        </div>
      </div>
    </main>
  )
}
