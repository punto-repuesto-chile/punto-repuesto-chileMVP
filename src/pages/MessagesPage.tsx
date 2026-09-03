import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { getMyConversations } from "../services/chatService"
import type { ConversationSummary } from "../types/chat"
import { useChatRealtime } from "../hooks/useChatRealtime"

const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("es-CL", {
        day: "numeric",
        month: "short",
      }).format(new Date(value))
    : ""

export default function MessagesPage() {
  const [items, setItems] = useState<ConversationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const refresh = useCallback(() => setRetry((value) => value + 1), [])
  const ignoreMessage = useCallback(() => {}, [])
  useChatRealtime(null, ignoreMessage, refresh)
  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    void getMyConversations()
      .then((data) => active && setItems(data))
      .catch(
        (e: unknown) =>
          active &&
          setError(
            e instanceof Error
              ? e.message
              : "No pudimos cargar tus conversaciones.",
          ),
      )
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [retry])
  return (
    <main className="min-h-screen bg-bg px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <Link to="/" className="text-sm font-semibold text-petrol">
          ← Volver al inicio
        </Link>
        <h1 className="mt-8 font-display text-3xl font-extrabold text-petrol-dark">
          Mensajes
        </h1>
        <p className="mt-2 text-sm text-muted">
          Tus conversaciones sobre publicaciones.
        </p>
        {loading ? (
          <div className="mt-8 space-y-3" aria-busy="true">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-24 animate-pulse rounded-2xl bg-white"
              />
            ))}
          </div>
        ) : error ? (
          <div
            role="alert"
            className="mt-8 rounded-2xl border border-red-200 bg-white p-8 text-center"
          >
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={() => setRetry((n) => n + 1)}
              className="mt-4 rounded-xl bg-petrol px-4 py-2 text-sm font-bold text-white"
            >
              Reintentar
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-border bg-white p-10 text-center">
            <h2 className="font-display text-xl font-bold">
              Aún no tienes conversaciones.
            </h2>
            <p className="mt-2 text-sm text-muted">
              Cuando contactes a un vendedor desde una publicación, aparecerá
              aquí.
            </p>
          </div>
        ) : (
          <div className="mt-8 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white">
            {items.map((item) => (
              <Link
                key={item.id}
                to={`/mensajes/${item.id}`}
                className="flex gap-4 p-4 transition hover:bg-bg"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-petrol/10 font-bold text-petrol">
                  {item.counterpartAvatarPath ? (
                    <img
                      src={item.counterpartAvatarPath}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    item.counterpartDisplayName.slice(0, 1).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-3">
                    <h2 className="truncate font-bold text-petrol-dark">
                      {item.counterpartDisplayName}
                    </h2>
                    <span className="shrink-0 text-xs text-muted">
                      {formatDate(item.lastMessageAt ?? item.createdAt)}
                    </span>
                  </div>
                  <p className="truncate text-sm font-semibold text-petrol">
                    {item.listingTitle}
                  </p>
                  <p className="mt-1 truncate text-sm text-muted">
                    {item.lastMessagePreview ?? "Sin mensajes todavía"}
                  </p>
                </div>
                {item.unread && (
                  <span
                    className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-orange"
                    aria-label="No leído"
                  />
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
