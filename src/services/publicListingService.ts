import { supabase } from "../lib/supabase"
import { PARTS_MENU_CATEGORIES } from "../constants/listingCategories"
import { getListingImagePublicUrl } from "./listingService"

export type PublicListingType = "part" | "accessory" | "vehicle" | "salvage_inventory"

export type PublicListingCondition = "new" | "used" | "refurbished"

export type PublicListingCard = {
  id: string
  listingType: PublicListingType
  title: string
  category: string
  condition: PublicListingCondition
  price: number
  stock: number
  vehicleBrand: string | null
  vehicleModel: string | null
  yearFrom: number | null
  yearTo: number | null
  region: string
  commune: string
  createdAt: string
  primaryImagePath: string | null
  primaryImageUrl: string | null
}

type PublicListingImageRow = {
  storage_path: string
  position: number
  is_primary: boolean
}

type PublicListingCardRow = {
  id: string
  listing_type: PublicListingType
  title: string
  category: string
  condition: PublicListingCondition
  price: number
  stock: number
  vehicle_brand: string | null
  vehicle_model: string | null
  year_from: number | null
  year_to: number | null
  region: string
  commune: string
  created_at: string
  listing_images: PublicListingImageRow[] | null
}

export type PublishedListingsOptions = {
  listingTypes?: PublicListingType[]
  limit?: number
}

export type PublicListingSort = "recientes" | "precio_asc" | "precio_desc"

export const PUBLIC_LISTINGS_PAGE_SIZE = 12

export type SearchPublishedListingsOptions = {
  query?: string
  listingType?: PublicListingType
  category?: string
  brand?: string
  model?: string
  year?: number
  region?: string
  condition?: PublicListingCondition
  minPrice?: number
  maxPrice?: number
  sort?: PublicListingSort
  page?: number
}

export type PaginatedPublicListings = {
  items: PublicListingCard[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type PublicListingFilterOptions = {
  categories: string[]
  brands: string[]
  modelsByBrand: Record<string, string[]>
  regions: string[]
}

export class PublicListingsQueryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "PublicListingsQueryError"
  }
}

function normalizeSearchTerm(term: string): string {
  return term
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("es-CL")
    .trim()
    .replace(/\s+/g, " ")
}

