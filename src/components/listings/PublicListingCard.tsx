import { motion } from "motion/react"
import { Link } from "react-router-dom"
import { cardEntrance } from "../../animations/variants"
import type {
  PublicListingCard as PublicListingCardData,
  PublicListingCondition,
} from "../../services/publicListingService"

const PRICE_FORMATTER = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
})

const CONDITION_LABELS: Record<PublicListingCondition, string> = {
  new: "Nuevo",
  used: "Usado",
  refurbished: "Reacondicionado",
}

function vehicleDescription(listing: PublicListingCardData): string {
  const vehicle = [listing.vehicleBrand, listing.vehicleModel]
    .filter(Boolean)
    .join(" ")
  const years =
    listing.yearFrom && listing.yearTo
      ? `${listing.yearFrom}–${listing.yearTo}`
      : listing.yearFrom
        ? `Desde ${listing.yearFrom}`
        : listing.yearTo
          ? `Hasta ${listing.yearTo}`
          : ""
  return [vehicle, years].filter(Boolean).join(" · ") || listing.category
}

export default function PublicListingCard({
  listing,
  vehicleLayout = false,
}: {
  listing: PublicListingCardData
  vehicleLayout?: boolean
}) {
  return (
    <motion.article
      variants={cardEntrance}
      whileHover={{ y: -4 }}
      className="animated-card group overflow-hidden rounded-2xl border bg-white transition-[box-shadow,border-color] hover:shadow-xl"
      style={{ borderColor: "#DCE3E6" }}
    >
      <Link
        to={`/publicacion/${listing.id}`}
        className={`relative block overflow-hidden ${
          vehicleLayout ? "aspect-[16/9]" : "aspect-[4/3]"
        }`}
        style={{ background: "#E8F0F3" }}
        aria-label={`Ver publicación ${listing.title}`}
      >
        {listing.primaryImageUrl ? (
          <img
            src={listing.primaryImageUrl}
            alt={listing.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm font-semibold text-muted">
            Sin imagen disponible
          </div>
        )}
        <span className="absolute left-2.5 top-2.5 rounded-full border border-white/70 bg-white/95 px-2.5 py-1 text-xs font-bold text-petrol-dark shadow-sm">
          {CONDITION_LABELS[listing.condition]}
        </span>
      </Link>
      <div className="p-4">
        <Link to={`/publicacion/${listing.id}`}>
          <h3 className="line-clamp-2 font-display text-sm font-bold text-petrol-dark hover:text-petrol">
            {listing.title}
          </h3>
        </Link>
        <p className="mt-1 line-clamp-1 text-xs text-muted">
          {vehicleDescription(listing)}
        </p>
        <p className="mt-3 flex items-center gap-1 text-xs text-muted">
          <span aria-hidden="true">⌖</span>
          {listing.commune}, {listing.region}
        </p>
        <div className="mt-3 flex items-end justify-between gap-3">
          <span className="font-display text-lg font-extrabold text-petrol-dark">
            {PRICE_FORMATTER.format(listing.price)}
          </span>
          <Link
            to={`/publicacion/${listing.id}`}
            className="shrink-0 rounded-lg border border-petrol px-3 py-1.5 text-xs font-semibold text-petrol transition hover:bg-petrol/5"
          >
            Ver detalle
          </Link>
        </div>
      </div>
    </motion.article>
  )
}
