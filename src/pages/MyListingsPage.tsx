import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import ListingStatusConfirmModal from "../components/listings/ListingStatusConfirmModal"
import MyListingCard from "../components/listings/MyListingCard"
import MyListingsEmptyState from "../components/listings/MyListingsEmptyState"
import MyListingsFilters, {
  type ListingsFilter,
} from "../components/listings/MyListingsFilters"
import MyListingsSkeleton from "../components/listings/MyListingsSkeleton"
import {
  deleteOwnedListing,
  getMyListings,
  ListingPublicationError,
  updateOwnedListingStatus,
  type ListingStatus,
  type MyListing,
  type OwnedListingAction,
  type OwnedListingStatusUpdate,
} from "../services/listingService"

const STATUSES: ListingStatus[] = ["published", "draft", "paused", "sold"]

type PendingAction = {
  listingId: string
  action: OwnedListingAction
}

export default function MyListingsPage() {
  const [listings, setListings] = useState<MyListing[]>([])
  const [activeFilter, setActiveFilter] = useState<ListingsFilter>("all")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionNotice, setActionNotice] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const actionLockRef = useRef(false)
  const [updatingListingIds, setUpdatingListingIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [requestNumber, setRequestNumber] = useState(0)

  useEffect(() => {
    let active = true
    setIsLoading(true)
    setError(null)

    void getMyListings()
      .then((result) => {
        if (active) setListings(result)
      })
      .catch((requestError: unknown) => {
        if (!active) return
        const message =
          requestError instanceof Error
            ? requestError.message
            : "No pudimos cargar tus publicaciones."
        console.error("Error al cargar publicaciones:", message)
        setError(message)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [requestNumber])

  const counts = useMemo(() => {
    const result: Record<ListingsFilter, number> = {
      all: listings.length,
      published: 0,
      draft: 0,
      paused: 0,
      sold: 0,
    }
    for (const status of STATUSES)
      result[status] = listings.filter(
        (listing) => listing.status === status,
      ).length
    return result
  }, [listings])

  const filteredListings = useMemo(
    () =>
      activeFilter === "all"
        ? listings
        : listings.filter((listing) => listing.status === activeFilter),
    [activeFilter, listings],
  )

  const changeListingStatus = async (
    listingId: string,
    status: OwnedListingStatusUpdate,
  ): Promise<boolean> => {
    if (updatingListingIds.has(listingId)) return false
    setUpdatingListingIds((current) => new Set(current).add(listingId))
    setActionError(null)
    try {
      const updatedListing = await updateOwnedListingStatus(listingId, status)
      setListings((current) =>
        current.map((listing) =>
          listing.id === listingId ? updatedListing : listing,
        ),
      )
      return true
    } catch (requestError) {
      setActionError(
        requestError instanceof ListingPublicationError
          ? requestError.message
          : "No pudimos actualizar la publicación. Inténtalo nuevamente.",
      )
      return false
    } finally {
      setUpdatingListingIds((current) => {
        const next = new Set(current)
        next.delete(listingId)
        return next
      })
    }
  }

  const requestAction = (listingId: string, action: OwnedListingAction) => {
    setActionError(null)
    setPendingAction({ listingId, action })
  }

  const confirmPendingAction = async () => {
    if (!pendingAction || actionLockRef.current) return
    actionLockRef.current = true
    try {
      if (pendingAction.action === "delete") {
        setUpdatingListingIds((current) =>
          new Set(current).add(pendingAction.listingId),
        )
        setActionError(null)
        try {
          const result = await deleteOwnedListing(pendingAction.listingId)
          setListings((current) =>
            current.filter((listing) => listing.id !== pendingAction.listingId),
          )
          setActionNotice(
            result.storageCleanupFailed
              ? "La publicación fue eliminada, pero quedaron archivos pendientes de limpieza."
              : "Publicación eliminada correctamente.",
          )
          setPendingAction(null)
        } catch (requestError) {
          setActionError(
            requestError instanceof ListingPublicationError
              ? requestError.message
              : "No pudimos eliminar la publicación. Inténtalo nuevamente.",
          )
        } finally {
          setUpdatingListingIds((current) => {
            const next = new Set(current)
            next.delete(pendingAction.listingId)
            return next
          })
        }
        return
      }
      const succeeded = await changeListingStatus(
        pendingAction.listingId,
        pendingAction.action,
      )
      if (succeeded) setPendingAction(null)
    } finally {
      actionLockRef.current = false
    }
  }

  const cancelPendingAction = () => {
    if (
      pendingAction &&
      !updatingListingIds.has(pendingAction.listingId) &&
      !actionLockRef.current
    )
      setPendingAction(null)
  }

  return (
    <div className="min-h-screen bg-bg text-petrol-dark">
      <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
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
            Nueva publicación
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        {actionNotice && (
          <div
            role="status"
            className="mb-6 flex items-start justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800"
          >
            <span>{actionNotice}</span>
            <button
              type="button"
              onClick={() => setActionNotice(null)}
              className="shrink-0 font-bold"
              aria-label="Cerrar mensaje"
            >
              ×
            </button>
          </div>
        )}
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-orange">
              Panel del vendedor
            </p>
            <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">
              Mis publicaciones
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              Revisa el estado y la información principal de los productos que
              has publicado.
            </p>
          </div>
          {!isLoading && !error && listings.length > 0 && (
            <p className="text-sm font-semibold text-muted">
              {listings.length}{" "}
              {listings.length === 1 ? "publicación" : "publicaciones"}
            </p>
          )}
        </div>

        {isLoading ? (
          <MyListingsSkeleton />
        ) : error ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-white px-6 py-10 text-center shadow-sm"
          >
            <h2 className="font-display text-xl font-bold text-petrol-dark">
              No pudimos cargar tus publicaciones
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">{error}</p>
            <button
              type="button"
              onClick={() => setRequestNumber((current) => current + 1)}
              className="mt-5 rounded-xl bg-petrol px-5 py-2.5 text-sm font-bold text-white hover:bg-petrol-dark"
            >
              Reintentar
            </button>
          </div>
        ) : listings.length === 0 ? (
          <MyListingsEmptyState />
        ) : (
          <>
            {actionError && (
              <div
                role="alert"
                className="mb-6 flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700"
              >
                <span>{actionError}</span>
                <button
                  type="button"
                  onClick={() => setActionError(null)}
                  className="shrink-0 font-bold"
                  aria-label="Cerrar mensaje"
                >
                  ×
                </button>
              </div>
            )}
            <div className="mb-6">
              <MyListingsFilters
                activeFilter={activeFilter}
                counts={counts}
                onChange={setActiveFilter}
              />
            </div>
            {filteredListings.length === 0 ? (
              <MyListingsEmptyState filtered />
            ) : (
              <div className="space-y-4">
                {filteredListings.map((listing) => (
                  <MyListingCard
                    key={listing.id}
                    listing={listing}
                    isUpdating={updatingListingIds.has(listing.id)}
                    onRequestAction={requestAction}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>
      {pendingAction && (
        <ListingStatusConfirmModal
          targetStatus={pendingAction.action}
          isSubmitting={updatingListingIds.has(pendingAction.listingId)}
          error={actionError}
          onCancel={cancelPendingAction}
          onConfirm={() => void confirmPendingAction()}
        />
      )}
    </div>
  )
}
