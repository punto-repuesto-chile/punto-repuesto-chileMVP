import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import SiteFooter from "../components/layout/SiteFooter"
import PublicListingCard from "../components/listings/PublicListingCard"
import PublicListingsSkeleton from "../components/listings/PublicListingsSkeleton"
import { useFavorites } from "../context/FavoritesContext"
import { getFavoriteListings } from "../services/favoriteService"
import type { PublicListingCard as PublicListingCardData } from "../services/publicListingService"

export default function FavoritesPage() {
  const { favoriteListingIds } = useFavorites()
  const [listings, setListings] = useState<PublicListingCardData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requestNumber, setRequestNumber] = useState(0)

  useEffect(() => {
    let active = true
    setIsLoading(true)
    setError(null)
    void getFavoriteListings()
      .then((result) => {
        if (active) setListings(result)
      })
      .catch((requestError: unknown) => {
        if (!active) return
        setError(
          requestError instanceof Error
            ? requestError.message
            : "No pudimos cargar tus favoritos.",
        )
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [requestNumber])

  useEffect(() => {
    setListings((current) =>
      current.filter((listing) => favoriteListingIds.has(listing.id)),
    )
  }, [favoriteListingIds])

  return (
    <div className="min-h-screen bg-bg text-petrol-dark">
      <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="flex items-center gap-2"
            aria-label="Ir al inicio"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-petrol text-xs font-bold text-white">
              PR
            </span>
            <span className="font-display text-sm font-bold">
              Punto Repuesto <span className="text-orange">Chile</span>
            </span>
          </Link>
          <Link
            to="/buscar"
            className="rounded-xl border border-petrol px-4 py-2 text-sm font-bold text-petrol hover:bg-petrol/5"
          >
            Explorar
          </Link>
        </div>
      </header>

      <main className="mx-auto min-h-[70vh] max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <p className="text-sm font-bold uppercase tracking-wider text-orange">
          Tu selección
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">
          Mis favoritos
        </h1>

        <div className="mt-8">
          {isLoading ? (
            <PublicListingsSkeleton count={6} />
          ) : error ? (
            <div
              role="alert"
              className="rounded-2xl border border-red-200 bg-white px-6 py-12 text-center shadow-sm"
            >
              <h2 className="font-display text-xl font-bold">
                No pudimos cargar tus favoritos.
              </h2>
              <button
                type="button"
                onClick={() => setRequestNumber((current) => current + 1)}
                className="mt-5 rounded-xl bg-petrol px-5 py-2.5 text-sm font-bold text-white"
              >
                Reintentar
              </button>
            </div>
          ) : listings.length === 0 ? (
            <div className="rounded-3xl border border-border bg-white px-6 py-16 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange/10 text-3xl text-orange">
                ♡
              </div>
              <h2 className="mt-5 font-display text-2xl font-extrabold">
                Aún no tienes favoritos
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm text-muted">
                Guarda publicaciones que te interesen para encontrarlas
                rápidamente.
              </p>
              <Link
                to="/buscar"
                className="mt-6 inline-flex rounded-xl bg-orange px-6 py-3 text-sm font-bold text-white hover:bg-orange-dark"
              >
                Explorar publicaciones
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {listings.map((listing) => (
                <PublicListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
