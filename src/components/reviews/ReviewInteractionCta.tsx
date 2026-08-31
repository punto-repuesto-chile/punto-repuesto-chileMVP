import { useState } from "react"

import { useLocation, useNavigate } from "react-router-dom"

import { useAuth } from "../../context/AuthContext"

import { requestReviewInteraction } from "../../services/reviewService"

type ReviewInteractionCtaProps = {
  listingId: string

  sellerId: string
}

// MVP temporal: reemplazar por chat → trato → confirmación bilateral → reseña.
export default function ReviewInteractionCta({
  listingId,

  sellerId,
}: ReviewInteractionCtaProps) {
  const location = useLocation()

  const navigate = useNavigate()

  const { user } = useAuth()

  const [message, setMessage] = useState<string | null>(null)

  const [error, setError] = useState<string | null>(null)

  const [isRequesting, setIsRequesting] = useState(false)

  if (user?.id === sellerId) return null

  const requestInteraction = async () => {
    if (!user) {
      navigate("/login", {
        state: { from: location.pathname, reason: "review" },
      })

      return
    }

    if (isRequesting) return

    setIsRequesting(true)

    setError(null)

    setMessage(null)

    try {
      await requestReviewInteraction(listingId)

      setMessage(
        "Solicitud enviada. Si el vendedor confirma el trato, podrás dejar una reseña.",
      )
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No pudimos enviar la solicitud de trato.",
      )
    } finally {
      setIsRequesting(false)
    }
  }

  return (
    <section className="rounded-2xl border border-orange/20 bg-orange/5 p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-orange">
        Reputación
      </p>
      <h2 className="mt-1 font-display text-lg font-bold">
        ¿Realizaste un trato?
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        Si el vendedor confirma que realizaron un trato, podrás dejar una
        reseña.
      </p>
      <button
        type="button"
        onClick={() => void requestInteraction()}
        disabled={isRequesting}
        className="mt-4 w-full rounded-xl bg-orange px-4 py-2.5 text-sm font-bold text-white transition hover:bg-orange-dark disabled:cursor-wait disabled:opacity-60"
      >
        {isRequesting ? "Enviando…" : "Solicitar confirmación de trato"}
      </button>
      {message && (
        <p
          role="status"
          className="mt-3 text-sm font-semibold text-emerald-700"
        >
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
    </section>
  )
}
