import { supabase } from "../lib/supabase"
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

export type SearchPublishedListingsOptions = {
  query?: string
  category?: string
  brand?: string
  model?: string
  year?: number
  region?: string
  condition?: PublicListingCondition
  minPrice?: number
  maxPrice?: number
  sort?: PublicListingSort
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

const SEARCHABLE_COLUMNS = [
  "title",
  "category",
  "vehicle_brand",
  "vehicle_model",
  "oem_code",
  "region",
  "commune",
] as const

function normalizeSearchTerm(term: string): string {
  return term.trim().replace(/\s+/g, " ")
}

function searchableWords(term: string): string[] {
  return normalizeSearchTerm(term)
    .split(" ")
    .map((word) => word.replace(/[,()*%\"]/g, ""))
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

export async function searchPublishedListings(
  options: SearchPublishedListingsOptions = {},
): Promise<PublicListingCard[]> {
  const words = searchableWords(options.query ?? "")
  const sort = options.sort ?? "recientes"

  let query = supabase
    .from("listings")
    .select(
      "id,listing_type,title,category,condition,price,stock,vehicle_brand,vehicle_model,year_from,year_to,region,commune,created_at,listing_images(storage_path,position,is_primary)",
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
    query = query.or(
      SEARCHABLE_COLUMNS.map((column) => `${column}.ilike.*${word}*`).join(","),
    )

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

  const { data, error } = await query
  if (error) {
    if (import.meta.env.DEV)
      console.error("No se pudo buscar en el catálogo público:", {
        code: error.code,
        message: error.message,
      })
    throw new PublicListingsQueryError("No pudimos cargar los resultados.")
  }

  return ((data ?? []) as unknown as PublicListingCardRow[]).map(
    mapPublicListingCard,
  )
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
    categories: sorted(categories),
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
