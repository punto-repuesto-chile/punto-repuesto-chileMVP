import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { CHILE_LOCATIONS } from "../../data/publicationOptions"
import {
  createSalvageYard,
  deleteSalvageYardLogo,
  updateMySalvageYard,
  uploadSalvageYardLogo,
  validateSalvageYardLogo,
} from "../../services/salvageYardService"
import type { SalvageYard } from "../../types/salvageYard"

type Props = {
  yard: SalvageYard | null
  onSaved: (yard: SalvageYard) => void
}
type FormState = {
  businessName: string
  description: string
  region: string
  commune: string
  publicAddress: string
  phone: string
  whatsapp: string
  openingHours: string
}
type FormErrors = Partial<Record<keyof FormState | "logo" | "contact", string>>

const emptyForm: FormState = {
  businessName: "",
  description: "",
  region: "",
  commune: "",
  publicAddress: "",
  phone: "",
  whatsapp: "",
  openingHours: "",
}

function fromYard(yard: SalvageYard | null): FormState {
  if (!yard) return emptyForm
  return {
    businessName: yard.businessName,
    description: yard.description ?? "",
    region: yard.region,
    commune: yard.commune,
    publicAddress: yard.publicAddress ?? "",
    phone: yard.phone ?? "",
    whatsapp: yard.whatsapp ?? "",
    openingHours: yard.openingHours ?? "",
  }
}

