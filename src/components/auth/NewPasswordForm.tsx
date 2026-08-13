import { useState, type FormEvent } from "react"
import { supabase } from "../../lib/supabase"
import { validateNewPassword, type PasswordErrors } from "../../utils/password"

type Props = {
  submitLabel?: string
  onSuccess?: () => void | Promise<void>
}

export default function NewPasswordForm({
  submitLabel = "Actualizar contraseña",
  onSuccess,
}: Props) {
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [errors, setErrors] = useState<PasswordErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)
const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (isSubmitting) return
    const nextErrors = validateNewPassword(password, confirmation)
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      setMessage({ type: "error", text: "Revisa los campos indicados." })
      return
    }
    setErrors({})
    setMessage(null)
    setIsSubmitting(true)
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
          onChange={(event) => {
            setPassword(event.target.value)
            setErrors((current) => ({ ...current, password: undefined }))
          }}
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? "new-password-error" : undefined}
          className="mt-2 w-full rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-orange focus:ring-2 focus:ring-orange/20"
        />
        {errors.password && (
          <p
            id="new-password-error"
            className="mt-2 text-xs font-medium text-red-600"
          >
            {errors.password}
          </p>
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
          onChange={(event) => {
            setConfirmation(event.target.value)
            setErrors((current) => ({ ...current, confirmation: undefined }))
          }}
          aria-invalid={Boolean(errors.confirmation)}
          aria-describedby={
            errors.confirmation ? "confirm-password-error" : undefined
          }
          className="mt-2 w-full rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-orange focus:ring-2 focus:ring-orange/20"
        />
        {errors.confirmation && (
          <p
            id="confirm-password-error"
            className="mt-2 text-xs font-medium text-red-600"
          >
            {errors.confirmation}
          </p>
        )}
      </div>
      {message && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-xl border p-4 text-sm font-medium ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
          }`}
        >
          {message.text}
        </div>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
        className="w-full cursor-pointer rounded-xl bg-orange px-5 py-3.5 text-sm font-bold text-white hover:bg-orange-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Actualizando…" : submitLabel}
      </button>
    </form>
  )
}
