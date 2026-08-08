import { useEffect, useMemo, useState, type FormEvent } from "react"
import { Link, useSearchParams } from "react-router-dom"
import SiteFooter from "../components/layout/SiteFooter"
import PublicListingCard from "../components/listings/PublicListingCard"
import PublicListingsSkeleton from "../components/listings/PublicListingsSkeleton"
import {
  searchPublishedListings,
  type PublicListingCard as PublicListingCardData,
} from "../services/publicListingService"

function normalizeQuery(value: string): string {
  return value.trim().replace(/\s+/g, " ")
}

export default function SearchListingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = useMemo(
    () => normalizeQuery(searchParams.get("q") ?? ""),
    [searchParams],
  )
  const [draft, setDraft] = useState(query)
  const [listings, setListings] = useState<PublicListingCardData[]>([])
  const [isLoading, setIsLoading] = useState(Boolean(query))
  const [error, setError] = useState<string | null>(null)
  const [requestNumber, setRequestNumber] = useState(0)

  useEffect(() => setDraft(query), [query])

  useEffect(() => {
    let active = true
    setError(null)

    if (!query) {
      setListings([])
      setIsLoading(false)
      return () => {
        active = false
      }
    }

    setIsLoading(true)
    void searchPublishedListings(query)
      .then((result) => {
        if (active) setListings(result)
      })
      .catch((requestError: unknown) => {
        if (!active) return
        setError(
          requestError instanceof Error
            ? requestError.message
            : "No pudimos cargar los resultados.",
        )
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [query, requestNumber])

  const updateSearch = () => {
    const nextQuery = normalizeQuery(draft)
    if (!nextQuery) return
    setSearchParams({ q: nextQuery })
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    updateSearch()
  }

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
            <span className="hidden font-display text-sm font-bold sm:block">
              Punto Repuesto <span className="text-orange">Chile</span>
            </span>
          </Link>
          <Link
            to="/publicar"
            className="rounded-xl bg-orange px-4 py-2.5 text-sm font-bold text-white transition hover:bg-orange-dark"
          >
            Publicar
          </Link>
        </div>
      </header>

      <main className="mx-auto min-h-[70vh] max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <p className="text-sm font-bold uppercase tracking-wider text-orange">
          Catálogo público
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">
          {query ? `Resultados para “${query}”` : "Buscar publicaciones"}
        </h1>

        <form
          onSubmit={submit}
          role="search"
          className="mt-7 flex max-w-3xl flex-col gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm sm:flex-row"
        >
          <label htmlFor="public-search" className="sr-only">
            Buscar publicaciones
          </label>
          <input
            id="public-search"
            type="search"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return
              event.preventDefault()
              updateSearch()
            }}
            placeholder="Busca por producto, marca, modelo o código OEM"
            className="min-w-0 flex-1 rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/15"
          />
          <button
            type="submit"
            className="rounded-xl bg-orange px-7 py-3 text-sm font-bold text-white transition hover:bg-orange-dark"
          >
            Buscar
          </button>
        </form>

        <section className="mt-10" aria-live="polite">
          {isLoading ? (
            <PublicListingsSkeleton count={8} />
          ) : error ? (
            <div
              role="alert"
              className="rounded-2xl border border-red-200 bg-white px-6 py-12 text-center shadow-sm"
            >
              <h2 className="font-display text-xl font-bold">
                No pudimos cargar los resultados.
              </h2>
              <button
                type="button"
                onClick={() => setRequestNumber((current) => current + 1)}
                className="mt-5 rounded-xl bg-petrol px-5 py-2.5 text-sm font-bold text-white hover:bg-petrol-dark"
              >
                Reintentar
              </button>
            </div>
          ) : !query ? (
            <p className="rounded-2xl border border-border bg-white px-6 py-12 text-center text-sm text-muted">
              Escribe un producto, marca, modelo, código OEM o ubicación para
              comenzar.
            </p>
          ) : listings.length === 0 ? (
            <div className="rounded-2xl border border-border bg-white px-6 py-12 text-center shadow-sm">
              <h2 className="font-display text-xl font-bold">
                No encontramos publicaciones para ‘{query}’.
              </h2>
              <ul className="mx-auto mt-4 max-w-sm list-inside list-disc text-left text-sm leading-7 text-muted">
                <li>Revisa la escritura.</li>
                <li>Prueba con menos palabras.</li>
                <li>Busca por marca o modelo.</li>
              </ul>
              <Link
                to="/"
                className="mt-6 inline-flex rounded-xl bg-petrol px-5 py-3 text-sm font-bold text-white hover:bg-petrol-dark"
              >
                Ver publicaciones recientes
              </Link>
            </div>
          ) : (
            <>
              <p className="mb-6 text-sm font-semibold text-muted">
                {listings.length}{" "}
                {listings.length === 1
                  ? "publicación encontrada"
                  : "publicaciones encontradas"}
              </p>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {listings.map((listing) => (
                  <PublicListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            </>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
