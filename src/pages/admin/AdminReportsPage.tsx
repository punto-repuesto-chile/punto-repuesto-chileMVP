import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import {
  getReports,
  ModerationServiceError,
} from "../../services/moderationService"
import type {
  GetModerationReportsInput,
  ModerationReportListItem,
  ModerationReportStatus,
  ModerationTargetType,
} from "../../types/moderation"

const statusOptions: Array<{
  value: ModerationReportStatus | ""
  label: string
}> = [
  { value: "", label: "Todos" },
  { value: "pending", label: "Pendientes" },
  { value: "in_review", label: "En revisión" },
  { value: "resolved", label: "Resueltos" },
  { value: "dismissed", label: "Descartados" },
]

const targetOptions = [
  { value: "", label: "Todos" },
  { value: "listing", label: "Publicaciones" },
  { value: "review", label: "Reseñas" },
  { value: "question", label: "Preguntas" },
  { value: "answer", label: "Respuestas" },
] as const

const statusLabel: Record<ModerationReportStatus, string> = {
  pending: "Pendiente",
  in_review: "En revisión",
  resolved: "Resuelto",
  dismissed: "Descartado",
}

const targetLabel: Record<ModerationTargetType, string> = {
  listing: "Publicación",
  review: "Reseña",
  listing_question: "Pregunta / respuesta",
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function summaryText(report: ModerationReportListItem): string {
  const summary = report.snapshotSummary
  const value =
    summary.title ?? summary.comment ?? summary.question ?? summary.answer
  return typeof value === "string" && value.trim()
    ? value
    : "Sin resumen disponible"
}

function statusClass(status: ModerationReportStatus): string {
  if (status === "pending") return "bg-amber-50 text-amber-800"
  if (status === "in_review") return "bg-blue-50 text-blue-800"
  if (status === "resolved") return "bg-emerald-50 text-emerald-800"
  return "bg-slate-100 text-slate-700"
}

function LoadingRows() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Cargando reportes">
      {[1, 2, 3, 4].map((item) => (
        <div
          key={item}
          className="h-24 animate-pulse rounded-2xl bg-slate-100"
        />
      ))}
    </div>
  )
}

