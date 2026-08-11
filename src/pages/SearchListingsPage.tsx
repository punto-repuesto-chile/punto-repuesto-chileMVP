import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"

import { createPortal } from "react-dom"

import { Link, useSearchParams } from "react-router-dom"

import SiteFooter from "../components/layout/SiteFooter"

import PublicListingCard from "../components/listings/PublicListingCard"

import PublicListingsPagination from "../components/listings/PublicListingsPagination"

import PublicListingsSkeleton from "../components/listings/PublicListingsSkeleton"

import SearchFiltersPanel, {
  type SearchFiltersDraft,
} from "../components/listings/SearchFiltersPanel"

import {
  getPublicListingFilterOptions,
  PUBLIC_LISTINGS_PAGE_SIZE,
  searchPublishedListings,
  type PublicListingCard as PublicListingCardData,
  type PublicListingCondition,
  type PublicListingFilterOptions,
  type PublicListingSort,
  type PublicListingType,
  type PaginatedPublicListings,
  type SearchPublishedListingsOptions,
} from "../services/publicListingService"

const EMPTY_FILTER_OPTIONS: PublicListingFilterOptions = {
  categories: [],

  brands: [],

  modelsByBrand: {},
  regions: [],
  years: [],
}

const FILTER_PARAM_KEYS = [
  "tipo",

  "categoria",

  "marca",

  "modelo",

  "anio",

  "region",

  "condicion",

  "precio_min",

  "precio_max",
] as const

const CONDITION_LABELS: Record<PublicListingCondition, string> = {
  new: "Nuevo",

  used: "Usado",

  refurbished: "Reacondicionado",
}

const LISTING_TYPE_LABELS: Record<PublicListingType, string> = {
  part: "Repuestos",

  accessory: "Accesorios",

  vehicle: "Vehículos",

  salvage_inventory: "Inventario de desarme",
}

const VALID_LISTING_TYPES = new Set<PublicListingType>([
  "part",

  "accessory",

  "vehicle",

  "salvage_inventory",
])

const VALID_CONDITIONS = new Set<PublicListingCondition>([
  "new",

  "used",

  "refurbished",
])

const VALID_SORTS = new Set<PublicListingSort>([
  "recientes",

  "precio_asc",

  "precio_desc",
])

function normalizeQuery(value: string): string {
  return value.trim().replace(/\s+/g, " ")
}

function optionalInteger(value: string | null): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined

  const parsed = Number(value)

  return Number.isSafeInteger(parsed) ? parsed : undefined
}

function conditionFrom(
  value: string | null,
): PublicListingCondition | undefined {
  return value && VALID_CONDITIONS.has(value as PublicListingCondition)
    ? value as PublicListingCondition
    : undefined
}

function listingTypeFrom(value: string | null): PublicListingType | undefined {
  return value && VALID_LISTING_TYPES.has(value as PublicListingType)
    ? value as PublicListingType
    : undefined
}

function sortFrom(value: string | null): PublicListingSort {
  return value && VALID_SORTS.has(value as PublicListingSort)
    ? value as PublicListingSort
    : "recientes"
}

function pageFrom(value: string | null): number {
  if (!value || !/^\d+$/.test(value)) return 1

  const page = Number(value)

  return Number.isSafeInteger(page) && page > 0 ? page : 1
}

function isInvalidPage(value: string | null): boolean {
  return value !== null && String(pageFrom(value)) !== value
}

function draftFromParams(params: URLSearchParams): SearchFiltersDraft {
  return {
    listingType: listingTypeFrom(params.get("tipo")) ?? "",

    category: params.get("categoria") ?? "",

    brand: params.get("marca") ?? "",

    model: params.get("modelo") ?? "",

    year: params.get("anio") ?? "",

    region: params.get("region") ?? "",

    condition: conditionFrom(params.get("condicion")) ?? "",

    minPrice: params.get("precio_min") ?? "",

    maxPrice: params.get("precio_max") ?? "",
  }
}

