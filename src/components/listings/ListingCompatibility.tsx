import type { PublishedListing } from "../../services/listingService"

export default function ListingCompatibility({
  listing,
}: {
  listing: PublishedListing
}) {
  const years =
    listing.yearFrom && listing.yearTo
      ? `${listing.yearFrom} – ${listing.yearTo}`
      : listing.yearFrom
        ? `Desde ${listing.yearFrom}`
        : listing.yearTo
          ? `Hasta ${listing.yearTo}`
          : null

  const rows = [
    ["Marca", listing.vehicleBrand],
    ["Modelo", listing.vehicleModel],
    ["Años", years],
    ["Motorización", listing.engineVersion],
    ["Código OEM", listing.oemCode],
  ].filter((row): row is [string, string] => Boolean(row[1]))

  if (rows.length === 0) return null

  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
      <h2 className="font-display text-xl font-bold">Compatibilidad</h2>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-bg p-4">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="mt-1 text-sm font-bold text-petrol-dark">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
