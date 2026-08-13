import { useState } from "react"
import { Link } from "react-router-dom"
import NewPasswordForm from "../components/auth/NewPasswordForm"
import { useAuth } from "../context/AuthContext"
import { supabase } from "../lib/supabase"

export default function UpdatePasswordPage() {
  const { authEvent, isLoading } = useAuth()
  const [wasUpdated, setWasUpdated] = useState(false)

  if (isLoading)
    return (
      <main
        className="flex min-h-screen items-center justify-center bg-bg"
        aria-busy="true"
      >
        <p className="text-sm font-medium text-muted">Validando enlace…</p>
      </main>
    )

  const isRecovery = authEvent === "PASSWORD_RECOVERY"
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-bold uppercase tracking-wider text-orange">
          Seguridad de cuenta
        </p>
{wasUpdated ? (
          <>
            <h1 className="mt-2 font-display text-3xl font-extrabold text-petrol-dark">
              Contraseña actualizada
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted">
              Ya puedes usar tu nueva contraseña para acceder a tu cuenta.
            </p>
            <Link
              to="/login"
              replace
              className="mt-6 block w-full rounded-xl bg-petrol px-5 py-3.5 text-center text-sm font-bold text-white"
            >
              Ir a iniciar sesión
            </Link>
          </>
        ) : isRecovery ? (
          <>
            <h1 className="mt-2 font-display text-3xl font-extrabold text-petrol-dark">
              Crea una nueva contraseña
            </h1>
            <p className="mb-6 mt-3 text-sm leading-6 text-muted">
              Debe tener al menos 8 caracteres.
            </p>
            <NewPasswordForm
              onSuccess={async () => {
                await supabase.auth.signOut()
                setWasUpdated(true)
              }}
            />
          </>
        ) : (
          <>
            <h1 className="mt-2 font-display text-3xl font-extrabold text-petrol-dark">
              Este enlace de recuperación ya no es válido
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted">
              El enlace puede haber expirado o haber sido utilizado
              anteriormente.
            </p>
            <Link
              to="/recuperar-password"
              className="mt-6 block w-full rounded-xl bg-orange px-5 py-3.5 text-center text-sm font-bold text-white"
            >
              Solicitar un nuevo enlace
            </Link>
          </>
        )}
      </div>
    </main>
  )
}
