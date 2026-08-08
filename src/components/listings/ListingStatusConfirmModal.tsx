import { useEffect, useRef } from "react"

import { createPortal } from "react-dom"

import type { OwnedListingAction } from "../../services/listingService"

const CONTENT: Record<OwnedListingAction, {
  title: string

  description: string

  confirmLabel: string
}> = {
  paused: {
    title: "¿Quieres pausar esta publicación?",

    description:
      "Dejará de ser visible públicamente hasta que vuelvas a publicarla.",

    confirmLabel: "Pausar publicación",
  },

  published: {
    title: "¿Quieres volver a publicar este producto?",

    description: "La publicación volverá a estar disponible públicamente.",

    confirmLabel: "Volver a publicar",
  },

  sold: {
    title: "¿Confirmas que este producto fue vendido?",

    description: "La publicación dejará de estar disponible públicamente.",

    confirmLabel: "Marcar como vendida",
  },

  delete: {
    title: "¿Eliminar esta publicación?",

    description:
      "Esta acción eliminará permanentemente la publicación y sus imágenes. No podrás recuperarla.",

    confirmLabel: "Eliminar publicación",
  },
}

export default function ListingStatusConfirmModal({
  targetStatus,

  isSubmitting,

  error,

  onCancel,

  onConfirm,
}: {
  targetStatus: OwnedListingAction

  isSubmitting: boolean

  error?: string | null

  onCancel: () => void

  onConfirm: () => void
}) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  const onCancelRef = useRef(onCancel)

  const content = CONTENT[targetStatus]

  useEffect(() => {
    onCancelRef.current = onCancel
  }, [onCancel])

  useEffect(() => {
    cancelButtonRef.current?.focus()

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancelRef.current()
    }

    document.addEventListener("keydown", closeOnEscape)

    return () => document.removeEventListener("keydown", closeOnEscape)
  }, [])

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-petrol-dark/45 px-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onCancel()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="status-confirm-title"
        aria-describedby="status-confirm-description"
        className="w-full max-w-md rounded-2xl border border-white/60 bg-white p-6 shadow-2xl sm:p-7"
      >
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-full ${
            targetStatus === "delete"
              ? "bg-red-100 text-red-700"
              : "bg-orange/10 text-orange-dark"
          }`}
        >
          <span aria-hidden="true" className="text-xl font-extrabold">
            !
          </span>
        </div>
        <h2
          id="status-confirm-title"
          className="mt-5 font-display text-xl font-extrabold text-petrol-dark"
        >
          {content.title}
        </h2>
        <p id="status-confirm-description" className="mt-2 text-sm text-muted">
          {content.description}
        </p>
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700"
          >
            {error}
          </p>
        )}
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            ref={cancelButtonRef}
            type="button"
            disabled={isSubmitting}
            onClick={onCancel}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-muted transition hover:bg-bg disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2.5 text-sm font-bold text-white transition disabled:cursor-wait disabled:opacity-60 ${
              targetStatus === "delete"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-orange hover:bg-orange-dark"
            }`}
          >
            {isSubmitting
              ? targetStatus === "delete"
                ? "Eliminando..."
                : "Actualizando..."
              : content.confirmLabel}
          </button>
        </div>
      </div>
    </div>,

    document.body,
  )
}
