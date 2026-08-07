import { useEffect, useRef, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import BasicInformationSection from "../components/publish/BasicInformationSection"
import LocationDeliverySection from "../components/publish/LocationDeliverySection"
import ProductImagesSection from "../components/publish/ProductImagesSection"
import PublicationSummary from "../components/publish/PublicationSummary"
import PublishHeader from "../components/publish/PublishHeader"
import SellerContactSection from "../components/publish/SellerContactSection"
import VehicleCompatibilitySection from "../components/publish/VehicleCompatibilitySection"
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

const DRAFT_KEY = "punto-repuesto-publication-draft"
const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"]

function validatePublication(
  data: PublicationFormData,
  images: ProductImage[],
): PublicationErrors {
  const errors: PublicationErrors = {}
  if (data.title.trim().length < 8)
    errors.title = "Escribe un título de al menos 8 caracteres."
  if (data.description.trim().length < 30)
    errors.description = "La descripción debe tener al menos 30 caracteres."
  if (!data.category) errors.category = "Selecciona una categoría."
  if (!data.condition) errors.condition = "Selecciona el estado del producto."
  if (Number(data.price) <= 0)
    errors.price = "Ingresa un precio mayor que cero."
  if (!Number.isInteger(Number(data.quantity)) || Number(data.quantity) < 1)
    errors.quantity = "La cantidad debe ser al menos 1."
  if (!data.region) errors.region = "Selecciona una región."
  if (!data.commune) errors.commune = "Selecciona una comuna."
  if (!data.pickup && !data.shipping && !data.deliveryAgreement)
    errors.delivery = "Selecciona al menos una opción de entrega."
  if (!data.sellerName.trim())
    errors.sellerName = "Ingresa el nombre del vendedor."
  const phoneDigits = data.phone.replace(/\D/g, "")
  if (!/^(56)?9\d{8}$/.test(phoneDigits))
    errors.phone =
      "Usa un número móvil chileno válido, por ejemplo +56 9 1234 5678."
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
    errors.email = "Ingresa un correo electrónico válido."
  if (images.length === 0)
    errors.images = "Agrega al menos una imagen del producto."
  return errors
}

export default function PublishProductPage() {
  const [data, setData] = useState<PublicationFormData>(
    INITIAL_PUBLICATION_DATA,
  )
  const [images, setImages] = useState<ProductImage[]>([])
  const imagesRef = useRef<ProductImage[]>([])
  const submissionLockRef = useRef(false)
  const [errors, setErrors] = useState<PublicationErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdListingId, setCreatedListingId] = useState<string | null>(null)
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
      const available = Math.max(0, 8 - current.length)
      const additions = validFiles.slice(0, available).map((file, index) => ({
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
      setCreatedListingId(result.listingId)
      setNotice({
        type: "success",
        message: "Tu publicación fue creada correctamente.",
      })
      localStorage.removeItem(DRAFT_KEY)
      window.scrollTo({ top: 0, behavior: "smooth" })
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

        {createdListingId && notice?.type === "success" && (
          <p className="-mt-3 mb-6 text-xs text-muted">
            ID de publicación: {createdListingId}
          </p>
        )}

        <form noValidate onSubmit={submit} className="space-y-6">
          <BasicInformationSection
            data={data}
            errors={errors}
            setField={setField}
          />
          <VehicleCompatibilitySection data={data} setField={setField} />
          <div id="images">
            <ProductImagesSection
              images={images}
              error={errors.images}
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
          </div>
          <div id="delivery">
            <LocationDeliverySection
              data={data}
              errors={errors}
              setField={setField}
            />
          </div>
          <SellerContactSection
            data={data}
            errors={errors}
            setField={setField}
          />
          <PublicationSummary data={data} imageCount={images.length} />
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
