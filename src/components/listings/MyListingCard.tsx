import { Link } from "react-router-dom"
import ListingStatusBadge from "./ListingStatusBadge"
import type { MyListing } from "../../services/listingService"

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

export default function MyListingCard({ listing }: { listing: MyListing }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="grid sm:grid-cols-[220px_1fr]">
        <Link
          to={`/publicacion/${listing.id}`}
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
                <Link
                  to={`/publicacion/${listing.id}`}
                  className="hover:text-orange"
                >
                  {listing.title}
                </Link>
              </h2>
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
            <Link
              to={`/publicacion/${listing.id}`}
              className="rounded-lg bg-petrol px-4 py-2 text-xs font-bold text-white transition hover:bg-petrol-dark"
            >
              Ver publicación
            </Link>
            <Link
              to={`/publicacion/${listing.id}/editar`}
              className="rounded-lg border border-petrol px-4 py-2 text-xs font-bold text-petrol transition hover:bg-petrol/5"
            >
              Editar
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}
