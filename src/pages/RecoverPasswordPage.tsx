import { useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../lib/supabase"

export default function RecoverPasswordPage() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const value = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError("Ingresa un correo electrónico válido.")
      return
    }
    setError(null)
    await supabase.auth.resetPasswordForEmail(value, {
      redirectTo: `${window.location.origin}/actualizar-password`,
    })
    setSent(true)
  }
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8">
        <Link to="/login" className="text-sm font-semibold text-petrol">
          ← Volver a iniciar sesión
        </Link>
        <p className="mt-8 text-xs font-bold uppercase tracking-wider text-orange">
          Seguridad de cuenta
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold">
          Recupera tu contraseña
        </h1>
        <p className="mt-3 text-sm text-muted">
          Te enviaremos las instrucciones para crear una nueva contraseña.
        </p>
        {sent ? (
          <div
            role="status"
            className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            Si existe una cuenta asociada a ese correo, recibirás un enlace para
            recuperar tu contraseña.
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-5">
            <label htmlFor="recovery-email" className="text-sm font-semibold">
              Correo electrónico
            </label>
            <input
              id="recovery-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-xl border border-border px-4 py-3 text-sm"
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button className="w-full rounded-xl bg-orange px-5 py-3.5 text-sm font-bold text-white">
              Enviar enlace de recuperación
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