export default function AdminReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [status, setStatus] = useState<ModerationReportStatus | "">(
    searchParams.get("status") as ModerationReportStatus | "" || "",
  )
  const [target, setTarget] = useState<typeof targetOptions[number]["value"]>(
    searchParams.get("target") as typeof targetOptions[number]["value"] || "",
  )
  const [reports, setReports] = useState<ModerationReportListItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadReports = useCallback(async () => {
    setLoading(true)
    setError("")
    const input: GetModerationReportsInput = {
      status: status || null,
      targetType:
        target === "question" || target === "answer"
          ? "listing_question"
          : (target || null) as ModerationTargetType | null,
      limit: 25,
      offset: page * 25,
    }
    try {
      const result = await getReports(input)
      setReports(
        result.reports.filter((report) =>
          target === "question" || target === "answer"
            ? report.targetPart === target
            : true,
        ),
      )
      setTotalCount(result.totalCount)
    } catch (caughtError) {
      if (
        caughtError instanceof ModerationServiceError &&
        caughtError.kind === "forbidden"
      ) {
        setError("No tienes permisos para acceder a moderación.")
      } else {
        setError("No pudimos cargar los reportes.")
      }
    } finally {
      setLoading(false)
    }
  }, [page, status, target])

  useEffect(() => {
    void loadReports()
  }, [loadReports])

  const visibleRange = useMemo(() => {
    if (!totalCount) return "0 de 0"
    const first = page * 25 + 1
    const last = Math.min((page + 1) * 25, totalCount)
    return `${first}–${last} de ${totalCount}`
  }, [page, totalCount])

  function changeFilter(kind: "status" | "target", value: string) {
    setPage(0)
    if (kind === "status") setStatus(value as ModerationReportStatus | "")
    else setTarget(value as typeof targetOptions[number]["value"])
    const next = new URLSearchParams(searchParams)
    if (value) next.set(kind, value)
    else next.delete(kind)
    setSearchParams(next)
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-bg px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange">
              Administración
            </p>
            <h1 className="mt-2 font-display text-3xl font-bold text-petrol-dark">
              Reportes
            </h1>
            <p className="mt-2 text-sm text-muted">
              Revisa y gestiona los reportes de la comunidad.
            </p>
          </div>
          <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-muted shadow-sm">
            Página {page + 1}
          </span>
        </div>

        <section
          className="mb-6 rounded-2xl border border-border bg-white p-4 shadow-sm"
          aria-label="Filtros de reportes"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-petrol-dark">
              Estado
              <select
                value={status}
                onChange={(event) => changeFilter("status", event.target.value)}
                className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2.5 font-normal text-petrol-dark outline-none focus:border-orange focus:ring-2 focus:ring-orange/20"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-petrol-dark">
              Tipo
              <select
                value={target}
                onChange={(event) => changeFilter("target", event.target.value)}
                className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2.5 font-normal text-petrol-dark outline-none focus:border-orange focus:ring-2 focus:ring-orange/20"
              >
                {targetOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {(target === "question" || target === "answer") && (
            <p className="mt-3 text-xs text-muted">
              El filtro de preguntas y respuestas se aplica sobre la página
              cargada.
            </p>
          )}
        </section>

        {loading ? (
          <LoadingRows />
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm font-semibold text-red-800">{error}</p>
            <button
              type="button"
              onClick={() => void loadReports()}
              className="mt-4 rounded-xl bg-petrol px-4 py-2 text-sm font-bold text-white hover:bg-petrol-dark"
            >
              Reintentar
            </button>
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-2xl border border-border bg-white p-12 text-center shadow-sm">
            <p className="text-sm font-medium text-muted">
              No hay reportes para estos filtros.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-2xl border border-border bg-white shadow-sm lg:block">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Listado de reportes</caption>
                <thead className="border-b border-border bg-slate-50 text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-5 py-4">Fecha</th>
                    <th className="px-5 py-4">Tipo / motivo</th>
                    <th className="px-5 py-4">Resumen</th>
                    <th className="px-5 py-4">Personas</th>
                    <th className="px-5 py-4">Estado</th>
                    <th className="px-5 py-4">
                      <span className="sr-only">Acción</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {reports.map((report) => (
                    <tr key={report.id} className="align-top">
                      <td className="whitespace-nowrap px-5 py-4 text-muted">
                        {formatDate(report.createdAt)}
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-petrol-dark">
                          {targetLabel[report.targetType]}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          {report.reason.replace(/_/g, " ")}
                        </p>
                      </td>
                      <td className="max-w-xs px-5 py-4">
                        <p className="truncate text-petrol-dark">
                          {summaryText(report)}
                        </p>
                        {report.hasDetails && (
                          <span className="mt-2 inline-flex rounded-full bg-orange/10 px-2 py-1 text-[11px] font-bold text-orange-dark">
                            Tiene detalles
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs text-muted">
                        <p>
                          Reportó:{" "}
                          <span className="font-semibold text-petrol-dark">
                            {report.reporterDisplayName}
                          </span>
                        </p>
                        <p className="mt-1">
                          Autor:{" "}
                          <span className="font-semibold text-petrol-dark">
                            {report.subjectDisplayName}
                          </span>
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(report.status)}`}
                        >
                          {statusLabel[report.status]}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          to={`/admin/reportes/${report.id}`}
                          className="whitespace-nowrap rounded-lg border border-border px-3 py-2 text-xs font-bold text-petrol hover:border-orange hover:text-orange"
                        >
                          Revisar
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-3 lg:hidden">
              {reports.map((report) => (
                <article
                  key={report.id}
                  className="rounded-2xl border border-border bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-muted">
                        {formatDate(report.createdAt)}
                      </p>
                      <p className="mt-1 font-bold text-petrol-dark">
                        {targetLabel[report.targetType]}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(report.status)}`}
                    >
                      {statusLabel[report.status]}
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm text-petrol-dark">
                    {summaryText(report)}
                  </p>
                  <p className="mt-3 text-xs text-muted">
                    Reportó {report.reporterDisplayName} · Autor{" "}
                    {report.subjectDisplayName}
                  </p>
                  <Link
                    to={`/admin/reportes/${report.id}`}
                    className="mt-4 inline-flex rounded-lg border border-border px-3 py-2 text-xs font-bold text-petrol"
                  >
                    Revisar
                  </Link>
                </article>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-muted">{visibleRange}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage((current) => current - 1)}
                  className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-bold text-petrol disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={(page + 1) * 25 >= totalCount}
                  onClick={() => setPage((current) => current + 1)}
                  className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-bold text-petrol disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
