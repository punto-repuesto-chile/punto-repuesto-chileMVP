import { useState } from "react"
import { Link } from "react-router-dom"
import NewPasswordForm from "../components/auth/NewPasswordForm"
import { useAuth } from "../context/AuthContext"
import { supabase } from "../lib/supabase"

export default function UpdatePasswordPage() {
  const { authEvent, isLoading } = useAuth()
  const [updated, setUpdated] = useState(false)
  if (isLoading)
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg">
        <p>Validando enlace…</p>
      </main>
    )
  const recovery = authEvent === "PASSWORD_RECOVERY"
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-bold uppercase tracking-wider text-orange">
          Seguridad de cuenta
        </p>
        {updated ? (
          <>
            <h1 className="mt-2 text-3xl font-extrabold">
              Contraseña actualizada
            </h1>
            <Link
              to="/login"
              className="mt-6 block rounded-xl bg-petrol px-5 py-3 text-center font-bold text-white"
            >
              Ir a iniciar sesión
            </Link>
          </>
        ) : recovery ? (
          <>
            <h1 className="mt-2 text-3xl font-extrabold">
              Crea una nueva contraseña
            </h1>
            <NewPasswordForm
              onSuccess={async () => {
                await supabase.auth.signOut()
                setUpdated(true)
              }}
            />
          </>
        ) : (
          <>
            <h1 className="mt-2 text-3xl font-extrabold">
              Este enlace de recuperación ya no es válido
            </h1>
            <Link
              to="/recuperar-password"
              className="mt-6 block rounded-xl bg-orange px-5 py-3 text-center font-bold text-white"
            >
              Solicitar un nuevo enlace
            </Link>
          </>
        )}
      </div>
    </main>
  )
}
