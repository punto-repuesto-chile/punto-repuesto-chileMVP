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

export class PublicListingsQueryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "PublicListingsQueryError"
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

  return ((data ?? []) as unknown as PublicListingCardRow[]).map((row) => {
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
  })
}
