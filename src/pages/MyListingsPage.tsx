import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import MyListingCard from "../components/listings/MyListingCard"
import MyListingsEmptyState from "../components/listings/MyListingsEmptyState"
import MyListingsFilters, {
  type ListingsFilter,
} from "../components/listings/MyListingsFilters"
import MyListingsSkeleton from "../components/listings/MyListingsSkeleton"
import {
  getMyListings,
  type ListingStatus,
  type MyListing,
} from "../services/listingService"

const STATUSES: ListingStatus[] = ["published", "draft", "paused", "sold"]

export default function MyListingsPage() {
  const [listings, setListings] = useState<MyListing[]>([])
  const [activeFilter, setActiveFilter] = useState<ListingsFilter>("all")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requestNumber, setRequestNumber] = useState(0)

  useEffect(() => {
    let active = true
    setIsLoading(true)
    setError(null)

    void getMyListings()
      .then((result) => {
        if (active) setListings(result)
      })
      .catch((requestError: unknown) => {
        if (!active) return
        const message =
          requestError instanceof Error
            ? requestError.message
            : "No pudimos cargar tus publicaciones."
        console.error("Error al cargar publicaciones:", message)
        setError(message)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [requestNumber])

  const counts = useMemo(() => {
    const result: Record<ListingsFilter, number> = {
      all: listings.length,
      published: 0,
      draft: 0,
      paused: 0,
      sold: 0,
    }
    for (const status of STATUSES)
      result[status] = listings.filter(
        (listing) => listing.status === status,
      ).length
    return result
  }, [listings])

  const filteredListings = useMemo(
    () =>
      activeFilter === "all"
        ? listings
        : listings.filter((listing) => listing.status === activeFilter),
    [activeFilter, listings],
  )

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
            Nueva publicación
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-orange">
              Panel del vendedor
            </p>
            <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">
              Mis publicaciones
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              Revisa el estado y la información principal de los productos que
              has publicado.
            </p>
          </div>
          {!isLoading && !error && listings.length > 0 && (
            <p className="text-sm font-semibold text-muted">
              {listings.length}{" "}
              {listings.length === 1 ? "publicación" : "publicaciones"}
            </p>
          )}
        </div>

        {isLoading ? (
          <MyListingsSkeleton />
        ) : error ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-white px-6 py-10 text-center shadow-sm"
          >
            <h2 className="font-display text-xl font-bold text-petrol-dark">
              No pudimos cargar tus publicaciones
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">{error}</p>
            <button
              type="button"
              onClick={() => setRequestNumber((current) => current + 1)}
              className="mt-5 rounded-xl bg-petrol px-5 py-2.5 text-sm font-bold text-white hover:bg-petrol-dark"
            >
              Reintentar
            </button>
          </div>
        ) : listings.length === 0 ? (
          <MyListingsEmptyState />
        ) : (
          <>
            <div className="mb-6">
              <MyListingsFilters
                activeFilter={activeFilter}
                counts={counts}
                onChange={setActiveFilter}
              />
            </div>
            {filteredListings.length === 0 ? (
              <MyListingsEmptyState filtered />
            ) : (
              <div className="space-y-4">
                {filteredListings.map((listing) => (
                  <MyListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
