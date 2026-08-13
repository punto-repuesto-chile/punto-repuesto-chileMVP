import { Link } from "react-router-dom"

import type {
  MyListing,
  OwnedListingAction,
} from "../../services/listingService"

import ListingStatusBadge from "./ListingStatusBadge"

const PRICE_FORMATTER = new Intl.NumberFormat("es-CL", {
  style: "currency",

  currency: "CLP",

  maximumFractionDigits: 0,
})

const DATE_FORMATTER = new Intl.DateTimeFormat("es-CL", {
  day: "numeric",

  month: "short",

  year: "numeric",
})

export default function MyListingCard({
  listing,

  isUpdating,

  onRequestAction,
}: {
  listing: MyListing

  isUpdating: boolean

  onRequestAction: (listingId: string, action: OwnedListingAction) => void
}) {
  return (
    <article
      className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      aria-busy={isUpdating}
    >
      <div className="grid sm:grid-cols-[220px_1fr]">
        <Link
          to={
            listing.status === "published"
              ? `/publicacion/${listing.id}`
              : `/publicacion/${listing.id}/editar`
          }
          className="relative min-h-48 bg-slate-100 sm:min-h-full"
          aria-label={`Ver publicación ${listing.title}`}
        >
          {listing.primaryImageUrl ? (
            <img
              src={listing.primaryImageUrl}
              alt={`Imagen principal de ${listing.title}`}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-10 w-10"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z" />
                <path d="m4 16 4.5-4.5 3 3 2-2L20 19M15.5 8.5h.01" />
              </svg>
              <span className="text-xs font-semibold">
                Sin imagen principal
              </span>
            </div>
          )}
          <div className="absolute left-3 top-3">
            <ListingStatusBadge status={listing.status} />
          </div>
        </Link>

        <div className="flex min-w-0 flex-col p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-orange">
                {listing.category}
              </p>
              <h2 className="mt-1 truncate font-display text-xl font-extrabold text-petrol-dark">
                {listing.title}
              </h2>
              <p className="mt-1 text-xs font-semibold text-muted">
                {listing.salvageYardId
                  ? `Desarmaduría · ${listing.originName}`
                  : "Particular"}
              </p>
            </div>
            <p className="font-display text-xl font-extrabold text-petrol">
              {PRICE_FORMATTER.format(listing.price)}
            </p>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted">Stock</dt>
              <dd className="mt-1 font-semibold text-petrol-dark">
                {listing.stock} {listing.stock === 1 ? "unidad" : "unidades"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Ubicación</dt>
              <dd className="mt-1 font-semibold text-petrol-dark">
                {listing.commune}, {listing.region}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Creada</dt>
              <dd className="mt-1 font-semibold text-petrol-dark">
                {DATE_FORMATTER.format(new Date(listing.createdAt))}
              </dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-4">
            {isUpdating ? (
              <span className="rounded-lg bg-petrol/10 px-4 py-2 text-xs font-bold text-petrol">
                Actualizando...
              </span>
            ) : (
              <>
                {listing.status === "published" && (
                  <Link
                    to={`/publicacion/${listing.id}`}
                    className="rounded-lg bg-petrol px-4 py-2 text-xs font-bold text-white transition hover:bg-petrol-dark"
                  >
                    Ver publicación
                  </Link>
                )}
                <Link
                  to={`/publicacion/${listing.id}/editar`}
                  className="cursor-pointer rounded-lg border border-petrol px-4 py-2 text-xs font-bold text-petrol transition hover:bg-petrol/5"
                >
                  {listing.status === "sold" ? "Ver información" : "Editar"}
                </Link>
                {listing.status === "published" && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()

                      onRequestAction(listing.id, "paused")
                    }}
                    className="cursor-pointer rounded-lg border border-amber-300 px-4 py-2 text-xs font-bold text-amber-700 transition hover:bg-amber-50"
                  >
                    Pausar publicación
                  </button>
                )}
                {listing.status === "paused" && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()

                      onRequestAction(listing.id, "published")
                    }}
                    className="cursor-pointer rounded-lg border border-emerald-300 px-4 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50"
                  >
                    Volver a publicar
                  </button>
                )}
                {listing.status === "sold" && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()

                      onRequestAction(listing.id, "published")
                    }}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 hover:shadow-md"
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="h-4 w-4"
                    >
                      <path d="M20 11a8.1 8.1 0 1 0 2 5.3" />
                      <path d="M20 4v7h-7" />
                    </svg>
                    Volver a poner disponible
                  </button>
                )}
                {(listing.status === "published" ||
                  listing.status === "paused") && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()

                      onRequestAction(listing.id, "sold")
                    }}
                    className="cursor-pointer rounded-lg border border-blue-300 px-4 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-50"
                  >
                    Marcar como vendida
                  </button>
                )}
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()

                    onRequestAction(listing.id, "delete")
                  }}
                  className="cursor-pointer rounded-lg border border-red-300 px-4 py-2 text-xs font-bold text-red-700 transition hover:bg-red-50"
                >
                  Eliminar publicación
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
