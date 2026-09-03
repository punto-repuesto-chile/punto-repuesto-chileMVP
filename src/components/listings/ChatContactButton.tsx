import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { getOrCreateConversation } from "../../services/chatService"
export default function ChatContactButton({
  listingId,
  sellerId,
}: {
  listingId: string
  sellerId: string
}) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  if (user?.id === sellerId) return null
  const click = async () => {
    if (!user) {
      navigate("/login", { state: { from: location.pathname, reason: "chat" } })
      return
    }
    setBusy(true)
    setError("")
    try {
      const c = await getOrCreateConversation(listingId)
      navigate(`/mensajes/${c.id}`)
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No pudimos abrir la conversación.",
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <div>
      <button
        onClick={() => void click()}
        disabled={busy}
        className="w-full rounded-xl border-2 border-petrol px-4 py-3 text-sm font-bold text-petrol hover:bg-petrol hover:text-white disabled:opacity-60"
      >
        {busy ? "Abriendo…" : "Contactar por chat"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
