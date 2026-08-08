import { supabase } from "../lib/supabase"
import { getListingImagePublicUrl } from "./listingService"
import type {
  PublicListingCard,
  PublicListingCondition,
  PublicListingType,
} from "./publicListingService"

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type PublicSellerProfile = {
  id: string
  fullName: string
  createdAt: string
}

type PublicSellerProfileRow = {
  id: string
  full_name: string
  created_at: string
}

type SellerListingImageRow = {
  storage_path: string
  position: number
  is_primary: boolean
}

type SellerListingRow = {
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
  listing_images: SellerListingImageRow[] | null
}

export class SellerQueryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "SellerQueryError"
  }
}

type SellerErrorDetails = {
  code: string
  message: string
}

function reportSellerQueryError(
  context: string,
  error: SellerErrorDetails,
): void {
  if (import.meta.env.DEV)
    console.error(context, { code: error.code, message: error.message })
}

export async function getPublicSellerProfile(
  sellerId: string,
): Promise<PublicSellerProfile | null> {
  if (!UUID_PATTERN.test(sellerId)) return null

  const { data, error } = await supabase
    .rpc("get_public_seller_profile", { target_seller_id: sellerId })
    .maybeSingle()

  if (error) {
    reportSellerQueryError("No se pudo cargar el perfil público.", error)
    throw new SellerQueryError("No pudimos cargar el perfil del vendedor.")
  }

  if (!data) return null
  const row = data as PublicSellerProfileRow
  return { id: row.id, fullName: row.full_name, createdAt: row.created_at }
}

export async function getPublishedListingsBySeller(
  sellerId: string,
): Promise<PublicListingCard[]> {
  if (!UUID_PATTERN.test(sellerId)) return []

  const { data, error } = await supabase
    .from("listings")
    .select(
      "id,listing_type,title,category,condition,price,stock,vehicle_brand,vehicle_model,year_from,year_to,region,commune,created_at,listing_images(storage_path,position,is_primary)",
    )
    .eq("seller_id", sellerId)
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

  if (error) {
    reportSellerQueryError("No se pudieron cargar las publicaciones.", error)
    throw new SellerQueryError("No pudimos cargar el perfil del vendedor.")
  }

  return ((data ?? []) as unknown as SellerListingRow[]).map((row) => {
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
