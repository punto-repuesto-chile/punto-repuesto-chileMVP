import { useState, type FormEvent } from "react"

import { Link } from "react-router-dom"

import { supabase } from "../lib/supabase"

const NEUTRAL_MESSAGE =
  "Si existe una cuenta asociada a ese correo, recibirás un enlace para recuperar tu contraseña."

export default function RecoverPasswordPage() {
  const [email, setEmail] = useState("")

  const [emailError, setEmailError] = useState<string | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)

  const [wasSent, setWasSent] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()

    if (isSubmitting || wasSent) return

    const trimmedEmail = email.trim()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError("Ingresa un correo electrónico válido.")

      return
    }

    setEmailError(null)

    setIsSubmitting(true)

    await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: `${window.location.origin}/actualizar-password`,
    })

    setIsSubmitting(false)

    setWasSent(true)
  }
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8">
        <Link to="/login" className="text-sm font-semibold text-petrol">
          Volver a iniciar sesión
        </Link>
        <p className="mt-8 text-xs font-bold uppercase tracking-wider text-orange">
          Seguridad de cuenta
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-petrol-dark">
          Recupera tu contraseña
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Te enviaremos las instrucciones para crear una nueva contraseña.
        </p>
        {wasSent ? (
          <div
            role="status"
            className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800"
          >
            {NEUTRAL_MESSAGE}
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="recovery-email"
                className="text-sm font-semibold text-petrol-dark"
              >
                Correo electrónico
              </label>
              <input
                id="recovery-email"
                type="email"
                value={email}
                autoComplete="email"
                onChange={(event) => {
                  setEmail(event.target.value)

                  setEmailError(null)
                }}
                aria-invalid={Boolean(emailError)}
                aria-describedby={
                  emailError ? "recovery-email-error" : undefined
                }
                className="mt-2 w-full rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-orange focus:ring-2 focus:ring-orange/20"
              />
              {emailError && (
                <p
                  id="recovery-email-error"
                  className="mt-2 text-xs font-medium text-red-600"
                >
                  {emailError}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className="w-full cursor-pointer rounded-xl bg-orange px-5 py-3.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Enviando…" : "Enviar enlace de recuperación"}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
