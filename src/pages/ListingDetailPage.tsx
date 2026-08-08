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

import {
  getPublishedListingById,
  type PublishedListing,
} from "../services/listingService"

export default function ListingDetailPage() {
  const { id = "" } = useParams<{ id: string }>()

  const [listing, setListing] = useState<PublishedListing | null>(null)

  const [isLoading, setIsLoading] = useState(true)

  const [notFound, setNotFound] = useState(false)

  const [error, setError] = useState<string | null>(null)

  const [requestNumber, setRequestNumber] = useState(0)

  useEffect(() => {
    let active = true

    setIsLoading(true)

    setNotFound(false)

    setError(null)

    void getPublishedListingById(id)

      .then((result) => {
        if (!active) return

        if (!result) {
          setListing(null)

          setNotFound(true)

          return
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
          <div className="flex flex-col" style={{ gap: "4rem" }}>
            <div
              className="relative grid items-start lg:grid-cols-[1.12fr_0.88fr]"
              style={{ gap: "3rem" }}
            >
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
              />
              <div className="flex flex-col" style={{ gap: "2.75rem" }}>
                <ListingDetails listing={listing} />
                <SellerContactCard
                  name={listing.contactName}
                  phone={listing.contactPhone}
                  allowWhatsapp={listing.allowWhatsapp}
                />
              </div>
            </div>
            <div className="grid lg:grid-cols-2" style={{ gap: "3rem" }}>
              <ListingCompatibility listing={listing} />
              <ListingDelivery methods={listing.deliveryMethods} />
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}
