import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { useAuth } from "./AuthContext"
import {
  addFavorite,
  getFavoriteListingIds,
  removeFavorite,
} from "../services/favoriteService"

type FavoritesContextValue = {
  favoriteListingIds: Set<string>
  pendingListingIds: Set<string>
  isLoading: boolean
  error: string | null
  isFavorite: (listingId: string) => boolean
  toggleFavorite: (listingId: string) => Promise<void>
  refreshFavorites: () => Promise<void>
  clearError: () => void
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null)

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth()
  const [favoriteListingIds, setFavoriteListingIds] = useState<Set<string>>(
    new Set(),
  )
  const [pendingListingIds, setPendingListingIds] = useState<Set<string>>(
    new Set(),
  )
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshFavorites = useCallback(async () => {
    if (!user) {
      setFavoriteListingIds(new Set())
      setIsLoading(false)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      setFavoriteListingIds(await getFavoriteListingIds())
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No pudimos cargar tus favoritos.",
      )
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (isAuthLoading) return
    void refreshFavorites()
  }, [isAuthLoading, refreshFavorites])

  const toggleFavorite = useCallback(
    async (listingId: string) => {
      if (!user || pendingListingIds.has(listingId)) return

      const wasFavorite = favoriteListingIds.has(listingId)
      setPendingListingIds((current) => new Set(current).add(listingId))
      setError(null)
      try {
        if (wasFavorite) await removeFavorite(listingId)
        else await addFavorite(listingId)

        setFavoriteListingIds((current) => {
          const next = new Set(current)
          if (wasFavorite) next.delete(listingId)
          else next.add(listingId)
          return next
        })
      } catch (requestError: unknown) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "No pudimos actualizar este favorito.",
        )
        throw requestError
      } finally {
        setPendingListingIds((current) => {
          const next = new Set(current)
          next.delete(listingId)
          return next
        })
      }
    },
    [favoriteListingIds, pendingListingIds, user],
  )

  const value = useMemo<FavoritesContextValue>(
    () => ({
      favoriteListingIds,
      pendingListingIds,
      isLoading,
      error,
      isFavorite: (listingId) => favoriteListingIds.has(listingId),
      toggleFavorite,
      refreshFavorites,
      clearError: () => setError(null),
    }),
    [
      favoriteListingIds,
      pendingListingIds,
      isLoading,
      error,
      toggleFavorite,
      refreshFavorites,
    ],
  )

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const context = useContext(FavoritesContext)
  if (!context)
    throw new Error("useFavorites debe utilizarse dentro de FavoritesProvider")
  return context
}
