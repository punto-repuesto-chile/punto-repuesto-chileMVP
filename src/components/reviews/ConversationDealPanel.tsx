import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
  getConversationDeal,
  proposeDeal,
  respondDeal,
} from "../../services/reviewService"
import type { ConversationDeal } from "../../types/review"

export default function ConversationDealPanel({
  conversationId,
  refreshKey,
}: {
  conversationId: string
  refreshKey: number
}) {
  const [deal, setDeal] = useState<ConversationDeal | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const load = async () => {
    try {
      setDeal(await getConversationDeal(conversationId))
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos cargar el trato.")
    }
  }
  useEffect(() => {
    void load()
  }, [conversationId, refreshKey])
  const propose = async () => {
    setBusy(true)
    setError(null)
    try {
      await proposeDeal(conversationId)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos proponer el trato.")
    } finally {
      setBusy(false)
    }
  }
  const respond = async (action: "confirm" | "reject") => {
    if (!deal?.interactionId) return
    setBusy(true)
    setError(null)
    try {
      await respondDeal(deal.interactionId, action)
      await load()
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No pudimos responder al trato.",
      )
    } finally {
      setBusy(false)
    }
  }
  if (!deal) return null
  let content
  if (!deal.interactionId)
    content = deal.bothMessaged ? (
      <button
        type="button"
        disabled={busy}
        onClick={() => void propose()}
        className="rounded-lg bg-green px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
      >
        Proponer trato
      </button>
    ) : (
      <p className="text-xs text-muted">
        Ambas personas deben enviar un mensaje antes de proponer un trato.
      </p>
    )
  else if (deal.status === "pending" && deal.initiatedByMe)
    content = (
      <p className="text-xs font-semibold text-petrol">
        Esperando confirmación de la otra persona.
      </p>
    )
  else if (deal.status === "pending")
    content = (
      <div>
        <p className="mb-2 text-xs text-petrol-dark">
          La otra persona indicó que realizaron un trato. Confirmar habilita al
          comprador para dejar una reseña.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void respond("confirm")}
            className="rounded-lg bg-green px-3 py-2 text-xs font-bold text-white"
          >
            Confirmar trato
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void respond("reject")}
            className="rounded-lg border border-border px-3 py-2 text-xs font-bold text-red-700"
          >
            Rechazar
          </button>
        </div>
      </div>
    )
  else if (deal.status === "confirmed")
    content = (
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold text-green">Trato confirmado</p>
        {deal.myRole === "buyer" && !deal.hasReview && (
          <Link to="/mis-tratos" className="text-xs font-bold text-petrol">
            Dejar reseña
          </Link>
        )}
      </div>
    )
  else
    content = (
      <p className="text-xs font-bold text-muted">
        {deal.status === "rejected"
          ? "Trato rechazado"
          : "Propuesta de trato expirada"}
      </p>
    )
  return (
    <div className="shrink-0 border-t border-border bg-white px-4 py-3">
      <div className="mx-auto max-w-3xl rounded-xl bg-bg px-4 py-3">
        {content}
        {error && (
          <p role="alert" className="mt-2 text-xs text-red-700">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
