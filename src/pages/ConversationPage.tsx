import { type FormEvent, useCallback, useEffect, useRef, useState } from "react"
import { Link, useParams } from "react-router-dom"
import {
  ChatServiceError,
  getChatAvatarPublicUrl,
  getConversationContext,
  getConversationMessages,
  mapRealtimeChatMessage,
  markConversationRead,
  sendMessage,
} from "../services/chatService"
import { useChatRealtime } from "../hooks/useChatRealtime"
import type { ChatMessage, ConversationContext } from "../types/chat"
import ConversationDealPanel from "../components/reviews/ConversationDealPanel"

const formatTime = (value: string) =>
  new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))

export default function ConversationPage() {
  const { conversationId = "" } = useParams<{ conversationId: string }>()
  const [context, setContext] = useState<ConversationContext | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [body, setBody] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [hasOlder, setHasOlder] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const [dealRefreshKey, setDealRefreshKey] = useState(0)
  const handleRealtimeMessage = useCallback(
    (payload: Record<string, unknown>) => {
      const message = mapRealtimeChatMessage(payload)
      if (!message) return
      setMessages((current) =>
        current.some((item) => item.id === message.id)
          ? current
          : [...current, message],
      )
      setDealRefreshKey((current) => current + 1)
      if (document.visibilityState === "visible" && context)
        void markConversationRead(conversationId)
    },
    [context, conversationId],
  )
  const refreshConversation = useCallback(() => {
    if (document.visibilityState === "visible")
      void markConversationRead(conversationId)
  }, [conversationId])
  useChatRealtime(
    context ? conversationId : null,
    handleRealtimeMessage,
    refreshConversation,
  )

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    void Promise.all([
      getConversationContext(conversationId),
      getConversationMessages(conversationId, { limit: 30 }),
    ])
      .then(async ([nextContext, nextMessages]) => {
        if (!active) return
        setContext(nextContext)
        setMessages([...nextMessages].reverse())
        setHasOlder(nextMessages.length === 30)
        await markConversationRead(conversationId)
      })
      .catch((requestError: unknown) => {
        if (!active) return
        setError(
          requestError instanceof ChatServiceError
            ? requestError.message
            : "No tienes acceso a esta conversación.",
        )
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [conversationId])

  useEffect(() => {
    if (!loadingOlder) endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length, loadingOlder])

  useEffect(() => {
    const markVisible = () => {
      if (document.visibilityState === "visible" && context)
        void markConversationRead(conversationId)
    }
    document.addEventListener("visibilitychange", markVisible)
    window.addEventListener("focus", markVisible)
    return () => {
      document.removeEventListener("visibilitychange", markVisible)
      window.removeEventListener("focus", markVisible)
    }
  }, [context, conversationId])

  const loadOlder = async () => {
    if (!messages[0] || loadingOlder) return
    setLoadingOlder(true)
    setError(null)
    try {
      const older = await getConversationMessages(conversationId, {
        before: messages[0].createdAt,
        limit: 30,
      })
      setMessages((current) => [...older].reverse().concat(current))
      setHasOlder(older.length === 30)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No pudimos cargar los mensajes anteriores.",
      )
    } finally {
      setLoadingOlder(false)
    }
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const text = body.trim()
    if (!text || sending) return
    setSending(true)
    setError(null)
    try {
      const sent = await sendMessage(conversationId, text)
      setMessages((current) => [...current, sent])
      setBody("")
      await markConversationRead(conversationId)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No pudimos enviar tu mensaje.",
      )
    } finally {
      setSending(false)
    }
  }

  if (loading)
    return (
      <main
        className="min-h-screen bg-bg p-8 text-center text-muted"
        aria-busy="true"
      >
        Cargando conversación…
      </main>
    )
  if (!context)
    return (
      <main className="min-h-screen bg-bg px-4 py-12 text-center">
        <p role="alert" className="text-red-700">
          {error}
        </p>
        <Link
          to="/mensajes"
          className="mt-5 inline-block font-bold text-petrol"
        >
          Volver a mensajes
        </Link>
      </main>
    )

  const profilePath = context.counterpartyPublicId
    ? context.counterpartyType === "salvage_yard"
      ? `/desarmaduria/${context.counterpartyPublicId}`
      : `/vendedor/${context.counterpartyPublicId}`
    : null
  const avatarUrl = context.counterpartyAvatarPath
    ? getChatAvatarPublicUrl(
        context.counterpartyAvatarPath,
        context.counterpartyType,
      )
    : null

  return (
    <main className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-bg">
      <header className="shrink-0 border-b border-border bg-white px-3 py-3 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Link
            to="/mensajes"
            aria-label="Volver a mensajes"
            className="shrink-0 p-2 text-xl text-petrol"
          >
            ←
          </Link>
          {profilePath ? (
            <Link
              to={profilePath}
              className="flex min-w-0 flex-1 items-center gap-3"
            >
              <Avatar name={context.counterpartyName} url={avatarUrl} />
              <Identity context={context} />
            </Link>
          ) : (
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar name={context.counterpartyName} url={avatarUrl} />
              <Identity context={context} />
            </div>
          )}
        </div>
      </header>
      <section className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col overflow-y-auto px-4 py-6 sm:px-6">
        {hasOlder && (
          <button
            type="button"
            disabled={loadingOlder}
            onClick={() => void loadOlder()}
            className="mx-auto mb-5 text-sm font-bold text-petrol disabled:opacity-50"
          >
            {loadingOlder ? "Cargando…" : "Cargar mensajes anteriores"}
          </button>
        )}
        {error && (
          <p
            role="alert"
            className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}
        {messages.map((message) => {
          const isMine = message.senderRole === context.myRole
          return (
            <div
              key={message.id}
              className={`mb-3 flex ${
                isMine ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                  isMine
                    ? "rounded-br-md bg-petrol text-white"
                    : "rounded-bl-md border border-border bg-white text-petrol-dark"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">
                  {message.body}
                </p>
                <time className="mt-1 block text-right text-[11px] opacity-60">
                  {formatTime(message.createdAt)}
                </time>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </section>
      <ConversationDealPanel
        conversationId={conversationId}
        refreshKey={dealRefreshKey}
      />
      <form
        onSubmit={submit}
        className="shrink-0 border-t border-border bg-white p-3 sm:p-4"
      >
        <div className="mx-auto flex max-w-3xl items-end gap-2 sm:gap-3">
          <label htmlFor="message" className="sr-only">
            Escribe un mensaje
          </label>
          <textarea
            id="message"
            value={body}
            maxLength={3000}
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                event.currentTarget.form?.requestSubmit()
              }
            }}
            rows={2}
            placeholder="Escribe un mensaje…"
            className="min-h-12 min-w-0 flex-1 resize-none rounded-xl border border-border px-3 py-3 text-sm outline-none focus:border-petrol sm:px-4"
          />
          <button
            type="submit"
            disabled={sending || !body.trim()}
            className="rounded-xl bg-orange px-4 py-3 text-sm font-bold text-white disabled:opacity-50 sm:px-5"
          >
            {sending ? "Enviando…" : "Enviar"}
          </button>
        </div>
      </form>
    </main>
  )
}

function Avatar({ name, url }: { name: string, url: string | null }) {
  return url ? (
    <img
      src={url}
      alt=""
      className="h-11 w-11 shrink-0 rounded-xl object-cover"
    />
  ) : (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-petrol/10 font-bold text-petrol">
      {name.slice(0, 1).toUpperCase()}
    </span>
  )
}

function Identity({ context }: { context: ConversationContext }) {
  return (
    <span className="min-w-0">
      <span className="block truncate font-bold text-petrol-dark">
        {context.counterpartyName}
      </span>
      <span className="block truncate text-xs text-muted">
        {context.listingTitle}
      </span>
    </span>
  )
}
