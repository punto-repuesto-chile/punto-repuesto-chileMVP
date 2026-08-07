import type { ListingStatus } from "../../services/listingService"

const STATUS_DETAILS: Record<ListingStatus, {
  label: string
  className: string
}> = {
  draft: {
    label: "Borrador",
    className: "bg-slate-100 text-slate-700 ring-slate-200",
  },
  published: {
    label: "Publicada",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  paused: {
    label: "Pausada",
    className: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  sold: {
    label: "Vendida",
    className: "bg-blue-50 text-blue-700 ring-blue-200",
  },
}

export default function ListingStatusBadge({
  status,
}: {
  status: ListingStatus
}) {
  const detail = STATUS_DETAILS[status]
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${detail.className}`}
    >
      {detail.label}
    </span>
  )
}
