import type {
  ListingCondition,
  PublishedListing,
} from "../../services/listingService"

const PRICE_FORMATTER = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
})

const DATE_FORMATTER = new Intl.DateTimeFormat("es-CL", {
  day: "numeric",
  month: "long",
  year: "numeric",
})

const CONDITION_LABELS: Record<ListingCondition, string> = {
  new: "Nuevo",
  used: "Usado",
  refurbished: "Reacondicionado",
}

export default function ListingDetails({
  listing,
}: {
  listing: PublishedListing
}) {
  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
          Publicada
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
          {CONDITION_LABELS[listing.condition]}
        </span>
      </div>

      <p className="mt-5 text-xs font-bold uppercase tracking-wider text-orange">
        {listing.category}
      </p>
      <h1 className="mt-2 font-display text-3xl font-extrabold leading-tight text-petrol-dark sm:text-4xl">
        {listing.title}
      </h1>
      <p className="mt-4 font-display text-3xl font-extrabold text-petrol">
        {PRICE_FORMATTER.format(listing.price)}
      </p>

      <dl className="mt-6 grid grid-cols-2 gap-4 rounded-xl bg-bg p-4 text-sm">
        <div>
          <dt className="text-xs text-muted">Stock disponible</dt>
          <dd className="mt-1 font-bold">
            {listing.stock} {listing.stock === 1 ? "unidad" : "unidades"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Ubicación</dt>
          <dd className="mt-1 font-bold">
            {listing.commune}, {listing.region}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs text-muted">Fecha de publicación</dt>
          <dd className="mt-1 font-bold">
            {DATE_FORMATTER.format(new Date(listing.createdAt))}
          </dd>
        </div>
      </dl>

      <div className="mt-7 border-t border-border pt-6">
        <h2 className="font-display text-xl font-bold">Descripción</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted">
          {listing.description}
        </p>
      </div>
    </section>
  )
}
