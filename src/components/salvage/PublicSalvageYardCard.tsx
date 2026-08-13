import { Link } from "react-router-dom"
import type { PublicSalvageYard } from "../../types/salvageYard"

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

export default function PublicSalvageYardCard({
  yard,
}: {
  yard: PublicSalvageYard
}) {
  return (
    <Link
      to={`/desarmaduria/${yard.id}`}
      className="group block rounded-3xl border border-border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-orange/40 hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        {yard.logoUrl ? (
          <img
            src={yard.logoUrl}
            alt=""
            className="h-16 w-16 shrink-0 rounded-2xl object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-petrol text-lg font-extrabold text-white">
            {initials(yard.businessName)}
          </div>
        )}
        <div className="min-w-0">
          <h2 className="truncate font-display text-lg font-bold text-petrol-dark group-hover:text-orange">
            {yard.businessName}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {yard.region} · {yard.commune}
          </p>
        </div>
      </div>
      <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted">
        {yard.description ||
          "Conoce el inventario público de esta desarmaduría."}
      </p>
      {(yard.phone || yard.whatsapp) && (
        <p className="mt-4 text-xs font-semibold text-petrol">
          Contacto disponible
        </p>
      )}
    </Link>
  )
}
