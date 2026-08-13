import { useState, type FormEvent } from "react"
import { supabase } from "../../lib/supabase"
import { validateNewPassword, type PasswordErrors } from "../../utils/password"

export default function NewPasswordForm({
  submitLabel = "Actualizar contraseña",
  onSuccess,
}: {
  submitLabel?: string
  onSuccess?: () => void | Promise<void>
}) {
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [errors, setErrors] = useState<PasswordErrors>({})
  const [message, setMessage] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (isSubmitting) return
    const next = validateNewPassword(password, confirmation)
    if (Object.keys(next).length) {
      setErrors(next)
      setMessage({ type: "error", text: "Revisa los campos indicados." })
      return
    }
    setIsSubmitting(true)
    setErrors({})
    setMessage(null)
    const { error } = await supabase.auth.updateUser({ password })
    setIsSubmitting(false)
    if (error) {
      setMessage({
        type: "error",
        text: "No pudimos actualizar la contraseña. Intenta nuevamente.",
      })
      return
    }
    setPassword("")
    setConfirmation("")
    setMessage({ type: "success", text: "Tu contraseña fue actualizada." })
    await onSuccess?.()
  }
  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div>
        <label htmlFor="new-password" className="text-sm font-semibold">
          Nueva contraseña
        </label>
        <input
          id="new-password"
          type="password"
          value={password}
          autoComplete="new-password"
          onChange={(e) => {
            setPassword(e.target.value)
            setErrors((c) => ({ ...c, password: undefined }))
          }}
          className="mt-2 w-full rounded-xl border border-border px-4 py-3 text-sm"
          aria-invalid={Boolean(errors.password)}
        />
        {errors.password && (
          <p className="mt-2 text-xs text-red-600">{errors.password}</p>
        )}
      </div>
      <div>
        <label htmlFor="confirm-password" className="text-sm font-semibold">
          Confirmar nueva contraseña
        </label>
        <input
          id="confirm-password"
          type="password"
          value={confirmation}
          autoComplete="new-password"
          onChange={(e) => {
            setConfirmation(e.target.value)
            setErrors((c) => ({ ...c, confirmation: undefined }))
          }}
          className="mt-2 w-full rounded-xl border border-border px-4 py-3 text-sm"
          aria-invalid={Boolean(errors.confirmation)}
        />
        {errors.confirmation && (
          <p className="mt-2 text-xs text-red-600">{errors.confirmation}</p>
        )}
      </div>
      {message && (
        <div
          role="status"
          className={`rounded-xl border p-4 text-sm ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-orange px-5 py-3.5 text-sm font-bold text-white disabled:opacity-60"
      >
        {isSubmitting ? "Actualizando…" : submitLabel}
      </button>
    </form>
  )
}