function searchableWords(term: string): string[] {
  return normalizeSearchTerm(term)
    .split(" ")
    .map((word) => word.replace(/[,()*%_\"]/g, ""))
    .filter(Boolean)
}

function mapPublicListingCard(row: PublicListingCardRow): PublicListingCard {
  const image = row.listing_images?.[0] ?? null
  return {
    id: row.id,
    listingType: row.listing_type,
    title: row.title,
    category: row.category,
    condition: row.condition,
    price: Number(row.price),
    stock: row.stock,
    vehicleBrand: row.vehicle_brand,
    vehicleModel: row.vehicle_model,
    yearFrom: row.year_from,
    yearTo: row.year_to,
    region: row.region,
    commune: row.commune,
    createdAt: row.created_at,
    primaryImagePath: image?.storage_path ?? null,
    primaryImageUrl: image
      ? getListingImagePublicUrl(image.storage_path)
      : null,
  }
}

export async function getPublishedListings({
  listingTypes,
  limit = 8,
}: PublishedListingsOptions = {}): Promise<PublicListingCard[]> {
  let query = supabase
    .from("listings")
    .select(
      "id,listing_type,title,category,condition,price,stock,vehicle_brand,vehicle_model,year_from,year_to,region,commune,created_at,listing_images(storage_path,position,is_primary)",
    )
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .order("is_primary", {
      referencedTable: "listing_images",
      ascending: false,
    })
    .order("position", {
      referencedTable: "listing_images",
      ascending: true,
    })
    .limit(1, { referencedTable: "listing_images" })
    .limit(limit)

  if (listingTypes?.length) query = query.in("listing_type", listingTypes)

  const { data, error } = await query
  if (error) {
    if (import.meta.env.DEV)
      console.error("No se pudo cargar el catálogo público:", {
        code: error.code,
        message: error.message,
      })
    throw new PublicListingsQueryError(
      "No pudimos cargar estas publicaciones en este momento.",
    )
  }

  return ((data ?? []) as unknown as PublicListingCardRow[]).map(
    mapPublicListingCard,
  )
}

export async function getPublishedListingsByIds(
  listingIds: string[],
): Promise<PublicListingCard[]> {
  if (listingIds.length === 0) return []

  const { data, error } = await supabase
    .from("listings")
    .select(
      "id,listing_type,title,category,condition,price,stock,vehicle_brand,vehicle_model,year_from,year_to,region,commune,created_at,listing_images(storage_path,position,is_primary)",
    )
    .eq("status", "published")
    .in("id", listingIds)
    .order("is_primary", {
      referencedTable: "listing_images",
      ascending: false,
    })
    .order("position", {
      referencedTable: "listing_images",
      ascending: true,
    })
    .limit(1, { referencedTable: "listing_images" })

  if (error) {
    if (import.meta.env.DEV)
      console.error(
        `No se pudieron cargar publicaciones favoritas (${error.code}): ${error.message}`,
      )
    throw new PublicListingsQueryError("No pudimos cargar tus favoritos.")
  }

  return ((data ?? []) as unknown as PublicListingCardRow[]).map(
    mapPublicListingCard,
  )
}

export async function searchPublishedListings(
  options: SearchPublishedListingsOptions = {},
): Promise<PaginatedPublicListings> {
  const words = searchableWords(options.query ?? "")
  const sort = options.sort ?? "recientes"
  const page = options.page ?? 1
  const from = (page - 1) * PUBLIC_LISTINGS_PAGE_SIZE
  const to = from + PUBLIC_LISTINGS_PAGE_SIZE - 1

  let query = supabase
    .from("listings")
    .select(
      "id,listing_type,title,category,condition,price,stock,vehicle_brand,vehicle_model,year_from,year_to,region,commune,created_at,listing_images(storage_path,position,is_primary)",
      { count: "exact" },
    )
    .eq("status", "published")
    .order("is_primary", {
      referencedTable: "listing_images",
      ascending: false,
    })
    .order("position", {
      referencedTable: "listing_images",
      ascending: true,
    })
    .limit(1, { referencedTable: "listing_images" })

  if (sort === "precio_asc") query = query.order("price", { ascending: true })
  else if (sort === "precio_desc")
    query = query.order("price", { ascending: false })
  else query = query.order("created_at", { ascending: false })

  for (const word of words)
    query = query.ilike("search_normalized", `%${word}%`)

  if (options.listingType) query = query.eq("listing_type", options.listingType)
  if (options.category) query = query.eq("category", options.category)
  if (options.brand) query = query.eq("vehicle_brand", options.brand)
  if (options.model) query = query.eq("vehicle_model", options.model)
  if (options.region) query = query.ilike("region", `%${options.region}%`)
  if (options.condition) query = query.eq("condition", options.condition)
  if (options.year) {
    query = query.or(`year_from.is.null,year_from.lte.${options.year}`)
    query = query.or(`year_to.is.null,year_to.gte.${options.year}`)
  }
  if (options.minPrice !== undefined)
    query = query.gte("price", options.minPrice)
  if (options.maxPrice !== undefined)
    query = query.lte("price", options.maxPrice)

  query = query.range(from, to)

  const { data, error, count } = await query
  if (error) {
    if (error.code === "PGRST103") {
      let countQuery = supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("status", "published")

      for (const word of words)
        countQuery = countQuery.ilike("search_normalized", `%${word}%`)
      if (options.listingType)
        countQuery = countQuery.eq("listing_type", options.listingType)
      if (options.category)
        countQuery = countQuery.eq("category", options.category)
      if (options.brand)
        countQuery = countQuery.eq("vehicle_brand", options.brand)
      if (options.model)
        countQuery = countQuery.eq("vehicle_model", options.model)
      if (options.region)
        countQuery = countQuery.ilike("region", `%${options.region}%`)
      if (options.condition)
        countQuery = countQuery.eq("condition", options.condition)
      if (options.year) {
        countQuery = countQuery.or(
          `year_from.is.null,year_from.lte.${options.year}`,
        )
        countQuery = countQuery.or(
          `year_to.is.null,year_to.gte.${options.year}`,
        )
      }
      if (options.minPrice !== undefined)
        countQuery = countQuery.gte("price", options.minPrice)
      if (options.maxPrice !== undefined)
        countQuery = countQuery.lte("price", options.maxPrice)

      const { count: fallbackCount, error: countError } = await countQuery
      if (!countError) {
        const total = fallbackCount ?? 0
        return {
          items: [],
          total,
          page,
          pageSize: PUBLIC_LISTINGS_PAGE_SIZE,
          totalPages: Math.ceil(total / PUBLIC_LISTINGS_PAGE_SIZE),
        }
      }
    }

    if (import.meta.env.DEV)
      console.error(
        `No se pudo buscar en el catálogo público (${error.code}): ${error.message}`,
      )
    throw new PublicListingsQueryError("No pudimos cargar los resultados.")
  }

  const total = count ?? 0
  return {
    items: ((data ?? []) as unknown as PublicListingCardRow[]).map(
      mapPublicListingCard,
    ),
    total,
    page,
    pageSize: PUBLIC_LISTINGS_PAGE_SIZE,
    totalPages: Math.ceil(total / PUBLIC_LISTINGS_PAGE_SIZE),
  }
}

type PublicFilterOptionsRow = {
  category: string
  vehicle_brand: string | null
  vehicle_model: string | null
  region: string
}

function sorted(values: Iterable<string>): string[] {
  return [...values].sort((first, second) =>
    first.localeCompare(second, "es-CL", { sensitivity: "base" }),
  )
}

export async function getPublicListingFilterOptions(): Promise<PublicListingFilterOptions> {
  const { data, error } = await supabase
    .from("listings")
    .select("category,vehicle_brand,vehicle_model,region")
    .eq("status", "published")

  if (error) {
    if (import.meta.env.DEV)
      console.error("No se pudieron cargar las opciones del catálogo:", {
        code: error.code,
        message: error.message,
      })
    throw new PublicListingsQueryError(
      "No pudimos cargar las opciones de filtros.",
    )
  }

  const categories = new Set<string>()
  const brands = new Set<string>()
  const regions = new Set<string>()
  const modelSetsByBrand: Record<string, Set<string>> = {}

  for (const row of (data ?? []) as PublicFilterOptionsRow[]) {
    categories.add(row.category)
    regions.add(row.region)
    if (!row.vehicle_brand) continue
    brands.add(row.vehicle_brand)
    if (!row.vehicle_model) continue
    modelSetsByBrand[row.vehicle_brand] ??= new Set<string>()
    modelSetsByBrand[row.vehicle_brand].add(row.vehicle_model)
  }

  return {
    categories: [
      ...PARTS_MENU_CATEGORIES.map((category) => category.value),
      ...sorted(categories).filter(
        (value) =>
          !PARTS_MENU_CATEGORIES.some((category) => category.value === value),
      ),
    ],
    brands: sorted(brands),
    regions: sorted(regions),
    modelsByBrand: Object.fromEntries(
      Object.entries(modelSetsByBrand).map(([brand, models]) => [
        brand,
        sorted(models),
      ]),
    ),
  }
}
