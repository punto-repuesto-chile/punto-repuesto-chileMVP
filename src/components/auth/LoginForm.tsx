import { useRef, useState, type FormEvent } from "react"

import { Link, useLocation, useNavigate } from "react-router-dom"

import { useAuth } from "../../context/AuthContext"

import PasswordInput from "./PasswordInput"

type FormErrors = {
  email?: string

  password?: string
}

type LocationState = {
  from?: string

  reason?: "publish" | "my-listings" | "edit-listing" | "favorite"
}

export default function LoginForm() {
  const { signIn } = useAuth()

  const navigate = useNavigate()

  const location = useLocation()

  const state = location.state as LocationState | null

  const [email, setEmail] = useState("")

  const [password, setPassword] = useState("")

  const [errors, setErrors] = useState<FormErrors>({})

  const [message, setMessage] = useState<{
    type: "info" | "error" | "success"

    text: string
  } | null>(
    state?.reason
      ? {
          type: "info",

          text:
            state.reason === "favorite"
              ? "Inicia sesión para guardar y revisar tus publicaciones favoritas. Después volverás automáticamente."
              : state.reason === "edit-listing"
                ? "Inicia sesión para editar esta publicación. Después volverás automáticamente al formulario."
                : state.reason === "my-listings"
                  ? "Inicia sesión para revisar tus publicaciones. Después volverás automáticamente a esa página."
                  : "Inicia sesión para publicar un producto. Después volverás automáticamente al formulario.",
        }
      : null,
  )

  const [isSubmitting, setIsSubmitting] = useState(false)

  const emailRef = useRef<HTMLInputElement>(null)

  const validate = () => {
    const nextErrors: FormErrors = {}

    if (!email.trim())
      nextErrors.email = "El correo electrónico es obligatorio."
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      nextErrors.email = "Ingresa un correo electrónico válido."

    if (!password) nextErrors.password = "La contraseña es obligatoria."

    return nextErrors
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()

    const nextErrors = validate()

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)

      setMessage({ type: "error", text: "Revisa los campos indicados." })

      if (nextErrors.email) emailRef.current?.focus()
      else document.getElementById("password")?.focus()

      return
    }

    setErrors({})

    setMessage(null)

    setIsSubmitting(true)

    const { error } = await signIn({ email: email.trim(), password })

    setIsSubmitting(false)

    if (error) {
      setMessage({
        type: "error",

        text: "El correo o la contraseña no son correctos.",
      })

      return
    }

    setMessage({
      type: "success",

      text: "Inicio de sesión correcto. Redirigiendo…",
    })

    const destination = state?.from?.startsWith("/") ? state.from : "/"

    navigate(destination, { replace: true })
  }

  return (
    <form noValidate onSubmit={submit} className="space-y-5">
      {message && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-xl border p-4 text-sm font-medium ${
            message.type === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : message.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-blue-200 bg-blue-50 text-blue-800"
          }`}
        >
          {message.type === "error"
            ? "Atención: "
            : message.type === "success"
              ? "Listo: "
              : "Información: "}
          {message.text}
        </div>
      )}
      <div>
        <label
          htmlFor="email"
          className="text-sm font-semibold text-petrol-dark"
        >
          Correo electrónico
        </label>
        <input
          ref={emailRef}
          id="email"
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)

            setErrors((current) => ({ ...current, email: undefined }))
          }}
          placeholder="nombre@correo.cl"
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
          className={`mt-1.5 w-full rounded-xl border bg-white px-4 py-3 text-sm text-petrol-dark outline-none transition focus:ring-2 ${
            errors.email
              ? "border-red-400 focus:border-red-500 focus:ring-red-100"
              : "border-border focus:border-orange focus:ring-orange/20"
          }`}
        />
        {errors.email && (
          <p
            id="email-error"
            className="mt-1.5 text-xs font-medium text-red-600"
          >
            {errors.email}
          </p>
        )}
      </div>
      <PasswordInput
        value={password}
        error={errors.password}
        onChange={(value) => {
          setPassword(value)

          setErrors((current) => ({ ...current, password: undefined }))
        }}
      />
      <div className="flex justify-end text-sm">
        <button
          type="button"
          onClick={() =>
            setMessage({
              type: "info",

              text: "La recuperación de contraseña estará disponible próximamente.",
            })
          }
          className="font-semibold text-petrol hover:text-orange"
        >
          ¿Olvidaste tu contraseña?
        </button>
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
        className="w-full rounded-xl bg-orange px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-dark focus:outline-none focus:ring-2 focus:ring-orange/30 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Ingresando..." : "Iniciar sesión"}
      </button>
      <p className="text-center text-sm text-muted">
        ¿No tienes una cuenta?{" "}
        <Link
          to="/registro"
          className="font-bold text-petrol hover:text-orange"
        >
          Crear cuenta
        </Link>
      </p>
    </form>
  )
}
