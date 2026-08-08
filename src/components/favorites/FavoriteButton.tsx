import { useState, type MouseEvent } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { useFavorites } from "../../context/FavoritesContext"

export default function FavoriteButton({
  listingId,
  className = "",
}: {
  listingId: string
  className?: string
}) {
  const { user, isLoading: isAuthLoading } = useAuth()
  const { isFavorite, isLoading, pendingListingIds, toggleFavorite } =
    useFavorites()
  const navigate = useNavigate()
  const location = useLocation()
  const [localError, setLocalError] = useState("")
  const favorite = isFavorite(listingId)
  const pending = pendingListingIds.has(listingId)
  const unknown = isAuthLoading || (Boolean(user) && isLoading)

  const toggle = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setLocalError("")

    if (!user) {
      navigate("/login", {
        state: {
          from: `${location.pathname}${location.search}`,
          reason: "favorite",
        },
      })
      return
    }

    try {
      await toggleFavorite(listingId)
    } catch (requestError: unknown) {
      setLocalError(
        requestError instanceof Error
          ? requestError.message
          : "No pudimos actualizar este favorito.",
      )
    }
  }

  const label = favorite ? "Quitar de favoritos" : "Guardar en favoritos"

  return (
    <div className={className}>
      <button
        type="button"
        onClick={toggle}
        disabled={unknown || pending}
        aria-label={label}
        aria-pressed={favorite}
        aria-busy={pending}
        title={label}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/80 bg-white/95 text-xl text-orange shadow-md transition hover:scale-105 hover:bg-white focus:outline-none focus:ring-2 focus:ring-orange/40 disabled:cursor-wait disabled:opacity-60"
      >
        {unknown || pending ? (
          <span className="h-4 w-4 animate-pulse rounded-full bg-border" />
        ) : (
          <span aria-hidden="true">{favorite ? "♥" : "♡"}</span>
        )}
      </button>
      {localError && (
        <span
          className="absolute right-0 top-12 z-30 w-56 rounded-xl border border-red-200 bg-white p-3 text-left text-xs font-semibold text-red-700 shadow-lg"
          role="alert"
        >
          {localError}
        </span>
      )}
    </div>
  )
}
