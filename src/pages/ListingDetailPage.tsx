import { useEffect, useState } from "react"

import { Link, useParams } from "react-router-dom"

import SiteFooter from "../components/layout/SiteFooter"

import FavoriteButton from "../components/favorites/FavoriteButton"

import ListingCompatibility from "../components/listings/ListingCompatibility"

import ListingDelivery from "../components/listings/ListingDelivery"

import ListingDetails from "../components/listings/ListingDetails"

import ListingDetailSkeleton from "../components/listings/ListingDetailSkeleton"

import ListingGallery from "../components/listings/ListingGallery"

import SellerContactCard from "../components/listings/SellerContactCard"

import ReputationSection from "../components/reviews/ReputationSection"

import ListingQuestionsSection from "../components/questions/ListingQuestionsSection"

import ChatContactButton from "../components/listings/ChatContactButton"

import {
  getPublishedListingById,
  type PublishedListing,
} from "../services/listingService"

import { getPublicSalvageYard } from "../services/salvageYardService"

import type { PublicSalvageYard } from "../types/salvageYard"

import {
  getListingReviews,
  getSalvageYardReputation,
  getSellerReputation,
} from "../services/reviewService"

import type { PublicReview, ReputationSummary } from "../types/review"

export default function ListingDetailPage() {
  const { id = "" } = useParams<{ id: string }>()

  const [listing, setListing] = useState<PublishedListing | null>(null)

  const [salvageYard, setSalvageYard] = useState<PublicSalvageYard | null>(null)

  const [isLoading, setIsLoading] = useState(true)

  const [notFound, setNotFound] = useState(false)

  const [error, setError] = useState<string | null>(null)

  const [requestNumber, setRequestNumber] = useState(0)

  const [listingReviews, setListingReviews] = useState<PublicReview[]>([])

  const [reviewTotal, setReviewTotal] = useState(0)

  const [reputation, setReputation] = useState<ReputationSummary | null>(null)

  const [isReviewsLoading, setIsReviewsLoading] = useState(false)

  const [reviewsError, setReviewsError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    setIsLoading(true)

    setNotFound(false)

    setError(null)

    setSalvageYard(null)

    void getPublishedListingById(id)

      .then(async (result) => {
        if (!active) return

        if (!result) {
          setListing(null)

          setNotFound(true)

          return
        }

        if (result.salvageYardId) {
          const yard = await getPublicSalvageYard(result.salvageYardId)

          if (!active) return

          if (!yard) {
            setListing(null)

            setNotFound(true)

            return
          }

          setSalvageYard(yard)
        }

        setListing(result)
      })

      .catch((requestError: unknown) => {
        if (!active) return

        const message =
          requestError instanceof Error
            ? requestError.message
            : "No pudimos cargar esta publicación."

        if (import.meta.env.DEV)
          console.error("Error al cargar el detalle:", message)

        setError(message)
      })

      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [id, requestNumber])

  useEffect(() => {
    if (!listing) return

    let active = true

    setIsReviewsLoading(true)

    setReviewsError(null)

    setListingReviews([])

    setReviewTotal(0)

    const reputationRequest = listing.salvageYardId
      ? getSalvageYardReputation(listing.salvageYardId)
      : getSellerReputation(listing.sellerId)

    void Promise.all([
      getListingReviews(listing.id, { limit: 10, offset: 0 }),

      reputationRequest,
    ])

      .then(([reviewsResult, reputationResult]) => {
        if (!active) return

        setListingReviews(reviewsResult.reviews)

        setReviewTotal(reviewsResult.totalCount)

        setReputation(reputationResult)
      })

      .catch((reviewsRequestError: unknown) => {
        if (!active) return

        setReviewsError(
          reviewsRequestError instanceof Error
            ? reviewsRequestError.message
            : "No pudimos cargar la reputación.",
        )
      })

      .finally(() => {
        if (active) setIsReviewsLoading(false)
      })

    return () => {
      active = false
    }
  }, [listing])

  const loadMoreReviews = async () => {
    if (!listing || isReviewsLoading) return

    setIsReviewsLoading(true)

    setReviewsError(null)

    try {
      const result = await getListingReviews(listing.id, {
        limit: 10,

        offset: listingReviews.length,
      })

      setListingReviews((current) => [
        ...current,

        ...result.reviews.filter(
          (review) => !current.some((item) => item.id === review.id),
        ),
      ])

      setReviewTotal(result.totalCount)
    } catch (reviewsRequestError) {
      setReviewsError(
        reviewsRequestError instanceof Error
          ? reviewsRequestError.message
          : "No pudimos cargar más reseñas.",
      )
    } finally {
      setIsReviewsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg text-petrol-dark">
      <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            to="/"
            className="flex items-center gap-2"
            aria-label="Ir al inicio"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-petrol text-xs font-bold text-white">
              PR
            </span>
            <span className="hidden font-display text-sm font-bold sm:block">
              Punto Repuesto <span className="text-orange">Chile</span>
            </span>
          </Link>
          <Link
            to="/publicar"
            className="rounded-xl bg-orange px-4 py-2.5 text-sm font-bold text-white transition hover:bg-orange-dark"
          >
            Publicar producto
          </Link>
        </div>
      </header>

      <main
        className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 sm:pt-14"
        style={{ paddingBottom: "6rem" }}
      >
        <nav aria-label="Migas de pan" className="mb-8 text-sm text-muted">
          <Link to="/" className="font-semibold hover:text-petrol">
            Inicio
          </Link>
          <span aria-hidden="true" className="mx-2">
            /
          </span>
          <span>Publicación</span>
        </nav>

        {isLoading ? (
          <ListingDetailSkeleton />
        ) : error ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-white px-6 py-12 text-center shadow-sm"
          >
            <h1 className="font-display text-2xl font-extrabold">
              No pudimos cargar la publicación
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted">{error}</p>
            <button
              type="button"
              onClick={() => setRequestNumber((current) => current + 1)}
              className="mt-6 rounded-xl bg-petrol px-5 py-3 text-sm font-bold text-white hover:bg-petrol-dark"
            >
              Reintentar
            </button>
          </div>
        ) : notFound || !listing ? (
          <div className="rounded-3xl border border-border bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange/10 text-2xl font-bold text-orange">
              ?
            </div>
            <h1 className="mt-5 font-display text-3xl font-extrabold">
              Publicación no encontrada
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">
              Es posible que la publicación ya no esté disponible o que el
              enlace no sea correcto.
            </p>
            <Link
              to="/"
              className="mt-6 inline-flex rounded-xl bg-orange px-6 py-3 text-sm font-bold text-white hover:bg-orange-dark"
            >
              Volver al inicio
            </Link>
          </div>
        ) : (
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.65fr)_minmax(18rem,0.75fr)] lg:gap-x-12 lg:gap-y-10 xl:grid-cols-[minmax(0,1.8fr)_minmax(20rem,0.8fr)]">
            <div className="contents lg:col-start-1 lg:row-start-1 lg:flex lg:min-w-0 lg:flex-col lg:gap-10">
              <div className="relative order-2 min-w-0 lg:order-none">
                <FavoriteButton
                  listingId={listing.id}
                  className="absolute right-3 top-3 z-20 sm:right-4 sm:top-4"
                />
                <ListingGallery
                  images={listing.images}
                  title={listing.title}
                  category={listing.category}
                  condition={listing.condition}
                  price={listing.price}
                  commune={listing.commune}
                  stock={listing.stock}
                  showSummary={false}
                />
              </div>

              <div className="order-4 min-w-0 lg:order-none">
                <ListingCompatibility listing={listing} />
              </div>

              <div className="order-5 min-w-0 lg:order-none">
                <ListingDelivery methods={listing.deliveryMethods} />
              </div>

              <div className="order-6 min-w-0 lg:order-none">
                {reviewsError && (
                  <p
                    role="alert"
                    className="mb-4 text-sm font-semibold text-red-700"
                  >
                    {reviewsError}
                  </p>
                )}
                <ReputationSection
                  summary={reputation}
                  reviews={listingReviews}
                  isLoading={isReviewsLoading}
                  hasMore={listingReviews.length < reviewTotal}
                  onLoadMore={() => void loadMoreReviews()}
                  summaryLabel={
                    listing.salvageYardId
                      ? "Reputación de la desarmaduría"
                      : "Reputación del vendedor"
                  }
                  title="Reseñas de compradores de esta publicación"
                  emptyText="No hay reseñas asociadas a esta publicación todavía."
                  className="mt-0"
                />
              </div>

              <div className="order-7 min-w-0 lg:order-none">
                <ListingQuestionsSection
                  listingId={listing.id}
                  sellerId={listing.sellerId}
                />
              </div>
            </div>

            <aside className="contents lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1 lg:flex lg:min-w-0 lg:flex-col lg:gap-8 lg:self-start">
              <div className="order-1 min-w-0 lg:order-none">
                <ListingDetails listing={listing} />
              </div>

              <div className="order-3 min-w-0 lg:order-none">
                <SellerContactCard
                  name={listing.contactName}
                  phone={listing.contactPhone}
                  allowWhatsapp={listing.allowWhatsapp}
                  sellerId={listing.sellerId}
                  salvageYard={salvageYard}
                />
                <div className="mt-3">
                  <ChatContactButton
                    listingId={listing.id}
                    sellerId={listing.sellerId}
                  />
                </div>
              </div>
            </aside>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}
