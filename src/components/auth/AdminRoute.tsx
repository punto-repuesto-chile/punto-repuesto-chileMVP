import { useEffect, useState, type ReactNode } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { getMyModerationRole } from "../../services/moderationService"
import type { ModerationRole } from "../../types/moderation"

export default function AdminRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const location = useLocation()
  const [role, setRole] = useState<ModerationRole | null>(null)
  const [roleLoading, setRoleLoading] = useState(true)
  const [roleChecked, setRoleChecked] = useState(false)

  useEffect(() => {
    let active = true
    if (authLoading || !isAuthenticated) {
      setRoleLoading(false)
      setRoleChecked(false)
      setRole(null)
      return () => {
        active = false
      }
    }

    setRoleLoading(true)
    void getMyModerationRole()
      .then((nextRole) => {
        if (!active) return
        setRole(nextRole)
        setRoleChecked(true)
      })
      .catch(() => {
        if (!active) return
        setRole(null)
        setRoleChecked(true)
      })
      .finally(() => {
        if (active) setRoleLoading(false)
      })

    return () => {
      active = false
    }
  }, [authLoading, isAuthenticated])

  if (authLoading || roleLoading)
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-bg px-4">
        <p className="text-sm font-medium text-muted" aria-live="polite">
          Comprobando permisos…
        </p>
      </div>
    )

  if (!isAuthenticated)
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: `${location.pathname}${location.search}`,
          reason: "admin",
        }}
      />
    )

  if (roleChecked && !role)
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-bg px-4 py-16">
        <div className="w-full max-w-md rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-orange">
            403
          </p>
          <h1 className="mt-2 font-display text-2xl font-bold text-petrol-dark">
            Acceso restringido
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            No tienes permisos para acceder al área de moderación.
          </p>
          <a
            href="/"
            className="mt-6 inline-flex rounded-xl bg-petrol px-5 py-3 text-sm font-bold text-white transition hover:bg-petrol-dark focus:outline-none focus:ring-2 focus:ring-orange focus:ring-offset-2"
          >
            Volver al inicio
          </a>
        </div>
      </div>
    )

  return children
}
