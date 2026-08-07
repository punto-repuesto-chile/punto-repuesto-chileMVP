import { useEffect, useRef, useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import PublicationFormFields from "../components/publish/PublicationFormFields"
import PublishHeader from "../components/publish/PublishHeader"
import {
  createPublication,
  ListingPublicationError,
} from "../services/listingService"
import {
  INITIAL_PUBLICATION_DATA,
  type ProductImage,
  type PublicationErrors,
  type PublicationField,
  type PublicationFormData,
  type SetPublicationField,
} from "../types/publication"
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_PUBLICATION_IMAGES,
  validatePublication,
} from "../utils/publicationForm"

const DRAFT_KEY = "punto-repuesto-publication-draft"

export default function PublishProductPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<PublicationFormData>(
    INITIAL_PUBLICATION_DATA,
  )
  const [images, setImages] = useState<ProductImage[]>([])
  const imagesRef = useRef<ProductImage[]>([])
  const submissionLockRef = useRef(false)
  const [errors, setErrors] = useState<PublicationErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [notice, setNotice] = useState<{
    type: "draft" | "success" | "error"
    message: string
  } | null>(null)

  useEffect(() => {
    const draft = localStorage.getItem(DRAFT_KEY)
    if (!draft) return
    try {
      setData({
        ...INITIAL_PUBLICATION_DATA,
        ...JSON.parse(draft) as Partial<PublicationFormData>,
      })
      setNotice({
        type: "draft",
        message:
          "Recuperamos automáticamente tu borrador. Las imágenes deben seleccionarse nuevamente por seguridad.",
      })
    } catch {
      localStorage.removeItem(DRAFT_KEY)
    }
  }, [])

  useEffect(() => {
    imagesRef.current = images
  }, [images])

  useEffect(
    () => () =>
      imagesRef.current.forEach((image) =>
        URL.revokeObjectURL(image.previewUrl),
      ),
    [],
  )

  const setField: SetPublicationField = (field, value) => {
    setData((current) => ({ ...current, [field]: value }))
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

  const removeImage = (id: string) => {
    setImages((current) => {
      const removed = current.find((image) => image.id === id)
      if (removed) URL.revokeObjectURL(removed.previewUrl)
      const remaining = current.filter((image) => image.id !== id)
      if (removed?.isPrimary && remaining[0])
        remaining[0] = { ...remaining[0], isPrimary: true }
      return remaining
    })
  }

  const saveDraft = () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data))
    setNotice({
      type: "draft",
      message:
        "Borrador guardado en este navegador. Las imágenes no se guardan.",
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
    if (submissionLockRef.current) return
    const nextErrors = validatePublication(data, images)
    const invalidFields = Object.keys(nextErrors) as PublicationField[]
    if (invalidFields.length) {
      setErrors(nextErrors)
      setNotice({
        type: "error",
        message: "Revisa los campos destacados antes de publicar.",
      })
      focusFirstError(invalidFields)
      return
    }
    setErrors({})
    submissionLockRef.current = true
    setIsSubmitting(true)
    setNotice(null)
    try {
      const result = await createPublication(data, images)
      localStorage.removeItem(DRAFT_KEY)
      window.scrollTo({ top: 0, left: 0, behavior: "instant" })
      navigate(`/publicacion/${result.listingId}`, { replace: true })
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error instanceof ListingPublicationError
            ? error.message
            : "No pudimos crear la publicación. Inténtalo nuevamente.",
      })
    } finally {
      submissionLockRef.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg text-petrol-dark">
      <PublishHeader />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-wider text-orange">
            Nueva publicación
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">
            Publica tu repuesto
          </h1>
          <p className="mt-3 max-w-2xl text-muted">
            Completa la información para que compradores de todo Chile
            encuentren el producto correcto.
          </p>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-border">
            <div className="h-full w-full rounded-full bg-gradient-to-r from-petrol to-orange" />
          </div>
          <p className="mt-2 text-xs text-muted">
            Formulario único · Tus datos permanecen en este navegador hasta
            publicar
          </p>
        </div>

        {notice && (
          <div
            role="status"
            className={`mb-6 rounded-xl border p-4 text-sm font-medium ${
              notice.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : notice.type === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-blue-200 bg-blue-50 text-blue-800"
            }`}
          >
            {notice.message}
          </div>
        )}

        <form noValidate onSubmit={submit} className="space-y-6">
          <PublicationFormFields
            data={data}
            images={images}
            errors={errors}
            setField={setField}
            addFiles={addFiles}
            removeImage={removeImage}
            setPrimary={(id) =>
              setImages((current) =>
                current.map((image) => ({
                  ...image,
                  isPrimary: image.id === id,
                })),
              )
            }
          />
          <div className="flex flex-col-reverse gap-3 rounded-2xl border border-border bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <Link
                to="/"
                className="rounded-xl px-4 py-3 text-sm font-semibold text-muted hover:bg-bg"
              >
                Volver al inicio
              </Link>
              <button
                type="button"
                onClick={saveDraft}
                className="rounded-xl border border-petrol px-4 py-3 text-sm font-bold text-petrol hover:bg-petrol/5"
              >
                Guardar borrador
              </button>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-orange px-7 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Publicando..." : "Publicar producto"}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
