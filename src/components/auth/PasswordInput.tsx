import { useState, type KeyboardEvent } from "react"

type Props = {
  value: string
  error?: string
  onChange: (value: string) => void
}

const baseClass =
  "w-full rounded-xl border bg-white px-4 py-3 pr-14 text-sm text-petrol-dark outline-none transition focus:ring-2"

export default function PasswordInput({ value, error, onChange }: Props) {
  const [isVisible, setIsVisible] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const updateCapsLock = (event: KeyboardEvent<HTMLInputElement>) =>
    setCapsLock(event.getModifierState("CapsLock"))

  return (
    <div>
      <label
        htmlFor="password"
        className="text-sm font-semibold text-petrol-dark"
      >
        Contraseña
      </label>
      <div className="relative mt-1.5">
        <input
          id="password"
          type={isVisible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={updateCapsLock}
          onKeyUp={updateCapsLock}
          onBlur={() => setCapsLock(false)}
          placeholder="Ingresa tu contraseña"
          autoComplete="current-password"
          aria-invalid={Boolean(error)}
          aria-describedby={
            error
              ? "password-error"
              : capsLock
                ? "caps-lock-message"
                : undefined
          }
          className={`${baseClass} ${
            error
              ? "border-red-400 focus:border-red-500 focus:ring-red-100"
              : "border-border focus:border-orange focus:ring-orange/20"
          }`}
        />
        <button
          type="button"
          onClick={() => setIsVisible((current) => !current)}
          aria-label={isVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-2 text-xs font-bold text-petrol hover:bg-bg focus:outline-none focus:ring-2 focus:ring-orange/30"
        >
          {isVisible ? "Ocultar" : "Mostrar"}
        </button>
      </div>
      {capsLock && !error && (
        <p
          id="caps-lock-message"
          className="mt-1.5 text-xs font-medium text-amber-700"
        >
          Bloq Mayús está activado.
        </p>
      )}
      {error && (
        <p
          id="password-error"
          className="mt-1.5 text-xs font-medium text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  )
}
