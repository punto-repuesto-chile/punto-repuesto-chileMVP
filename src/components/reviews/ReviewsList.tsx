import { useState } from "react"

import type { PublicReview } from "../../types/review"

import { getProfileAvatarPublicUrl } from "../../services/profileService"
import ReportContentDialog from "../reports/ReportContentDialog"

import StarRating from "./StarRating"

type ReviewsListProps = {
  reviews: PublicReview[]

  isLoading?: boolean

  hasMore?: boolean

  onLoadMore?: () => void

  ownReviews?: PublicReview[]

  onEdit?: (review: PublicReview) => void

  onDelete?: (review: PublicReview) => void

  emptyText?: string
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    day: "numeric",

    month: "long",

    year: "numeric",
  }).format(new Date(value))
}

export default function ReviewsList({
  reviews,

  isLoading = false,

  hasMore = false,

  onLoadMore,

  ownReviews = [],

  onEdit,

  onDelete,

  emptyText = "Aún no hay reseñas.",
}: ReviewsListProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  const allReviews = [
    ...ownReviews,

    ...reviews.filter(
      (review) => !ownReviews.some((own) => own.id === review.id),
    ),
  ]

  if (isLoading && allReviews.length === 0)
    return (
      <div
        className="mt-5 h-40 animate-pulse rounded-2xl bg-slate-100"
        aria-busy="true"
      />
    )

  if (allReviews.length === 0)
    return (
      <p className="mt-5 rounded-2xl border border-dashed border-border bg-white px-5 py-8 text-center text-sm text-muted">
        {emptyText}
      </p>
    )

  return (
    <div className="mt-5 space-y-4">
      {allReviews.map((review) => (
        <article
          key={review.id}
          className="rounded-2xl border border-border bg-white p-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              {review.reviewerAvatarPath ? (
                <img
                  src={getProfileAvatarPublicUrl(review.reviewerAvatarPath)}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-petrol text-sm font-bold text-white">
                  {review.reviewerDisplayName.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-petrol-dark">
                  {review.reviewerDisplayName}
                </p>
                <p className="text-xs text-muted">
                  {formatDate(review.createdAt)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <ReportContentDialog
                targetType="review"
                targetId={review.id}
                title="Reportar reseña"
                disabled={ownReviews.some((own) => own.id === review.id)}
              />
              {onEdit &&
                onDelete &&
                ownReviews.some((own) => own.id === review.id) && (
                  <div className="relative">
                    <button
                      type="button"
                      aria-label="Acciones de reseña"
                      onClick={() =>
                        setOpenMenu(openMenu === review.id ? null : review.id)
                      }
                      className="rounded-lg px-2 py-1 text-lg text-muted hover:bg-bg"
                    >
                      ⋯
                    </button>
                    {openMenu === review.id && (
                      <div className="absolute right-0 top-9 z-10 w-36 rounded-xl border border-border bg-white p-1 shadow-lg">
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenu(null)

                            onEdit(review)
                          }}
                          className="block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-petrol-dark hover:bg-bg"
                        >
                          Editar reseña
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenu(null)

                            onDelete(review)
                          }}
                          className="block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          Eliminar reseña
                        </button>
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <StarRating
              value={review.rating}
              label={`${review.rating} de 5 estrellas`}
            />
            <span className="rounded-full bg-orange/10 px-2.5 py-1 text-[11px] font-bold text-orange-dark">
              Trato confirmado
            </span>
          </div>
          {review.comment && (
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-muted">
              {review.comment}
            </p>
          )}
        </article>
      ))}
      {hasMore && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={isLoading}
          className="mx-auto block rounded-xl border border-petrol px-4 py-2.5 text-sm font-bold text-petrol transition hover:bg-petrol/5 disabled:opacity-50"
        >
          {isLoading ? "Cargando…" : "Ver más"}
        </button>
      )}
    </div>
  )
}
