import type { ListingStatus } from "../../services/listingService"

export type ListingsFilter = "all" | ListingStatus

type FilterOption = {
  value: ListingsFilter

  label: string
}

const FILTERS: FilterOption[] = [
  { value: "all", label: "Todas" },

  { value: "published", label: "Publicadas" },

  { value: "draft", label: "Borradores" },

  { value: "paused", label: "Pausadas" },

  { value: "sold", label: "Vendidas" },
]

export default function MyListingsFilters({
  activeFilter,

  counts,

  onChange,
}: {
  activeFilter: ListingsFilter

  counts: Record<ListingsFilter, number>

  onChange: (filter: ListingsFilter) => void
}) {
  return (
    <div
      className="flex gap-2 overflow-x-auto pb-2"
      role="group"
      aria-label="Filtrar publicaciones por estado"
    >
      {FILTERS.map((filter) => {
        const active = activeFilter === filter.value

        return (
          <button
            key={filter.value}
            type="button"
            onClick={() => onChange(filter.value)}
            aria-pressed={active}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
              active
                ? "border-petrol bg-petrol text-white"
                : "border-border bg-white text-muted hover:border-petrol/40 hover:text-petrol"
            }`}
          >
            {filter.label} ({counts[filter.value]})
          </button>
        )
      })}
    </div>
  )
}
