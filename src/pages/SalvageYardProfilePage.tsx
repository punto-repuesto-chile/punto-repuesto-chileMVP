import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import PublicListingCard from "../components/listings/PublicListingCard"
import { getPublicSalvageYard } from "../services/salvageYardService"
import { getPublishedListingsBySalvageYard } from "../services/sellerService"
import type { PublicListingCard as Listing } from "../services/publicListingService"
import type { PublicSalvageYard } from "../types/salvageYard"
import {
  getSalvageYardReputation,
  getSalvageYardReviews,
} from "../services/reviewService"
import type { PublicReview, ReputationSummary } from "../types/review"
import ReputationSection from "../components/reviews/ReputationSection"

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
function phoneHref(value: string): string {
  return `tel:${value.replace(/[^+\d]/g, "")}`
}
function whatsappHref(value: string): string {
  return `https://wa.me/${value.replace(/\D/g, "")}`
}

export default function SalvageYardProfilePage() {
  const { id = "" } = useParams()
  const [yard, setYard] = useState<PublicSalvageYard | null>(null)
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [reputation, setReputation] = useState<ReputationSummary | null>(null)
  const [reviews, setReviews] = useState<PublicReview[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [reviewsOffset, setReviewsOffset] = useState(0)
  const [reviewsHasMore, setReviewsHasMore] = useState(false)
  useEffect(() => {
    let active = true
    if (!UUID.test(id)) {
      setLoading(false)
      return
    }
    setReviewsLoading(true)
    Promise.all([
      getPublicSalvageYard(id),
      getPublishedListingsBySalvageYard(id),
      getSalvageYardReputation(id),
      getSalvageYardReviews(id, { limit: 10, offset: 0 }),
    ])
      .then(([nextYard, nextListings, nextReputation, nextReviews]) => {
        if (!active) return
        setYard(nextYard)
        setListings(nextListings)
        setReputation(nextReputation)
        setReviews(nextReviews)
        setReviewsOffset(nextReviews.length)
        setReviewsHasMore(nextReviews.length === 10)
      })
      .catch(() => {
        if (active) setError(true)
      })
      .finally(() => {
        if (active) {
          setLoading(false)
          setReviewsLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [id])

  const loadMoreReviews = async () => {
    setReviewsLoading(true)
    try {
      const nextReviews = await getSalvageYardReviews(id, {
        limit: 10,
        offset: reviewsOffset,
      })
      setReviews((current) => [...current, ...nextReviews])
      setReviewsOffset((current) => current + nextReviews.length)
      setReviewsHasMore(nextReviews.length === 10)
    } finally {
      setReviewsLoading(false)
    }
  }
  if (loading)
    return (
      <main className="min-h-screen bg-bg px-4 py-10">
        <div className="mx-auto max-w-5xl animate-pulse rounded-3xl border border-border bg-white p-8">
          <div className="h-12 w-72 rounded bg-slate-200" />
          <div className="mt-8 h-40 rounded bg-slate-200" />
        </div>
      </main>
    )
  if (error || !yard)
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg px-4">
        <div className="w-full max-w-lg rounded-3xl border border-border bg-white p-10 text-center">
          <h1 className="font-display text-2xl font-bold">
            Desarmaduría no encontrada
          </h1>
          <p className="mt-3 text-sm text-muted">
            No encontramos una desarmaduría pública con ese enlace.
          </p>
          <Link
            to="/desarmadurias"
            className="mt-6 inline-flex rounded-xl bg-orange px-5 py-3 text-sm font-bold text-white"
          >
            Ver desarmadurías
          </Link>
        </div>
      </main>
    )
  return (
    <main className="min-h-screen bg-bg px-4 py-10 text-petrol-dark sm:px-6 sm:py-14">
      <div className="mx-auto max-w-5xl">
        <Link
          to="/desarmadurias"
          className="text-sm font-semibold text-petrol hover:text-orange"
        >
          ← Ver desarmadurías
        </Link>
        <section className="mt-8 rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            {yard.logoUrl ? (
              <img
                src={yard.logoUrl}
                alt={`Logo de ${yard.businessName}`}
                className="h-28 w-28 rounded-3xl object-cover"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-petrol text-3xl font-extrabold text-white">
                {yard.businessName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-orange">
                Desarmaduría activa
              </p>
              <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">
                {yard.businessName}
              </h1>
              <p className="mt-2 text-sm text-muted">
                {yard.region} · {yard.commune}
              </p>
              <p className="mt-4 whitespace-pre-line text-sm leading-6 text-muted">
                {yard.description || "Información comercial de este negocio."}
              </p>
            </div>
          </div>
          <div className="mt-8 grid gap-4 border-t border-border pt-6 sm:grid-cols-2">
            {yard.publicAddress && (
              <div>
                <p className="text-xs font-bold uppercase text-muted">
                  Dirección
                </p>
                <p className="mt-1 text-sm">{yard.publicAddress}</p>
              </div>
            )}
            {yard.openingHours && (
              <div>
                <p className="text-xs font-bold uppercase text-muted">
                  Horario
                </p>
                <p className="mt-1 whitespace-pre-line text-sm">
                  {yard.openingHours}
                </p>
              </div>
            )}
            {yard.phone && (
              <a
                href={phoneHref(yard.phone)}
                className="text-sm font-semibold text-petrol hover:text-orange"
              >
                Llamar: {yard.phone}
              </a>
            )}
            {yard.whatsapp && (
              <a
                href={whatsappHref(yard.whatsapp)}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold text-petrol hover:text-orange"
              >
                WhatsApp: {yard.whatsapp}
              </a>
            )}
          </div>
          <p className="mt-6 text-xs text-muted">
            En Punto Repuesto desde{" "}
            {new Date(yard.createdAt).toLocaleDateString("es-CL")}
          </p>
        </section>
        <ReputationSection
          summary={reputation}
          reviews={reviews}
          isLoading={reviewsLoading}
          hasMore={reviewsHasMore}
          onLoadMore={() => void loadMoreReviews()}
        />
        <section className="mt-10">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-orange">
                Inventario público
              </p>
              <h2 className="mt-1 font-display text-2xl font-bold">
                Publicaciones activas
              </h2>
            </div>
            <span className="text-sm font-semibold text-muted">
              {listings.length} publicaciones
            </span>
          </div>
          {listings.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-border bg-white p-10 text-center text-sm text-muted">
              Esta desarmaduría aún no tiene publicaciones activas.
            </div>
          ) : (
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing) => (
                <PublicListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
