import type { ReactNode } from "react"

import { Navigate, useLocation } from "react-router-dom"

import { useAuth } from "../../context/AuthContext"

// This client-side guard improves UX only. Real authorization must be enforced by the backend.

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  const location = useLocation()

  if (isLoading)
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-bg"
        aria-busy="true"
        aria-live="polite"
      >
        <p className="text-sm font-medium text-muted">Comprobando sesión…</p>
      </div>
    )

  if (!isAuthenticated) {
    const reason = location.pathname.endsWith("/editar")
      ? "edit-listing"
      : location.pathname === "/mis-publicaciones"
        ? "my-listings"
        : "publish"

    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname, reason }}
      />
    )
  }

  return children
}
