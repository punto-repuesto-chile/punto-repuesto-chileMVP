import { useCallback, useEffect, useMemo, useState } from "react"

import { Link } from "react-router-dom"

import SiteFooter from "../components/layout/SiteFooter"

import ReviewComposer from "../components/reviews/ReviewComposer"

import {
  createReview,
  deleteReview,
  getMyReceivedReviewInteractions,
  getMyReviews,
  getMySentReviewInteractions,
  respondReviewInteraction,
  updateReview,
} from "../services/reviewService"

import type {
  Review,
  ReviewInteractionAction,
  ReviewInteractionListItem,
} from "../types/review"

function statusLabel(status: ReviewInteractionListItem["status"]): string {
  return {
    pending: "Pendiente",

    confirmed: "Confirmado",

    rejected: "Rechazado",

    expired: "Expirado",
  }[status]
}

function interactionTarget(item: ReviewInteractionListItem): string {
  return item.targetType === "salvage_yard"
    ? "Desarmaduría"
    : "Vendedor particular"
}

function friendlyError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message

  return "No pudimos completar esta acción. Inténtalo nuevamente."
}

const REVIEW_EDIT_WINDOW_MS = 30 * 60 * 1000

export default function MyReviewInteractionsPage() {
  const [tab, setTab] = useState<"sent" | "received">("sent")

  const [sent, setSent] = useState<ReviewInteractionListItem[]>([])

  const [received, setReceived] = useState<ReviewInteractionListItem[]>([])

  const [reviews, setReviews] = useState<Review[]>([])

  const [isLoading, setIsLoading] = useState(true)

  const [error, setError] = useState<string | null>(null)

  const [actionId, setActionId] = useState<string | null>(null)

  const [rejectId, setRejectId] = useState<string | null>(null)

  const [composer, setComposer] = useState<{
    interactionId: string

    review?: Review
  } | null>(null)

  const [composerError, setComposerError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const load = useCallback(async () => {
    setIsLoading(true)

    setError(null)

    try {
      const [sentItems, receivedItems, ownReviews] = await Promise.all([
        getMySentReviewInteractions(),

        getMyReceivedReviewInteractions(),

        getMyReviews(),
      ])

      setSent(sentItems)

      setReceived(receivedItems)

      setReviews(ownReviews)
    } catch (loadError) {
      setError(friendlyError(loadError))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const reviewByInteraction = useMemo(
    () => new Map(reviews.map((review) => [review.interactionId, review])),

    [reviews],
  )

  const items = tab === "sent" ? sent : received

  const respond = async (
    interactionId: string,

    action: ReviewInteractionAction,
  ) => {
    setActionId(interactionId)

    setError(null)

    try {
      const next = await respondReviewInteraction(interactionId, action)

      setReceived((current) =>
        current.map((item) =>
          item.id === interactionId ? { ...item, status: next.status } : item,
        ),
      )

      setRejectId(null)
    } catch (respondError) {
      setError(friendlyError(respondError))
    } finally {
      setActionId(null)
    }
  }

  const submitReview = async (rating: number, comment: string | null) => {
    if (!composer) return

    setActionId(composer.interactionId)

    setComposerError(null)

    try {
      const next = composer.review
        ? await updateReview(composer.review.id, rating, comment)
        : await createReview(composer.interactionId, rating, comment)

      setReviews((current) =>
        composer.review
          ? current.map((review) => (review.id === next.id ? next : review))
          : [next, ...current],
      )

      setComposer(null)
    } catch (reviewError) {
      setComposerError(friendlyError(reviewError))
    } finally {
      setActionId(null)
    }
  }

  const removeReview = async (review: Review) => {
    if (
      !window.confirm(
        "¿Retirar esta reseña? Dejará de ser pública y no podrás crear otra para este trato.",
      )
    )
      return

    setActionId(review.id)

    try {
      await deleteReview(review.id)
      setReviews((current) =>
        current.map((item) =>
          item.id === review.id
            ? { ...item, status: "deleted", comment: null }
            : item,
        ),
      )
    } catch (deleteError) {
      setError(friendlyError(deleteError))
    } finally {
      setActionId(null)
    }
  }

  return (
    <div className="min-h-screen bg-bg text-petrol-dark">
      <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link
            to="/mi-perfil"
            className="text-sm font-semibold text-petrol hover:text-orange"
          >
            ← Mi perfil
          </Link>
          <Link to="/" className="font-display text-sm font-bold">
            Punto Repuesto <span className="text-orange">Chile</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-xs font-bold uppercase tracking-wider text-orange">
          Reputación
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold">
          Mis tratos
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Gestiona solicitudes de trato y califica las interacciones
          confirmadas.
        </p>
        <div
          className="mt-8 grid grid-cols-2 rounded-xl border border-border bg-white p-1"
          role="tablist"
          aria-label="Solicitudes de trato"
        >
          {(["sent", "received"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={`rounded-lg px-3 py-2.5 text-sm font-bold transition ${
                tab === value
                  ? "bg-petrol text-white"
                  : "text-muted hover:bg-bg"
              }`}
            >
              {value === "sent"
                ? "Solicitudes enviadas"
                : "Solicitudes recibidas"}
            </button>
          ))}
        </div>
        {error && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => void load()}
                className="font-bold underline"
              >
                Reintentar
              </button>
            </div>
          </div>
        )}
        {isLoading ? (
          <div
            className="mt-6 h-48 animate-pulse rounded-2xl bg-white"
            aria-busy="true"
          />
        ) : items.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border bg-white px-6 py-12 text-center text-sm text-muted">
            {tab === "sent"
              ? "Aún no has solicitado confirmaciones de trato."
              : "No tienes solicitudes recibidas."}
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {items.map((item) => {
              const review = reviewByInteraction.get(item.id)
              const canEditReview = Boolean(
                review?.status === "published" &&
                  now <=
                    new Date(review.createdAt).getTime() +
                      REVIEW_EDIT_WINDOW_MS,
              )
              return (
                <article
                  key={item.id}
                  className="rounded-2xl border border-border bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-orange">
                        {interactionTarget(item)}
                      </p>
                      <h2 className="mt-1 font-display text-lg font-bold">
                        {item.listingTitle ?? "Publicación no disponible"}
                      </h2>
                      <p className="mt-1 text-sm text-muted">
                        {tab === "sent"
                          ? `Destino: ${item.counterpartDisplayName}`
                          : `Solicitante: ${item.counterpartDisplayName}`}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Solicitado el{" "}
                        {new Intl.DateTimeFormat("es-CL", {
                          dateStyle: "medium",
                        }).format(new Date(item.requestedAt))}
                      </p>
                    </div>
                    <span
                      className={`self-start rounded-full px-3 py-1 text-xs font-bold ${
                        item.status === "confirmed"
                          ? "bg-emerald-100 text-emerald-800"
                          : item.status === "rejected" ||
                              item.status === "expired"
                            ? "bg-slate-100 text-slate-600"
                            : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {statusLabel(item.status)}
                    </span>
                  </div>
                  {tab === "received" && item.status === "pending" && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {rejectId === item.id ? (
                        <>
                          <span className="mr-2 self-center text-xs font-semibold text-muted">
                            ¿Confirmas rechazar este trato?
                          </span>
                          <button
                            type="button"
                            onClick={() => void respond(item.id, "reject")}
                            disabled={actionId === item.id}
                            className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            Sí, rechazar
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejectId(null)}
                            className="rounded-lg border border-border px-3 py-2 text-xs font-bold text-muted"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => void respond(item.id, "confirm")}
                            disabled={actionId === item.id}
                            className="rounded-lg bg-orange px-3 py-2 text-xs font-bold text-white hover:bg-orange-dark disabled:opacity-50"
                          >
                            {actionId === item.id ? "Guardando…" : "Confirmar"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejectId(item.id)}
                            disabled={actionId === item.id}
                            className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                          >
                            Rechazar
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  {tab === "sent" &&
                    item.status === "confirmed" &&
                    (review ? (
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <span className="text-sm font-semibold text-emerald-700">
                          {review.status === "deleted"
                            ? "Reseña retirada"
                            : review.status === "hidden"
                              ? "Reseña no visible"
                              : "Reseña publicada"}
                        </span>
                        {canEditReview && (
                          <button
                            type="button"
                            onClick={() => {
                              setComposerError(null)
                              setComposer({ interactionId: item.id, review })
                            }}
                            className="text-sm font-bold text-petrol hover:text-orange"
                          >
                            Editar reseña
                          </button>
                        )}
                        {review.status !== "deleted" && (
                          <button
                            type="button"
                            onClick={() => void removeReview(review)}
                            disabled={actionId === review.id}
                            className="text-sm font-bold text-red-600 hover:underline"
                          >
                            Retirar reseña
                          </button>
                        )}
                        {review.status === "published" && !canEditReview && (
                          <p className="basis-full text-xs text-muted">
                            Las reseñas pueden editarse durante 30 minutos
                            después de publicarse.
                          </p>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setComposerError(null)

                          setComposer({ interactionId: item.id })
                        }}
                        className="mt-4 rounded-xl bg-orange px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-dark"
                      >
                        Calificar trato
                      </button>
                    ))}
                </article>
              )
            })}
          </div>
        )}
      </main>
      <SiteFooter />
      {composer && (
        <ReviewComposer
          initialRating={composer.review?.rating ?? 0}
          initialComment={composer.review?.comment}
          isSubmitting={actionId === composer.interactionId}
          error={composerError}
          onClose={() => {
            if (!actionId) setComposer(null)
          }}
          onSubmit={(rating, comment) => void submitReview(rating, comment)}
        />
      )}
    </div>
  )
}
