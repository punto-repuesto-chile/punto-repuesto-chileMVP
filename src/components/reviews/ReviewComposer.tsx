import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import StarRating from "./StarRating"

type ReviewComposerProps = {
  initialRating?: number
  initialComment?: string | null
  isSubmitting?: boolean
  error?: string | null
  onClose: () => void
  onSubmit: (rating: number, comment: string | null) => void
}

export default function ReviewComposer({
  initialRating = 0,
  initialComment,
  isSubmitting = false,
  error,
  onClose,
  onSubmit,
}: ReviewComposerProps) {
  const [rating, setRating] = useState(initialRating)
  const [comment, setComment] = useState(initialComment ?? "")
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) onClose()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [isSubmitting, onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-petrol-dark/45 px-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onClose()
      }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-composer-title"
        className="w-full max-w-lg rounded-3xl border border-white/60 bg-white p-6 shadow-2xl sm:p-8"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit(rating, comment.trim() || null)
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-orange">
              Trato confirmado
            </p>
            <h2
              id="review-composer-title"
              className="mt-2 font-display text-2xl font-extrabold"
            >
              {initialComment !== undefined
                ? "Tu reseña"
                : "Califica este trato"}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            disabled={isSubmitting || rating < 1}
            aria-label="Cerrar"
            className="rounded-full px-2 py-1 text-2xl leading-none text-muted transition hover:bg-bg disabled:opacity-50"
          >
            ×
          </button>
        </div>
        <label
          className="mt-7 block text-sm font-semibold"
          htmlFor="review-comment"
        >
          Estrellas
        </label>
        <div className="mt-2">
          <StarRating
            value={rating}
            onChange={setRating}
            label="Selecciona una calificación"
            size="lg"
          />
        </div>
        <label
          className="mt-6 block text-sm font-semibold"
          htmlFor="review-comment"
        >
          Comentario <span className="font-normal text-muted">(opcional)</span>
        </label>
        <textarea
          id="review-comment"
          value={comment}
          maxLength={1000}
          onChange={(event) => setComment(event.target.value)}
          rows={5}
          placeholder="Cuenta brevemente cómo fue el trato."
          className="mt-2 w-full resize-y rounded-xl border border-border px-4 py-3 text-sm outline-none transition focus:border-orange focus:ring-2 focus:ring-orange/20"
        />
        <p className="mt-1 text-right text-xs text-muted">
          {comment.length}/1000
        </p>
        {error && (
          <p
            role="alert"
            className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700"
          >
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-muted hover:bg-bg disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-orange px-4 py-2.5 text-sm font-bold text-white transition hover:bg-orange-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Publicando…" : "Publicar reseña"}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  )
}
