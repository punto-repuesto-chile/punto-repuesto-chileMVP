import { useEffect, useMemo, useState } from "react"

import { Link, useParams } from "react-router-dom"

import SiteFooter from "../components/layout/SiteFooter"

import PublicListingCard from "../components/listings/PublicListingCard"

import {
  getPublicSellerProfile,
  getPublishedListingsBySeller,
  type PublicSellerProfile,
} from "../services/sellerService"

import type { PublicListingCard as PublicListingCardData } from "../services/publicListingService"

const MEMBER_DATE_FORMATTER = new Intl.DateTimeFormat("es-CL", {
  month: "long",

  year: "numeric",
})

function sellerInitials(name: string): string {
  const initials = name

    .trim()

    .split(/\s+/)

    .slice(0, 2)

    .map((part) => part[0]?.toLocaleUpperCase("es-CL") ?? "")

    .join("")

  return initials || "V"
}

function SellerProfileSkeleton() {
  return (
    <div aria-label="Cargando perfil del vendedor" aria-busy="true">
      <div className="animate-pulse rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-5">
          <div className="h-20 w-20 shrink-0 rounded-full bg-slate-200" />
          <div className="w-full max-w-sm space-y-3">
            <div className="h-7 w-3/4 rounded bg-slate-200" />
            <div className="h-4 w-1/2 rounded bg-slate-200" />
            <div className="h-4 w-2/5 rounded bg-slate-200" />
          </div>
        </div>
      </div>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="animate-pulse overflow-hidden rounded-2xl border border-border bg-white"
          >
            <div className="aspect-[4/3] bg-slate-200" />
            <div className="space-y-3 p-4">
              <div className="h-4 w-4/5 rounded bg-slate-200" />
              <div className="h-4 w-2/5 rounded bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function SellerProfilePage() {
  const { sellerId = "" } = useParams<{ sellerId: string }>()

  const [profile, setProfile] = useState<PublicSellerProfile | null>(null)

  const [listings, setListings] = useState<PublicListingCardData[]>([])

  const [isLoading, setIsLoading] = useState(true)

  const [notFound, setNotFound] = useState(false)

  const [hasError, setHasError] = useState(false)

  const [requestNumber, setRequestNumber] = useState(0)

  useEffect(() => {
    let active = true

    setIsLoading(true)

    setNotFound(false)

    setHasError(false)

    void Promise.all([
      getPublicSellerProfile(sellerId),

      getPublishedListingsBySeller(sellerId),
    ])

      .then(([sellerProfile, sellerListings]) => {
        if (!active) return

        if (!sellerProfile) {
          setProfile(null)

          setListings([])

          setNotFound(true)

          return
        }

        setProfile(sellerProfile)

        setListings(sellerListings)
      })

      .catch(() => {
        if (!active) return

        setProfile(null)

        setListings([])

        setHasError(true)
      })

      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [requestNumber, sellerId])

  const displayName = profile?.fullName.trim() || "Vendedor"

  const memberSince = useMemo(
    () =>
      profile ? MEMBER_DATE_FORMATTER.format(new Date(profile.createdAt)) : "",

    [profile],
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
            to="/buscar"
            className="rounded-xl border border-petrol px-4 py-2.5 text-sm font-bold text-petrol transition hover:bg-petrol/5"
          >
            Buscar publicaciones
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <nav aria-label="Migas de pan" className="mb-8 text-sm text-muted">
          <Link to="/" className="font-semibold hover:text-petrol">
            Inicio
          </Link>
          <span aria-hidden="true" className="mx-2">
            /
          </span>
          <span>Vendedor</span>
        </nav>

        {isLoading ? (
          <SellerProfileSkeleton />
        ) : hasError ? (
          <section
            role="alert"
            className="rounded-3xl border border-red-200 bg-white px-6 py-16 text-center shadow-sm"
          >
            <h1 className="font-display text-2xl font-extrabold">
              No pudimos cargar el perfil del vendedor.
            </h1>
            <button
              type="button"
              onClick={() => setRequestNumber((current) => current + 1)}
              className="mt-6 rounded-xl bg-petrol px-5 py-3 text-sm font-bold text-white hover:bg-petrol-dark"
            >
              Reintentar
            </button>
          </section>
        ) : notFound || !profile ? (
          <section className="rounded-3xl border border-border bg-white px-6 py-16 text-center shadow-sm">
            <h1 className="font-display text-3xl font-extrabold">
              Vendedor no encontrado
            </h1>
            <Link
              to="/"
              className="mt-6 inline-flex rounded-xl bg-orange px-6 py-3 text-sm font-bold text-white hover:bg-orange-dark"
            >
              Volver al inicio
            </Link>
          </section>
        ) : (
          <>
            <section className="rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={`Avatar de ${displayName}`}
                    className="h-20 w-20 shrink-0 rounded-full object-cover ring-4 ring-orange/15"
                  />
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-petrol font-display text-2xl font-extrabold text-white ring-4 ring-orange/15">
                    {sellerInitials(displayName)}
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-orange">
                    Perfil del vendedor
                  </p>
                  <h1 className="mt-1 font-display text-3xl font-extrabold">
                    {displayName}
                  </h1>
                  <p className="mt-2 text-sm text-muted">
                    Miembro desde {memberSince}
                  </p>
                  {(profile.region || profile.commune) && (
                    <p className="mt-1 text-sm text-muted">
                      {[profile.commune, profile.region]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                  <p className="mt-1 text-sm font-semibold text-petrol">
                    {listings.length}{" "}
                    {listings.length === 1
                      ? "publicación activa"
                      : "publicaciones activas"}
                  </p>
                </div>
              </div>
            </section>

            <section className="mt-12">
              <h2 className="font-display text-2xl font-extrabold">
                Publicaciones de este vendedor
              </h2>
              {listings.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-border bg-white px-6 py-12 text-center text-sm text-muted shadow-sm">
                  Este vendedor no tiene publicaciones activas en este momento.
                </div>
              ) : (
                <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {listings.map((listing) => (
                    <PublicListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}