function validationError(draft: SearchFiltersDraft): string | null {
  const year = optionalInteger(draft.year)

  if (draft.year && (year === undefined || year < 1886 || year > 2100))
    return "Ingresa un año entre 1886 y 2100."

  const minPrice = optionalInteger(draft.minPrice)

  const maxPrice = optionalInteger(draft.maxPrice)

  if (draft.minPrice && minPrice === undefined)
    return "El precio mínimo debe ser un entero no negativo."

  if (draft.maxPrice && maxPrice === undefined)
    return "El precio máximo debe ser un entero no negativo."

  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice)
    return "El precio mínimo no puede superar el precio máximo."

  return null
}

function optionsFromParams(
  params: URLSearchParams,
): SearchPublishedListingsOptions {
  return {
    query: normalizeQuery(params.get("q") ?? "") || undefined,

    listingType: listingTypeFrom(params.get("tipo")),

    category: params.get("categoria") || undefined,

    brand: params.get("marca") || undefined,

    model: params.get("modelo") || undefined,

    year: optionalInteger(params.get("anio")),

    region: params.get("region") || undefined,

    condition: conditionFrom(params.get("condicion")),

    minPrice: optionalInteger(params.get("precio_min")),

    maxPrice: optionalInteger(params.get("precio_max")),

    sort: sortFrom(params.get("orden")),

    page: pageFrom(params.get("pagina")),
  }
}

function setOrDelete(params: URLSearchParams, key: string, value: string) {
  const normalized = value.trim()

  if (normalized) params.set(key, normalized)
  else params.delete(key)
}