export default function SalvageYardForm({ yard, onSaved }: Props) {
  const [form, setForm] = useState(() => fromYard(yard))
  const [errors, setErrors] = useState<FormErrors>({})
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [removeLogo, setRemoveLogo] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info"
    text: string
  } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setForm(fromYard(yard))
    setLogoFile(null)
    setRemoveLogo(false)
  }, [yard])
  const communes = useMemo(
    () => CHILE_LOCATIONS[form.region] ?? [],
    [form.region],
  )
  const update = (key: keyof FormState, value: string) =>
    setForm((current) => ({ ...current, [key]: value }))

  const validate = (forActivation: boolean): FormErrors => {
    const next: FormErrors = {}
    const name = form.businessName.trim()
    if (name.length < 2 || name.length > 120)
      next.businessName = "Usa entre 2 y 120 caracteres."
    if (form.description.length > 2000)
      next.description = "La descripción no puede superar 2000 caracteres."
    if (!form.region) next.region = "Selecciona una región."
    if (!form.commune || !communes.includes(form.commune))
      next.commune = "Selecciona una comuna válida."
    if (forActivation && !form.phone.trim() && !form.whatsapp.trim())
      next.contact =
        "Agrega un teléfono o WhatsApp para activar la desarmaduría."
    if (logoFile) {
      const logoError = validateSalvageYardLogo(logoFile)
      if (logoError) next.logo = logoError
    }
    return next
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (isSaving) return
    const next = validate(false)
    if (Object.keys(next).length) {
      setErrors(next)
      setMessage({ type: "error", text: "Revisa los campos indicados." })
      return
    }
    setErrors({})
    setMessage(null)
    setIsSaving(true)
    try {
      let nextLogoPath = yard?.logoPath ?? null
      let uploadedPath: string | null = null
      let cleanupWarning = false
      if (logoFile && yard) {
        uploadedPath = await uploadSalvageYardLogo(yard.id, logoFile)
        nextLogoPath = uploadedPath
      }
      let saved = yard
        ? await updateMySalvageYard({
            ...form,
            logoPath: nextLogoPath,
            description: form.description || null,
          })
        : await createSalvageYard({
            ...form,
            description: form.description || null,
            status: "draft",
          })
      if (!yard && logoFile) {
        uploadedPath = await uploadSalvageYardLogo(saved.id, logoFile)
        saved = await updateMySalvageYard({ logoPath: uploadedPath })
      }
      if (
        yard?.logoPath &&
        (removeLogo || uploadedPath) &&
        yard.logoPath !== nextLogoPath
      ) {
        try {
          await deleteSalvageYardLogo(yard.logoPath)
        } catch {
          cleanupWarning = true
        }
      }
      if (removeLogo && !logoFile && yard) {
        const cleared = await updateMySalvageYard({ logoPath: null })
        try {
          if (yard.logoPath) await deleteSalvageYardLogo(yard.logoPath)
        } catch {
          cleanupWarning = true
        }
        onSaved(cleared)
      } else onSaved(saved)
      setLogoFile(null)
      setRemoveLogo(false)
      setMessage({
        type: cleanupWarning ? "info" : "success",
        text: cleanupWarning
          ? "Guardamos los cambios, pero no pudimos limpiar el logo anterior."
          : "Cambios guardados correctamente.",
      })
      if (fileRef.current) fileRef.current.value = ""
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

  const activate = async () => {
    if (!yard || yard.status !== "draft" || isSaving) return
    const next = validate(true)
    if (Object.keys(next).length) {
      setErrors(next)
      setMessage({
        type: "error",
        text: "Completa los requisitos antes de activar.",
      })
      return
    }
    setIsSaving(true)
    setMessage(null)
    try {
      const saved = await updateMySalvageYard({
        ...form,
        description: form.description || null,
        status: "active",
      })
      onSaved(saved)
      setMessage({ type: "success", text: "Tu desarmaduría está activa." })
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "No pudimos activar la desarmaduría.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const field = (
    key: keyof FormState,
    label: string,
    required = false,
    multiline = false,
  ) => (
    <div>
      <label htmlFor={`yard-${key}`} className="text-sm font-semibold">
        {label}
        {required ? " *" : ""}
      </label>
      {multiline ? (
        <textarea
          id={`yard-${key}`}
          value={form[key]}
          maxLength={2000}
          onChange={(e) => update(key, e.target.value)}
          rows={4}
          className="mt-2 w-full resize-y rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-orange focus:ring-2 focus:ring-orange/20"
        />
      ) : (
        <input
          id={`yard-${key}`}
          value={form[key]}
          onChange={(e) => update(key, e.target.value)}
          className="mt-2 w-full rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-orange focus:ring-2 focus:ring-orange/20"
        />
      )}
      {errors[key] && (
        <p className="mt-1 text-xs font-medium text-red-600">{errors[key]}</p>
      )}
    </div>
  )

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <section className="rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
        <h2 className="font-display text-xl font-bold">
          Información comercial
        </h2>
        <div className="mt-6 space-y-5">
          {field("businessName", "Nombre comercial", true)}
          {field("description", "Descripción", false, true)}
        </div>
      </section>
      <section className="rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
        <h2 className="font-display text-xl font-bold">Ubicación pública</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="yard-region" className="text-sm font-semibold">
              Región *
            </label>
            <select
              id="yard-region"
              value={form.region}
              onChange={(e) => {
                update("region", e.target.value)
                update("commune", "")
              }}
              className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm"
            >
              <option value="">Selecciona una región</option>
              {Object.keys(CHILE_LOCATIONS).map((region) => (
                <option key={region}>{region}</option>
              ))}
            </select>
            {errors.region && (
              <p className="mt-1 text-xs font-medium text-red-600">
                {errors.region}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="yard-commune" className="text-sm font-semibold">
              Comuna *
            </label>
            <select
              id="yard-commune"
              value={form.commune}
              disabled={!form.region}
              onChange={(e) => update("commune", e.target.value)}
              className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm disabled:bg-slate-100"
            >
              <option value="">Selecciona una comuna</option>
              {communes.map((commune) => (
                <option key={commune}>{commune}</option>
              ))}
            </select>
            {errors.commune && (
              <p className="mt-1 text-xs font-medium text-red-600">
                {errors.commune}
              </p>
            )}
          </div>
        </div>
        <div className="mt-5">
          {field("publicAddress", "Dirección pública")}
        </div>
      </section>
      <section className="rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
        <h2 className="font-display text-xl font-bold">Contacto y horario</h2>
        <p className="mt-2 text-sm text-muted">
          Para activar necesitarás teléfono o WhatsApp. Puedes completar esto
          después.
        </p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {field("phone", "Teléfono")}
          {field("whatsapp", "WhatsApp")}
        </div>
        <div className="mt-5">
          {field("openingHours", "Horario de atención")}
        </div>
        {errors.contact && (
          <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
            {errors.contact}
          </p>
        )}
      </section>
      <section className="rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
        <h2 className="font-display text-xl font-bold">Logo</h2>
        <div className="mt-5 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          {yard?.logoUrl && !removeLogo ? (
            <img
              src={yard.logoUrl}
              alt="Logo de la desarmaduría"
              className="h-20 w-20 rounded-2xl object-cover ring-4 ring-orange/10"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-petrol text-2xl font-extrabold text-white">
              D
            </div>
          )}
          <div>
            <label
              htmlFor="yard-logo"
              className="inline-flex cursor-pointer rounded-xl border border-petrol px-4 py-2.5 text-sm font-bold text-petrol"
            >
              {yard?.logoPath ? "Reemplazar logo" : "Subir logo"}
              <input
                ref={fileRef}
                id="yard-logo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null
                  setLogoFile(file)
                  setRemoveLogo(false)
                  setErrors((current) => ({
                    ...current,
                    logo: file
                      ? (validateSalvageYardLogo(file) ?? undefined)
                      : undefined,
                  }))
                }}
              />
            </label>
            {yard?.logoPath && (
              <button
                type="button"
                onClick={() => {
                  setLogoFile(null)
                  setRemoveLogo(true)
                }}
                className="ml-3 text-sm font-semibold text-red-600 hover:underline"
              >
                Eliminar
              </button>
            )}
            <p className="mt-2 text-xs text-muted">
              JPEG, PNG o WebP, máximo 2 MB.
            </p>
            {errors.logo && (
              <p className="mt-1 text-xs font-medium text-red-600">
                {errors.logo}
              </p>
            )}
          </div>
        </div>
      </section>
      {message && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-xl border p-4 text-sm font-medium ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : message.type === "info"
                ? "border-blue-200 bg-blue-50 text-blue-800"
                : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="submit"
          disabled={isSaving}
          aria-busy={isSaving}
          className="w-full cursor-pointer rounded-xl bg-orange px-5 py-3.5 text-sm font-bold text-white hover:bg-orange-dark disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {isSaving ? "Guardando…" : "Guardar cambios"}
        </button>
        {yard?.status === "draft" && (
          <button
            type="button"
            disabled={isSaving}
            onClick={activate}
            className="w-full cursor-pointer rounded-xl bg-petrol px-5 py-3.5 text-sm font-bold text-white hover:bg-petrol-dark disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            Activar desarmaduría
          </button>
        )}
      </div>
    </form>
  )
}
