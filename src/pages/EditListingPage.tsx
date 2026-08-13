import { useEffect, useRef, useState, type FormEvent } from "react"

import { Link, useNavigate, useParams } from "react-router-dom"

import PublicationFormFields from "../components/publish/PublicationFormFields"

import PublicationIdentitySelector from "../components/publish/PublicationIdentitySelector"

import PublishHeader from "../components/publish/PublishHeader"

import {
  getOwnedListingById,
  ListingPublicationError,
  updateOwnedListing,
  type OwnedListingForEdit,
} from "../services/listingService"

import { getMySalvageYard } from "../services/salvageYardService"

import type { SalvageYard } from "../types/salvageYard"

import type {
  EditableProductImage,
  PublicationErrors,
  PublicationField,
  PublicationFormData,
  SetPublicationField,
} from "../types/publication"

import {
  ACCEPTED_IMAGE_TYPES,
  MAX_PUBLICATION_IMAGES,
  validatePublication,
} from "../utils/publicationForm"

export default function EditListingPage() {
  const { id = "" } = useParams()

  const navigate = useNavigate()

  const [original, setOriginal] = useState<OwnedListingForEdit | null>(null)

  const [data, setData] = useState<PublicationFormData | null>(null)

  const [images, setImages] = useState<EditableProductImage[]>([])

  const imagesRef = useRef<EditableProductImage[]>([])

  const submissionLockRef = useRef(false)

  const redirectTimerRef = useRef<number | null>(null)

  const [errors, setErrors] = useState<PublicationErrors>({})

  const [isLoading, setIsLoading] = useState(true)

  const [isSubmitting, setIsSubmitting] = useState(false)

  const [salvageYard, setSalvageYard] = useState<SalvageYard | null>(null)

  const [selectedSalvageYardId, setSelectedSalvageYardId] =
    useState<string | null>(null)

  const [isIdentityLoading, setIsIdentityLoading] = useState(true)

  const [hasAccess, setHasAccess] = useState(true)

  const [notice, setNotice] = useState<{
    type: "success" | "error"

    message: string
  } | null>(null)

  useEffect(() => {
    let active = true

    void getOwnedListingById(id)

      .then((listing) => {
        if (!active) return

        if (!listing) {
          setHasAccess(false)

          return
        }

        setOriginal(listing)

        setSelectedSalvageYardId(listing.salvageYardId)

        setData(listing.formData)

        setImages(listing.images)
      })

      .catch(() => {
        if (active) setHasAccess(false)
      })

      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [id])

  useEffect(() => {
    let active = true

    void getMySalvageYard()
      .then((yard) => {
        if (active) setSalvageYard(yard)
      })
      .catch(() => {
        if (active)
          setNotice({
            type: "error",
            message:
              "No pudimos cargar tu identidad comercial. Puedes guardar como particular.",
          })
      })
      .finally(() => {
        if (active) setIsIdentityLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    imagesRef.current = images
  }, [images])

  useEffect(
    () => () => {
      imagesRef.current.forEach((image) => {
        if (image.kind === "new") URL.revokeObjectURL(image.previewUrl)
      })

      if (redirectTimerRef.current !== null)
        window.clearTimeout(redirectTimerRef.current)
    },

    [],
  )

  const setField: SetPublicationField = (field, value) => {
    setData((current) => (current ? { ...current, [field]: value } : current))

    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const addFiles = (files: File[]) => {
    const validFiles = files.filter((file) =>
      ACCEPTED_IMAGE_TYPES.includes(file.type),
    )

    setImages((current) => {
      const available = Math.max(0, MAX_PUBLICATION_IMAGES - current.length)

      const additions = validFiles.slice(0, available).map((file, index) => ({
        kind: "new" as const,

        id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,

        file,

        previewUrl: URL.createObjectURL(file),

        isPrimary: current.length === 0 && index === 0,
      }))

      return [...current, ...additions]
    })

    setErrors((current) => ({ ...current, images: undefined }))

    if (validFiles.length !== files.length)
      setNotice({
        type: "error",

        message:
          "Algunos archivos fueron omitidos. Usa solamente PNG, JPG, JPEG o WebP.",
      })
  }

  const removeImage = (imageId: string) => {
    setImages((current) => {
      const removed = current.find((image) => image.id === imageId)

      if (removed?.kind === "new") URL.revokeObjectURL(removed.previewUrl)

      const remaining = current.filter((image) => image.id !== imageId)

      if (removed?.isPrimary && remaining[0])
        remaining[0] = { ...remaining[0], isPrimary: true }

      return remaining
    })
  }

  const focusFirstError = (fields: PublicationField[]) => {
    requestAnimationFrame(() =>
      document

        .getElementById(fields[0])

        ?.scrollIntoView({ behavior: "smooth", block: "center" }),
    )
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()

    if (!data || !original || submissionLockRef.current) return

    const nextErrors = validatePublication(data, images)

    const invalidFields = Object.keys(nextErrors) as PublicationField[]

    if (invalidFields.length > 0) {
      setErrors(nextErrors)

      setNotice({
        type: "error",

        message: "Revisa los campos destacados antes de guardar.",
      })

      focusFirstError(invalidFields)

      return
    }

    submissionLockRef.current = true

    setIsSubmitting(true)

    setErrors({})

    setNotice(null)

    try {
      await updateOwnedListing(
        id,
        data,
        images,
        original,
        selectedSalvageYardId,
      )

      setNotice({
        type: "success",

        message: "Los cambios se guardaron correctamente.",
      })

      window.scrollTo({ top: 0, behavior: "smooth" })

      redirectTimerRef.current = window.setTimeout(
        () => navigate(`/publicacion/${id}`, { replace: true }),

        700,
      )
    } catch (error) {
      setNotice({
        type: "error",

        message:
          error instanceof ListingPublicationError
            ? error.message
            : "No pudimos guardar los cambios. Inténtalo nuevamente.",
      })
    } finally {
      submissionLockRef.current = false

      setIsSubmitting(false)
    }
  }

  if (isLoading)
    return (
      <div className="min-h-screen bg-bg text-petrol-dark">
        <PublishHeader label="Editando" />
        <main className="mx-auto max-w-5xl animate-pulse px-4 py-12 sm:px-6">
          <div className="h-8 w-64 rounded bg-slate-200" />
          <div className="mt-8 h-72 rounded-2xl bg-slate-200" />
        </main>
      </div>
    )

  if (!hasAccess || !data || !original)
    return (
      <div className="min-h-screen bg-bg text-petrol-dark">
        <PublishHeader label="Editando" />
        <main className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
          <h1 className="font-display text-3xl font-extrabold">
            No tienes acceso a esta publicación.
          </h1>
          <p className="mt-3 text-muted">
            La publicación no existe o pertenece a otra cuenta.
          </p>
          <Link
            to="/mis-publicaciones"
            className="mt-7 inline-flex rounded-xl bg-petrol px-5 py-3 text-sm font-bold text-white"
          >
            Volver a mis publicaciones
          </Link>
        </main>
      </div>
    )

  return (
    <div className="min-h-screen bg-bg text-petrol-dark">
      <PublishHeader label="Editando" />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-wider text-orange">
            Gestión de publicación
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">
            Editar publicación
          </h1>
          <p className="mt-3 text-muted">
            Actualiza la información de tu publicación.
          </p>
        </div>

        {notice && (
          <div
            role="status"
            aria-live="polite"
            className={`mb-6 rounded-xl border p-4 text-sm font-medium ${
              notice.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {notice.message}
          </div>
        )}

        <form noValidate onSubmit={submit} className="space-y-6">
          <PublicationIdentitySelector
            salvageYard={salvageYard}
            selectedSalvageYardId={selectedSalvageYardId}
            isLoading={isIdentityLoading}
            onChange={setSelectedSalvageYardId}
          />
          <PublicationFormFields
            data={data}
            images={images}
            errors={errors}
            setField={setField}
            addFiles={addFiles}
            removeImage={removeImage}
            setPrimary={(imageId) =>
              setImages((current) =>
                current.map((image) => ({
                  ...image,

                  isPrimary: image.id === imageId,
                })),
              )
            }
            disableEmail
          />
          <div className="flex flex-col-reverse gap-3 rounded-2xl border border-border bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <Link
              to={`/publicacion/${id}`}
              className="rounded-xl px-4 py-3 text-center text-sm font-semibold text-muted hover:bg-bg"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-orange px-7 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
