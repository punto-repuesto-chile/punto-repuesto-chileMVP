import type { PublishedListing } from "../../services/listingService"

const DELIVERY_LABELS = {
  pickup: "Retiro presencial",

  shipping: "Envío disponible",

  delivery_agreement: "Entrega por acordar",
}

export default function ListingDelivery({
  methods,
}: {
  methods: PublishedListing["deliveryMethods"]
}) {
  if (methods.length === 0) return null

  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
      <h2 className="font-display text-xl font-bold">Entrega</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {methods.map((method) => (
          <li
            key={method}
            className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs">
              ✓
            </span>
            {DELIVERY_LABELS[method]}
          </li>
        ))}
      </ul>
    </section>
  )
}
