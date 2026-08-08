import type {
  PublicListingCondition,
  PublicListingFilterOptions,
  PublicListingType,
} from "../../services/publicListingService"

export type SearchFiltersDraft = {
  listingType: "" | PublicListingType
  category: string
  brand: string
  model: string
  year: string
  region: string
  condition: "" | PublicListingCondition
  minPrice: string
  maxPrice: string
}

const LISTING_TYPE_OPTIONS: Array<{
  value: PublicListingType
  label: string
}> = [
  { value: "part", label: "Repuestos" },
  { value: "accessory", label: "Accesorios" },
  { value: "vehicle", label: "Vehículos" },
  { value: "salvage_inventory", label: "Inventario de desarme" },
]

const CONDITION_OPTIONS: Array<{
  value: PublicListingCondition
  label: string
}> = [
  { value: "new", label: "Nuevo" },
  { value: "used", label: "Usado" },
  { value: "refurbished", label: "Reacondicionado" },
]

export default function SearchFiltersPanel({
  draft,
  options,
  error,
  onChange,
  onApply,
  onClear,
  onClose,
}: {
  draft: SearchFiltersDraft
  options: PublicListingFilterOptions
  error: string | null
  onChange: (next: SearchFiltersDraft) => void
  onApply: () => void
  onClear: () => void
  onClose?: () => void
}) {
  const models = draft.brand ? (options.modelsByBrand[draft.brand] ?? []) : []
  const selectClass =
    "mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-petrol-dark outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/10"
  const inputClass =
    "mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/10"

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-border px-5 py-4 lg:border-0 lg:px-0 lg:pt-0">
        <h2 className="font-display text-lg font-extrabold">Filtros</h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-xl text-muted"
            aria-label="Cerrar filtros"
          >
            ×
          </button>
        )}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 lg:overflow-visible lg:px-0 lg:py-3">
        <label className="block text-xs font-bold text-petrol-dark">
          Tipo de publicación
          <select
            value={draft.listingType}
            onChange={(event) =>
              onChange({
                ...draft,
                listingType: event.target
                  .value as SearchFiltersDraft["listingType"],
              })
            }
            className={selectClass}
          >
            <option value="">Todos</option>
            {LISTING_TYPE_OPTIONS.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs font-bold text-petrol-dark">
          Categoría
          <select
            value={draft.category}
            onChange={(event) =>
              onChange({ ...draft, category: event.target.value })
            }
            className={selectClass}
          >
            <option value="">Todas</option>
            {options.categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs font-bold text-petrol-dark">
          Marca
          <select
            value={draft.brand}
            onChange={(event) =>
              onChange({ ...draft, brand: event.target.value, model: "" })
            }
            className={selectClass}
          >
            <option value="">Todas</option>
            {options.brands.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs font-bold text-petrol-dark">
          Modelo
          <select
            value={draft.model}
            disabled={!draft.brand}
            onChange={(event) =>
              onChange({ ...draft, model: event.target.value })
            }
            className={`${selectClass} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-muted`}
          >
            <option value="">Todos</option>
            {models.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs font-bold text-petrol-dark">
          Año compatible
          <input
            type="number"
            min="1886"
            max="2100"
            inputMode="numeric"
            value={draft.year}
            onChange={(event) =>
              onChange({ ...draft, year: event.target.value })
            }
            placeholder="Ej. 2018"
            className={inputClass}
          />
        </label>

        <label className="block text-xs font-bold text-petrol-dark">
          Región
          <select
            value={draft.region}
            onChange={(event) =>
              onChange({ ...draft, region: event.target.value })
            }
            className={selectClass}
          >
            <option value="">Todas</option>
            {options.regions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs font-bold text-petrol-dark">
          Condición
          <select
            value={draft.condition}
            onChange={(event) =>
              onChange({
                ...draft,
                condition: event.target
                  .value as SearchFiltersDraft["condition"],
              })
            }
            className={selectClass}
          >
            <option value="">Todas</option>
            {CONDITION_OPTIONS.map((condition) => (
              <option key={condition.value} value={condition.value}>
                {condition.label}
              </option>
            ))}
          </select>
        </label>

        <fieldset>
          <legend className="text-xs font-bold text-petrol-dark">
            Precio CLP
          </legend>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-muted">
              Mínimo
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={draft.minPrice}
                onChange={(event) =>
                  onChange({ ...draft, minPrice: event.target.value })
                }
                placeholder="10.000"
                className={inputClass}
              />
            </label>
            <label className="text-xs text-muted">
              Máximo
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={draft.maxPrice}
                onChange={(event) =>
                  onChange({ ...draft, maxPrice: event.target.value })
                }
                placeholder="50.000"
                className={inputClass}
              />
            </label>
          </div>
        </fieldset>

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700"
          >
            {error}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-border bg-white px-5 py-4 lg:px-0 lg:pb-0">
        <button
          type="button"
          onClick={onClear}
          className="rounded-xl border border-border px-3 py-2.5 text-sm font-bold text-muted hover:bg-bg"
        >
          Limpiar filtros
        </button>
        <button
          type="button"
          onClick={onApply}
          className="rounded-xl bg-orange px-3 py-2.5 text-sm font-bold text-white hover:bg-orange-dark"
        >
          Aplicar filtros
        </button>
      </div>
    </div>
  )
}
