import type { PublicReview, ReputationSummary } from "../../types/review"

import ReviewsList from "./ReviewsList"

import StarRating from "./StarRating"

type ReputationSectionProps = {
  summary: ReputationSummary | null

  reviews: PublicReview[]

  isLoading?: boolean

  hasMore?: boolean

  onLoadMore?: () => void

  title?: string

  summaryLabel?: string

  emptyText?: string
  className?: string
}

export default function ReputationSection({
  summary,

  reviews,

  isLoading,

  hasMore,

  onLoadMore,

  title = "Opiniones de la comunidad",

  summaryLabel = "Reputación",

  emptyText,
  className = "mt-12",
}: ReputationSectionProps) {
  return (
    <section className={className} aria-labelledby="reputation-title">
      <div className="flex flex-col gap-5 rounded-3xl border border-border bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-orange">
            {summaryLabel}
          </p>
          <h2
            id="reputation-title"
            className="mt-1 font-display text-2xl font-extrabold"
          >
            {title}
          </h2>
        </div>
        {summary?.reviewCount ? (
          <div className="flex items-center gap-3">
            <StarRating
              value={summary.averageRating ?? 0}
              label={`${summary.averageRating ?? 0} de 5 estrellas`}
              size="lg"
            />
            <div>
              <p className="font-display text-2xl font-extrabold">
                {summary.averageRating?.toFixed(1)}
              </p>
              <p className="text-xs text-muted">
                {summary.reviewCount}{" "}
                {summary.reviewCount === 1 ? "reseña" : "reseñas"}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm font-semibold text-muted">
            Sin reseñas todavía
          </p>
        )}
      </div>
      <ReviewsList
        reviews={reviews}
        isLoading={isLoading}
        hasMore={hasMore}
        onLoadMore={onLoadMore}
        emptyText={emptyText}
      />
    </section>
  )
}
