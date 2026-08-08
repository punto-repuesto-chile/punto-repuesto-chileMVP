import { supabase } from "../lib/supabase"
import {
  getPublishedListingsByIds,
  type PublicListingCard,
} from "./publicListingService"

type FavoriteIdRow = {
  listing_id: string
  created_at: string
}

export class FavoriteServiceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "FavoriteServiceError"
  }
}

async function authenticatedUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user)
    throw new FavoriteServiceError(
      "Tu sesión no está disponible. Inicia sesión nuevamente.",
    )
  return data.user.id
}

export async function getFavoriteListingIds(): Promise<Set<string>> {
  await authenticatedUserId()
  const { data, error } = await supabase.from("favorites").select("listing_id")

  if (error) {
    if (import.meta.env.DEV)
      console.error(
        `No se pudieron cargar favoritos (${error.code}): ${error.message}`,
      )
    throw new FavoriteServiceError("No pudimos cargar tus favoritos.")
  }

  return new Set(
    ((data ?? []) as Pick<FavoriteIdRow, "listing_id">[]).map(
      (favorite) => favorite.listing_id,
    ),
  )
}

export async function addFavorite(listingId: string): Promise<void> {
  const userId = await authenticatedUserId()
  const { error } = await supabase
    .from("favorites")
    .upsert({ user_id: userId, listing_id: listingId }, {
      onConflict: "user_id,listing_id",
      ignoreDuplicates: true,
    })

  if (error) {
    if (import.meta.env.DEV)
      console.error(
        `No se pudo guardar favorito (${error.code}): ${error.message}`,
      )
    throw new FavoriteServiceError(
      "No pudimos guardar esta publicación. Inténtalo nuevamente.",
    )
  }
}

export async function removeFavorite(listingId: string): Promise<void> {
  const userId = await authenticatedUserId()
  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("user_id", userId)
    .eq("listing_id", listingId)

  if (error) {
    if (import.meta.env.DEV)
      console.error(
        `No se pudo quitar favorito (${error.code}): ${error.message}`,
      )
    throw new FavoriteServiceError(
      "No pudimos quitar esta publicación. Inténtalo nuevamente.",
    )
  }
}

export async function getFavoriteListings(): Promise<PublicListingCard[]> {
  await authenticatedUserId()
  const { data, error } = await supabase
    .from("favorites")
    .select("listing_id,created_at")
    .order("created_at", { ascending: false })

  if (error) {
    if (import.meta.env.DEV)
      console.error(
        `No se pudieron consultar favoritos (${error.code}): ${error.message}`,
      )
    throw new FavoriteServiceError("No pudimos cargar tus favoritos.")
  }

  const favorites = (data ?? []) as FavoriteIdRow[]
  const listingIds = favorites.map((favorite) => favorite.listing_id)
  if (listingIds.length === 0) return []

  const listings = await getPublishedListingsByIds(listingIds)
  const listingsById = new Map(listings.map((listing) => [listing.id, listing]))
  return listingIds
    .map((listingId) => listingsById.get(listingId))
    .filter((listing): listing is PublicListingCard => Boolean(listing))
}
