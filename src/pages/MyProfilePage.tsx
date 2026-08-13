import { useEffect, useMemo, useState, type FormEvent } from "react"

import { Link } from "react-router-dom"

import SiteFooter from "../components/layout/SiteFooter"

import NewPasswordForm from "../components/auth/NewPasswordForm"

import { CHILE_LOCATIONS } from "../data/publicationOptions"

import {
  getMyPublicProfile,
  getProfileAvatarPublicUrl,
  PUBLIC_PROFILE_UPDATED_EVENT,
  saveMyPublicProfile,
  validateAvatarFile,
  type MyPublicProfile,
} from "../services/profileService"

type FormErrors = {
  displayName?: string

  avatar?: string
}

type StatusMessage = {
  type: "success" | "error"

  text: string
}

function initials(name: string): string {
  return (
    name

      .trim()

      .split(/\s+/)

      .slice(0, 2)

      .map((part) => part[0]?.toLocaleUpperCase("es-CL") ?? "")

      .join("") || "V"
  )
}

export default function MyProfilePage() {
  const [profile, setProfile] = useState<MyPublicProfile | null>(null)

  const [displayName, setDisplayName] = useState("")

  const [region, setRegion] = useState("")

  const [commune, setCommune] = useState("")

  const [avatarFile, setAvatarFile] = useState<File | null>(null)

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const [removeAvatar, setRemoveAvatar] = useState(false)

  const [errors, setErrors] = useState<FormErrors>({})

  const [isLoading, setIsLoading] = useState(true)

  const [isSaving, setIsSaving] = useState(false)

  const [message, setMessage] = useState<StatusMessage | null>(null)

  const [requestNumber, setRequestNumber] = useState(0)

  useEffect(() => {
    let active = true

    setIsLoading(true)

    setMessage(null)

    void getMyPublicProfile()

      .then((result) => {
        if (!active) return

        setProfile(result)

        setDisplayName(result.displayName)

        setRegion(result.region ?? "")

        setCommune(result.commune ?? "")

        setRemoveAvatar(false)

        setAvatarFile(null)
      })

      .catch((error: unknown) => {
        if (!active) return

        setMessage({
          type: "error",

          text:
            error instanceof Error
              ? error.message
              : "No pudimos cargar tu perfil.",
        })
      })

      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [requestNumber])

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(null)

      return
    }

    const url = URL.createObjectURL(avatarFile)

    setAvatarPreview(url)

    return () => URL.revokeObjectURL(url)
  }, [avatarFile])

  const communes = useMemo(() => CHILE_LOCATIONS[region] ?? [], [region])

  const avatarUrl =
    avatarPreview ??
    (!removeAvatar && profile?.avatarPath
      ? getProfileAvatarPublicUrl(profile.avatarPath)
      : null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()

    const nextErrors: FormErrors = {}

    const trimmedName = displayName.trim()

    if (trimmedName.length < 2 || trimmedName.length > 80)
      nextErrors.displayName =
        "El nombre visible debe tener entre 2 y 80 caracteres."

    if (avatarFile) {
      const avatarError = validateAvatarFile(avatarFile)

      if (avatarError) nextErrors.avatar = avatarError
    }

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)

      setMessage({ type: "error", text: "Revisa los campos indicados." })

      return
    }

    setErrors({})

    setMessage(null)

    setIsSaving(true)

    try {
      const saved = await saveMyPublicProfile({
        displayName: trimmedName,

        region: region || null,

        commune: commune || null,

        avatarFile,

        removeAvatar,

        currentAvatarPath: profile?.avatarPath ?? null,
      })

      setProfile(saved)

      window.dispatchEvent(
        new CustomEvent<MyPublicProfile>(PUBLIC_PROFILE_UPDATED_EVENT, {
          detail: saved,
        }),
      )

      setDisplayName(saved.displayName)

      setRegion(saved.region ?? "")

      setCommune(saved.commune ?? "")

      setAvatarFile(null)

      setRemoveAvatar(false)

      setMessage({
        type: "success",

        text: "Tu perfil público fue actualizado.",
      })
    } catch (error) {
      setMessage({
        type: "error",

        text:
          error instanceof Error
            ? error.message
            : "No pudimos guardar los cambios.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg text-petrol-dark">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-petrol text-xs font-bold text-white">
              PR
            </span>
            <span className="hidden font-display text-sm font-bold sm:block">
              Punto Repuesto <span className="text-orange">Chile</span>
            </span>
          </Link>
          <Link
            to="/"
            className="text-sm font-semibold text-petrol hover:text-orange"
          >
            Volver al inicio
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-wider text-orange">
            Tu cuenta
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold">
            Mi perfil
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Administra la información que verán los compradores en tu perfil
            público.
          </p>
        </div>

        {isLoading ? (
          <div
            aria-busy="true"
            className="animate-pulse rounded-3xl border border-border bg-white p-6 sm:p-8"
          >
            <div className="h-8 w-48 rounded bg-slate-200" />
            <div className="mt-8 h-12 rounded bg-slate-200" />
            <div className="mt-6 h-40 rounded bg-slate-200" />
          </div>
        ) : !profile ? (
          <div
            role="alert"
            className="rounded-3xl border border-red-200 bg-white p-8 text-center"
          >
            <p className="font-semibold">
              {message?.text ?? "No pudimos cargar tu perfil."}
            </p>
            <button
              type="button"
              onClick={() => setRequestNumber((value) => value + 1)}
              className="mt-5 rounded-xl bg-petrol px-5 py-3 text-sm font-bold text-white"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <>
            <form
              onSubmit={submit}
              noValidate
              className="grid gap-6 lg:grid-cols-[1fr_0.8fr]"
            >
              <div className="space-y-6">
                <section className="rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
                  <h2 className="font-display text-xl font-bold">
                    Perfil público
                  </h2>
                  <label
                    htmlFor="display-name"
                    className="mt-6 block text-sm font-semibold"
                  >
                    Nombre visible
                  </label>
                  <input
                    id="display-name"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    maxLength={80}
                    aria-invalid={Boolean(errors.displayName)}
                    className="mt-2 w-full rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-orange focus:ring-2 focus:ring-orange/20"
                  />
                  {errors.displayName && (
                    <p className="mt-2 text-xs font-medium text-red-600">
                      {errors.displayName}
                    </p>
                  )}
                </section>

                <section className="rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
                  <h2 className="font-display text-xl font-bold">
                    Ubicación pública
                  </h2>
                  <p className="mt-2 text-sm text-muted">
                    Es opcional. Si dejas estos campos vacíos, no se mostrará
                    una ubicación en tu perfil.
                  </p>
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="profile-region"
                        className="text-sm font-semibold"
                      >
                        Región
                      </label>
                      <select
                        id="profile-region"
                        value={region}
                        onChange={(event) => {
                          setRegion(event.target.value)

                          setCommune("")
                        }}
                        className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm"
                      >
                        <option value="">No mostrar</option>
                        {Object.keys(CHILE_LOCATIONS).map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="profile-commune"
                        className="text-sm font-semibold"
                      >
                        Comuna
                      </label>
                      <select
                        id="profile-commune"
                        value={commune}
                        disabled={!region}
                        onChange={(event) => setCommune(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm disabled:bg-slate-100"
                      >
                        <option value="">No mostrar</option>
                        {communes.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>
              </div>

              <div className="space-y-6">
                <section className="rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
                  <h2 className="font-display text-xl font-bold">
                    Avatar público
                  </h2>
                  <div className="mt-6 flex flex-col items-center text-center">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Vista previa del avatar"
                        className="h-28 w-28 rounded-full object-cover ring-4 ring-orange/15"
                      />
                    ) : (
                      <div className="flex h-28 w-28 items-center justify-center rounded-full bg-petrol font-display text-3xl font-extrabold text-white ring-4 ring-orange/15">
                        {initials(displayName)}
                      </div>
                    )}
                    <label className="mt-5 cursor-pointer rounded-xl border border-petrol px-4 py-2.5 text-sm font-bold text-petrol hover:bg-petrol/5">
                      Elegir imagen
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null

                          setAvatarFile(file)

                          setRemoveAvatar(false)

                          setErrors((current) => ({
                            ...current,

                            avatar: file
                              ? (validateAvatarFile(file) ?? undefined)
                              : undefined,
                          }))
                        }}
                      />
                    </label>
                    <p className="mt-3 text-xs leading-5 text-muted">
                      JPEG, PNG o WebP, máximo 2 MB. Al subirla aceptas que será
                      visible públicamente.
                    </p>
                    {errors.avatar && (
                      <p className="mt-2 text-xs font-medium text-red-600">
                        {errors.avatar}
                      </p>
                    )}
                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setAvatarFile(null)

                          setRemoveAvatar(true)
                        }}
                        className="mt-3 text-sm font-semibold text-red-600 hover:underline"
                      >
                        Eliminar avatar
                      </button>
                    )}
                  </div>
                </section>

                <aside className="rounded-2xl border border-orange/25 bg-orange/5 p-5 text-sm leading-6">
                  <h2 className="font-bold">Privacidad</h2>
                  <p className="mt-1">
                    Nombre visible, avatar y ubicación configurados aquí
                    aparecerán en tu perfil público. Tu email, sesión y datos
                    internos nunca se muestran.
                  </p>
                </aside>

                {message && (
                  <div
                    role="status"
                    className={`rounded-xl border p-4 text-sm font-medium ${
                      message.type === "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-red-200 bg-red-50 text-red-700"
                    }`}
                  >
                    {message.text}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full rounded-xl bg-orange px-5 py-3.5 text-sm font-bold text-white hover:bg-orange-dark disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Guardando…" : "Guardar cambios"}
                </button>
              </div>
            </form>
            <section className="mt-6 rounded-3xl border border-petrol/15 bg-petrol p-6 text-white shadow-sm sm:p-8">
              <p className="text-xs font-bold uppercase tracking-wider text-orange">
                Cuenta comercial
              </p>
              <h2 className="mt-2 font-display text-xl font-bold">
                ¿Administras una desarmaduría?
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
                Registra y administra la identidad comercial de tu negocio desde
                un espacio separado de tu perfil personal.
              </p>
              <Link
                to="/mi-desarmaduria"
                className="mt-5 inline-flex rounded-xl bg-orange px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-dark"
              >
                Mi desarmaduría
              </Link>
            </section>
            <section className="mt-6 rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
              <div className="max-w-xl">
                <p className="text-xs font-bold uppercase tracking-wider text-orange">
                  Seguridad
                </p>
                <h2 className="mt-2 font-display text-xl font-bold">
                  Cambiar contraseña
                </h2>
                <p className="mb-6 mt-2 text-sm leading-6 text-muted">
                  Usa una contraseña de al menos 8 caracteres que no reutilices
                  en otros sitios.
                </p>
                <NewPasswordForm submitLabel="Cambiar contraseña" />
              </div>
            </section>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}
