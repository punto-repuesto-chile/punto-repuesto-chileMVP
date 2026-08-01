import { useRef, useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"

type RegisterErrors = {
  fullName?: string
  email?: string
  password?: string
  confirmPassword?: string
  terms?: string
}

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-petrol-dark outline-none transition focus:border-orange focus:ring-2 focus:ring-orange/20"

export default function RegisterForm() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [errors, setErrors] = useState<RegisterErrors>({})
  const [message, setMessage] = useState<{
    type: "error" | "success"
    text: string
  } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fullNameRef = useRef<HTMLInputElement>(null)

  const validate = () => {
    const nextErrors: RegisterErrors = {}
    if (!fullName.trim())
      nextErrors.fullName = "El nombre completo es obligatorio."
    if (!email.trim())
      nextErrors.email = "El correo electrónico es obligatorio."
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      nextErrors.email = "Ingresa un correo electrónico válido."
    if (password.length < 8)
      nextErrors.password = "La contraseña debe tener al menos 8 caracteres."
    if (confirmPassword !== password)
      nextErrors.confirmPassword = "Las contraseñas no coinciden."
    if (!acceptTerms)
      nextErrors.terms = "Debes aceptar los términos y condiciones."
    return nextErrors
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const nextErrors = validate()
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      setMessage({ type: "error", text: "Revisa los campos indicados." })
      const firstField = Object.keys(nextErrors)[0]
      if (firstField === "fullName") fullNameRef.current?.focus()
      else document.getElementById(firstField)?.focus()
      return
    }

    setErrors({})
    setMessage(null)
    setIsSubmitting(true)
    const { error, session } = await signUp({
      fullName: fullName.trim(),
      email: email.trim(),
      password,
    })
    setIsSubmitting(false)

    if (error) {
      setMessage({
        type: "error",
        text: "No fue posible crear la cuenta. Revisa los datos e inténtalo nuevamente.",
      })
      return
    }
    if (session) {
      navigate("/", { replace: true })
      return
    }
    setMessage({
      type: "success",
      text: "Cuenta creada. Revisa tu bandeja de entrada y confirma tu correo para iniciar sesión.",
    })
  }

  return (
    <form noValidate onSubmit={submit} className="space-y-4">
      {message && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-xl border p-4 text-sm font-medium ${
            message.type === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {message.type === "error" ? "Atención: " : "Listo: "}
          {message.text}
        </div>
      )}
      <label
        className="block text-sm font-semibold text-petrol-dark"
        htmlFor="fullName"
      >
        Nombre completo
        <input
          ref={fullNameRef}
          id="fullName"
          value={fullName}
          onChange={(event) => {
            setFullName(event.target.value)
            setErrors((current) => ({ ...current, fullName: undefined }))
          }}
          autoComplete="name"
          className={fieldClass}
          aria-invalid={Boolean(errors.fullName)}
          aria-describedby={errors.fullName ? "fullName-error" : undefined}
        />
        {errors.fullName && (
          <span
            id="fullName-error"
            className="mt-1.5 block text-xs text-red-600"
          >
            {errors.fullName}
          </span>
        )}
      </label>
      <label
        className="block text-sm font-semibold text-petrol-dark"
        htmlFor="email"
      >
        Correo electrónico
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
            setErrors((current) => ({ ...current, email: undefined }))
          }}
          autoComplete="email"
          placeholder="nombre@correo.cl"
          className={fieldClass}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
        />
        {errors.email && (
          <span id="email-error" className="mt-1.5 block text-xs text-red-600">
            {errors.email}
          </span>
        )}
      </label>
      <label
        className="block text-sm font-semibold text-petrol-dark"
        htmlFor="password"
      >
        Contraseña
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value)
            setErrors((current) => ({ ...current, password: undefined }))
          }}
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          className={fieldClass}
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? "password-error" : undefined}
        />
        {errors.password && (
          <span
            id="password-error"
            className="mt-1.5 block text-xs text-red-600"
          >
            {errors.password}
          </span>
        )}
      </label>
      <label
        className="block text-sm font-semibold text-petrol-dark"
        htmlFor="confirmPassword"
      >
        Confirmar contraseña
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(event) => {
            setConfirmPassword(event.target.value)
            setErrors((current) => ({ ...current, confirmPassword: undefined }))
          }}
          autoComplete="new-password"
          className={fieldClass}
          aria-invalid={Boolean(errors.confirmPassword)}
          aria-describedby={
            errors.confirmPassword ? "confirmPassword-error" : undefined
          }
        />
        {errors.confirmPassword && (
          <span
            id="confirmPassword-error"
            className="mt-1.5 block text-xs text-red-600"
          >
            {errors.confirmPassword}
          </span>
        )}
      </label>
      <div>
        <label className="flex cursor-pointer items-start gap-3 text-sm text-muted">
          <input
            id="terms"
            type="checkbox"
            checked={acceptTerms}
            onChange={(event) => {
              setAcceptTerms(event.target.checked)
              setErrors((current) => ({ ...current, terms: undefined }))
            }}
            className="mt-0.5 h-4 w-4 accent-orange"
          />
          Acepto los términos y condiciones de Punto Repuesto Chile.
        </label>
        {errors.terms && (
          <p className="mt-1.5 text-xs text-red-600">{errors.terms}</p>
        )}
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
        className="w-full rounded-xl bg-orange px-5 py-3.5 text-sm font-bold text-white transition hover:bg-orange-dark focus:outline-none focus:ring-2 focus:ring-orange/30 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
      </button>
      <p className="text-center text-sm text-muted">
        ¿Ya tienes una cuenta?{" "}
        <Link to="/login" className="font-bold text-petrol hover:text-orange">
          Iniciar sesión
        </Link>
      </p>
    </form>
  )
}