export default function SearchListingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const paramsKey = searchParams.toString()

  const query = normalizeQuery(searchParams.get("q") ?? "")

  const appliedDraft = useMemo(() => draftFromParams(searchParams), [paramsKey])

  const searchOptions = useMemo(
    () => optionsFromParams(searchParams),

    [paramsKey],
  )

  const appliedValidationError = validationError(appliedDraft)

  const sort = sortFrom(searchParams.get("orden"))

  const page = pageFrom(searchParams.get("pagina"))

  const hasActiveFilters = FILTER_PARAM_KEYS.some((key) =>
    searchParams.has(key),
  )

  const [searchDraft, setSearchDraft] = useState(query)

  const [filterDraft, setFilterDraft] = useState(appliedDraft)

  const [filterError, setFilterError] = useState<string | null>(null)

  const [filterOptions, setFilterOptions] =
    useState<PublicListingFilterOptions>(EMPTY_FILTER_OPTIONS)

  const [optionsError, setOptionsError] = useState<string | null>(null)

  const [optionsRequestNumber, setOptionsRequestNumber] = useState(0)

  const [listings, setListings] = useState<PublicListingCardData[]>([])

  const [pagination, setPagination] =
    useState<Pick<PaginatedPublicListings, "total" | "pageSize" | "totalPages">>(
      {
        total: 0,

        pageSize: PUBLIC_LISTINGS_PAGE_SIZE,

        totalPages: 0,
      },
    )

  const [isLoading, setIsLoading] = useState(true)

  const [error, setError] = useState<string | null>(null)

  const [requestNumber, setRequestNumber] = useState(0)

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const resultsHeadingRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const rawPage = searchParams.get("pagina")

    if (!isInvalidPage(rawPage)) return

    const next = new URLSearchParams(searchParams)

    next.set("pagina", "1")

    setSearchParams(next, { replace: true })
  }, [paramsKey, searchParams, setSearchParams])

  useEffect(() => {
    setSearchDraft(query)

    setFilterDraft(appliedDraft)

    setFilterError(appliedValidationError)
  }, [paramsKey])

  useEffect(() => {
    let active = true

    setOptionsError(null)

    void getPublicListingFilterOptions()

      .then((result) => {
        if (active) setFilterOptions(result)
      })

      .catch((requestError: unknown) => {
        if (!active) return

        setOptionsError(
          requestError instanceof Error
            ? requestError.message
            : "No pudimos cargar las opciones de filtros.",
        )
      })

    return () => {
      active = false
    }
  }, [optionsRequestNumber])

  useEffect(() => {
    let active = true

    setError(null)

    if (appliedValidationError) {
      setListings([])

      setPagination((current) => ({ ...current, total: 0, totalPages: 0 }))

      setIsLoading(false)

      return () => {
        active = false
      }
    }

    setIsLoading(true)

    void searchPublishedListings(searchOptions)

      .then((result) => {
        if (!active) return

        const normalizedPage =
          result.totalPages === 0 ? 1 : Math.min(page, result.totalPages)

        if (page !== normalizedPage) {
          const next = new URLSearchParams(searchParams)

          next.set("pagina", String(normalizedPage))

          setSearchParams(next, { replace: true })

          return
        }

        setListings(result.items)

        setPagination({
          total: result.total,

          pageSize: result.pageSize,

          totalPages: result.totalPages,
        })
      })

      .catch((requestError: unknown) => {
        if (!active) return

        setError(
          requestError instanceof Error
            ? requestError.message
            : "No pudimos cargar los resultados.",
        )
      })

      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [paramsKey, requestNumber])

  useEffect(() => {
    if (!mobileFiltersOpen) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileFiltersOpen(false)
    }

    document.addEventListener("keydown", closeOnEscape)

    return () => document.removeEventListener("keydown", closeOnEscape)
  }, [mobileFiltersOpen])

  const updateSearch = () => {
    const next = new URLSearchParams(searchParams)

    setOrDelete(next, "q", normalizeQuery(searchDraft))

    next.set("pagina", "1")

    setSearchParams(next)
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()

    updateSearch()
  }

  const applyFilters = () => {
    const nextError = validationError(filterDraft)

    setFilterError(nextError)

    if (nextError) return

    const next = new URLSearchParams(searchParams)

    setOrDelete(next, "tipo", filterDraft.listingType)

    setOrDelete(next, "categoria", filterDraft.category)

    setOrDelete(next, "marca", filterDraft.brand)

    setOrDelete(next, "modelo", filterDraft.model)

    setOrDelete(next, "anio", filterDraft.year)

    setOrDelete(next, "region", filterDraft.region)

    setOrDelete(next, "condicion", filterDraft.condition)

    setOrDelete(next, "precio_min", filterDraft.minPrice)

    setOrDelete(next, "precio_max", filterDraft.maxPrice)

    next.set("pagina", "1")

    setSearchParams(next)

    setMobileFiltersOpen(false)
  }

  const clearFilters = () => {
    const next = new URLSearchParams(searchParams)

    for (const key of FILTER_PARAM_KEYS) next.delete(key)

    next.set("pagina", "1")

    setSearchParams(next)

    setFilterError(null)

    setMobileFiltersOpen(false)
  }

  const removeFilter = (key: typeof FILTER_PARAM_KEYS[number]) => {
    const next = new URLSearchParams(searchParams)

    next.delete(key)

    if (key === "marca") next.delete("modelo")

    next.set("pagina", "1")

    setSearchParams(next)
  }

  const updateSort = (nextSort: PublicListingSort) => {
    const next = new URLSearchParams(searchParams)

    if (nextSort === "recientes") next.delete("orden")
    else next.set("orden", nextSort)

    next.set("pagina", "1")

    setSearchParams(next)
  }

  const updatePage = (nextPage: number) => {
    if (nextPage === page || nextPage < 1 || nextPage > pagination.totalPages)
      return

    const next = new URLSearchParams(searchParams)

    next.set("pagina", String(nextPage))

    setSearchParams(next)

    resultsHeadingRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",

      block: "start",
    })
  }

  const chips = [
    appliedDraft.listingType && {
      key: "tipo" as const,

      label: LISTING_TYPE_LABELS[appliedDraft.listingType],
    },

    appliedDraft.category && {
      key: "categoria" as const,

      label: appliedDraft.category,
    },

    appliedDraft.brand && {
      key: "marca" as const,

      label: appliedDraft.brand,
    },

    appliedDraft.model && {
      key: "modelo" as const,

      label: appliedDraft.model,
    },

    appliedDraft.year && {
      key: "anio" as const,

      label: `Año ${appliedDraft.year}`,
    },

    appliedDraft.region && {
      key: "region" as const,

      label: appliedDraft.region,
    },

    appliedDraft.condition && {
      key: "condicion" as const,

      label: CONDITION_LABELS[appliedDraft.condition],
    },

    appliedDraft.minPrice && {
      key: "precio_min" as const,

      label: `Desde $${Number(appliedDraft.minPrice).toLocaleString("es-CL")}`,
    },

    appliedDraft.maxPrice && {
      key: "precio_max" as const,

      label: `Hasta $${Number(appliedDraft.maxPrice).toLocaleString("es-CL")}`,
    },
  ].filter(Boolean) as Array<{
    key: typeof FILTER_PARAM_KEYS[number]

    label: string
  }>

  const panel = (onClose?: () => void) => (
    <SearchFiltersPanel
      draft={filterDraft}
      options={filterOptions}
      error={filterError}
      onChange={(next) => {
        setFilterDraft(next)

        setFilterError(null)
      }}
      onApply={applyFilters}
      onClear={clearFilters}
      onClose={onClose}
    />
  )

  return (
    <div className="min-h-screen bg-bg text-petrol-dark">
      <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="flex items-center gap-2"
            aria-label="Ir al inicio"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-petrol text-xs font-bold text-white">
              PR
            </span>
            <span className="hidden font-display text-sm font-bold sm:block">
              Punto Repuesto <span className="text-orange">Chile</span>
            </span>
          </Link>
          <Link
            to="/publicar"
            className="rounded-xl bg-orange px-4 py-2.5 text-sm font-bold text-white transition hover:bg-orange-dark"
          >
            Publicar
          </Link>
        </div>
      </header>

      <main className="mx-auto min-h-[70vh] max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <p className="text-sm font-bold uppercase tracking-wider text-orange">
          Catálogo público
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">
          {query ? `Resultados para “${query}”` : "Publicaciones disponibles"}
        </h1>

        <form
          onSubmit={submit}
          role="search"
          className="mt-7 flex max-w-3xl flex-col gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm sm:flex-row"
        >
          <label htmlFor="public-search" className="sr-only">
            Buscar publicaciones
          </label>
          <input
            id="public-search"
            type="search"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return

              event.preventDefault()

              updateSearch()
            }}
            placeholder="Busca por producto, marca, modelo o código OEM"
            className="min-w-0 flex-1 rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-petrol focus:ring-2 focus:ring-petrol/15"
          />
          <button
            type="submit"
            className="rounded-xl bg-orange px-7 py-3 text-sm font-bold text-white transition hover:bg-orange-dark"
          >
            Buscar
          </button>
        </form>

        {optionsError && (
          <div className="mt-5 flex max-w-3xl items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
            <span>{optionsError}</span>
            <button
              type="button"
              onClick={() => setOptionsRequestNumber((current) => current + 1)}
              className="shrink-0 underline"
            >
              Reintentar
            </button>
          </div>
        )}

        <div className="mt-10 grid items-start gap-8 lg:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="sticky top-24 hidden rounded-2xl border border-border bg-white p-5 shadow-sm lg:block">
            {panel()}
          </aside>

          <section aria-live="polite" className="min-w-0">
            <div
              ref={resultsHeadingRef}
              className="mb-5 scroll-mt-24 flex flex-wrap items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(true)}
                  className="rounded-xl border border-petrol px-4 py-2.5 text-sm font-bold text-petrol lg:hidden"
                >
                  Filtros{chips.length > 0 ? ` (${chips.length})` : ""}
                </button>
                {!isLoading && !error && !appliedValidationError && (
                  <p className="text-sm font-semibold text-muted">
                    {pagination.total}{" "}
                    {pagination.total === 1
                      ? "publicación encontrada"
                      : "publicaciones encontradas"}
                  </p>
                )}
              </div>
              <label className="flex items-center gap-2 text-xs font-bold text-muted">
                Ordenar por
                <select
                  value={sort}
                  onChange={(event) =>
                    updateSort(event.target.value as PublicListingSort)
                  }
                  className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-semibold text-petrol-dark outline-none focus:border-petrol"
                >
                  <option value="recientes">Más recientes</option>
                  <option value="precio_asc">Menor precio</option>
                  <option value="precio_desc">Mayor precio</option>
                </select>
              </label>
            </div>

            {chips.length > 0 && (
              <div className="mb-6 flex flex-wrap items-center gap-2">
                {chips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => removeFilter(chip.key)}
                    className="rounded-full border border-petrol/20 bg-petrol/5 px-3 py-1.5 text-xs font-bold text-petrol"
                  >
                    {chip.label} <span aria-hidden="true">×</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-2 py-1.5 text-xs font-bold text-orange-dark underline"
                >
                  Limpiar filtros
                </button>
              </div>
            )}

            {isLoading ? (
              <PublicListingsSkeleton count={PUBLIC_LISTINGS_PAGE_SIZE} />
            ) : appliedValidationError ? (
              <div
                role="alert"
                className="rounded-2xl border border-red-200 bg-white px-6 py-12 text-center shadow-sm"
              >
                <h2 className="font-display text-xl font-bold">
                  Revisa los filtros ingresados.
                </h2>
                <p className="mt-2 text-sm text-red-700">
                  {appliedValidationError}
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-5 rounded-xl bg-petrol px-5 py-2.5 text-sm font-bold text-white"
                >
                  Limpiar filtros
                </button>
              </div>
            ) : error ? (
              <div
                role="alert"
                className="rounded-2xl border border-red-200 bg-white px-6 py-12 text-center shadow-sm"
              >
                <h2 className="font-display text-xl font-bold">
                  No pudimos cargar los resultados.
                </h2>
                <button
                  type="button"
                  onClick={() => setRequestNumber((current) => current + 1)}
                  className="mt-5 rounded-xl bg-petrol px-5 py-2.5 text-sm font-bold text-white hover:bg-petrol-dark"
                >
                  Reintentar
                </button>
              </div>
            ) : listings.length === 0 ? (
              <div className="rounded-2xl border border-border bg-white px-6 py-12 text-center shadow-sm">
                <h2 className="font-display text-xl font-bold">
                  {hasActiveFilters
                    ? "No encontramos publicaciones con estos filtros."
                    : query
                      ? `No encontramos publicaciones para ‘${query}’.`
                      : "Aún no hay publicaciones disponibles."}
                </h2>
                {hasActiveFilters ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-6 rounded-xl bg-petrol px-5 py-3 text-sm font-bold text-white"
                  >
                    Limpiar filtros
                  </button>
                ) : (
                  <p className="mt-3 text-sm text-muted">
                    Prueba con menos palabras o busca por marca o modelo.
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {listings.map((listing) => (
                    <PublicListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
                <PublicListingsPagination
                  currentPage={page}
                  totalPages={pagination.totalPages}
                  onPageChange={updatePage}
                />
              </>
            )}
          </section>
        </div>
      </main>
      <SiteFooter />

      {mobileFiltersOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] bg-petrol-dark/45 backdrop-blur-sm"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget)
                setMobileFiltersOpen(false)
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Filtros de búsqueda"
              className="ml-auto h-full w-full max-w-sm shadow-2xl"
            >
              {panel(() => setMobileFiltersOpen(false))}
            </div>
          </div>,

          document.body,
        )}
    </div>
  )
}
