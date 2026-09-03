import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../context/AuthContext"
import {
  getMyNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../services/notificationService"
import type { AppNotification } from "../../types/notification"

const dateLabel = (value: string) =>
  new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))

export default function NotificationBell() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<AppNotification[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const refresh = async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const [nextItems, nextCount] = await Promise.all([
        getMyNotifications({ limit: 20 }),
        getUnreadNotificationCount(),
      ])
      setItems(nextItems)
      setCount(nextCount)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No pudimos cargar tus notificaciones.",
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user) {
      setItems([])
      setCount(0)
      return
    }
    void refresh()
    const channel = supabase
      .channel("notifications-inbox")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => void refresh(),
      )
      .subscribe()
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", close)
    document.addEventListener("keydown", escape)
    return () => {
      void supabase.removeChannel(channel)
      document.removeEventListener("mousedown", close)
      document.removeEventListener("keydown", escape)
    }
  }, [user])

  const openNotification = async (item: AppNotification) => {
    if (!item.readAt) {
      try {
        await markNotificationRead(item.id)
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "No pudimos marcar la notificación como leída.",
        )
        return
      }
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id
            ? { ...entry, readAt: new Date().toISOString() }
            : entry,
        ),
      )
      setCount((current) => Math.max(0, current - 1))
    }
    setOpen(false)
    if (item.actionPath) navigate(item.actionPath)
  }

  const markAll = async () => {
    try {
      await markAllNotificationsRead()
      setItems((current) =>
        current.map((item) => ({
          ...item,
          readAt: item.readAt ?? new Date().toISOString(),
        })),
      )
      setCount(0)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No pudimos marcar las notificaciones como leídas.",
      )
    }
  }

  if (!user) return null
  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Notificaciones"
        aria-expanded={open}
        onClick={() => {
          setOpen((current) => !current)
          if (!open && items.length === 0) void refresh()
        }}
        className="relative rounded-lg p-2 text-muted transition-colors hover:bg-gray-100"
      >
        <BellIcon />
        {count > 0 && (
          <span
            aria-label={`${count} notificaciones sin leer`}
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange px-1 text-[10px] font-bold text-white"
          >
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Notificaciones"
          className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-white shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="font-display text-sm font-extrabold text-petrol-dark">
              Notificaciones
            </h2>
            {count > 0 && (
              <button
                type="button"
                onClick={() => void markAll()}
                className="text-xs font-bold text-petrol"
              >
                Marcar todas como leídas
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <p className="p-5 text-sm text-muted">Cargando notificaciones…</p>
            ) : error ? (
              <div className="p-5 text-sm text-red-700">
                <p>{error}</p>
                <button
                  type="button"
                  onClick={() => void refresh()}
                  className="mt-3 font-bold text-petrol"
                >
                  Reintentar
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-sm font-bold text-petrol-dark">
                  No tienes notificaciones todavía.
                </p>
                <p className="mt-1 text-xs text-muted">
                  Cuando tengas novedades importantes, aparecerán aquí.
                </p>
              </div>
            ) : (
              items.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => void openNotification(item)}
                  className={`block w-full border-b border-border px-4 py-3 text-left transition hover:bg-bg ${
                    item.readAt ? "bg-white" : "bg-orange/5"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        item.readAt ? "bg-border" : "bg-orange"
                      }`}
                      aria-hidden="true"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-petrol-dark">
                        {item.title}
                      </span>
                      {item.body && (
                        <span className="mt-1 block text-xs leading-5 text-muted">
                          {item.body}
                        </span>
                      )}
                      <time className="mt-1 block text-[11px] text-muted">
                        {dateLabel(item.createdAt)}
                      </time>
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function BellIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </svg>
  )
}
