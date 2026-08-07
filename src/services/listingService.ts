import { supabase } from "../lib/supabase"
import type { ProductImage, PublicationFormData } from "../types/publication"

const LISTING_IMAGES_BUCKET = "listing-images"
const MAX_IMAGE_COUNT = 8
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024

const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

type DeliveryMethod = "pickup" | "shipping" | "delivery_agreement"

export type CreateListingInput = {
  seller_id: string
  listing_type: "part"
  title: string
  description: string
  category: string
  condition: Exclude<PublicationFormData["condition"], "">
  price: number
  stock: number
  vehicle_brand: string | null
  vehicle_model: string | null
  year_from: number | null
  year_to: number | null
  engine_version: string | null
  oem_code: string | null
  region: string
  commune: string
  delivery_methods: DeliveryMethod[]
  contact_name: string
  contact_phone: string
  contact_email: string | null
  allow_whatsapp: boolean
  status: "draft"
}

export type UploadedListingImage = {
  listing_id: string
  storage_path: string
  position: number
  is_primary: boolean
}

export type PublicationResult = { listingId: string }

export class ListingPublicationError extends Error {
  readonly cause?: unknown

  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = "ListingPublicationError"
    this.cause = cause
  }
}

function optionalText(value: string): string | null {
  const trimmed = value.trim()
  return trimmed || null
}

function optionalInteger(value: string): number | null {
  return value === "" ? null : Number.parseInt(value, 10)
}

function getDeliveryMethods(data: PublicationFormData): DeliveryMethod[] {
  const methods: DeliveryMethod[] = []
  if (data.pickup) methods.push("pickup")
  if (data.shipping) methods.push("shipping")
  if (data.deliveryAgreement) methods.push("delivery_agreement")
  return methods
}

function validateListingData(data: PublicationFormData) {
  const price = Number(data.price)
  const stock = Number(data.quantity)
  const yearFrom = data.yearFrom === "" ? null : Number(data.yearFrom)
  const yearTo = data.yearTo === "" ? null : Number(data.yearTo)

  if (data.title.trim().length < 8 || data.description.trim().length < 30)
    throw new ListingPublicationError("Revisa el título y la descripción.")
  if (!data.category || !data.condition)
    throw new ListingPublicationError("Selecciona la categoría y el estado.")
  if (!Number.isSafeInteger(price) || price <= 0)
    throw new ListingPublicationError(
      "El precio debe ser un monto entero en CLP.",
    )
  if (!Number.isSafeInteger(stock) || stock < 1)
    throw new ListingPublicationError(
      "La cantidad debe ser un número entero mayor que cero.",
    )
  if (
    (yearFrom !== null &&
      (!Number.isInteger(yearFrom) || yearFrom < 1886 || yearFrom > 2100)) ||
    (yearTo !== null &&
      (!Number.isInteger(yearTo) || yearTo < 1886 || yearTo > 2100)) ||
    (yearFrom !== null && yearTo !== null && yearTo < yearFrom)
  )
    throw new ListingPublicationError("Revisa el rango de años del vehículo.")
  if (!data.region || !data.commune || getDeliveryMethods(data).length === 0)
    throw new ListingPublicationError(
      "Completa la ubicación y la forma de entrega.",
    )
  if (!data.sellerName.trim() || !data.phone.trim())
    throw new ListingPublicationError(
      "Completa los datos de contacto obligatorios.",
    )
}

function createListingInput(
  data: PublicationFormData,
  sellerId: string,
): CreateListingInput {
  if (!data.condition)
    throw new ListingPublicationError("Selecciona el estado del producto.")

  return {
    seller_id: sellerId,
    listing_type: "part",
    title: data.title.trim(),
    description: data.description.trim(),
    category: data.category,
    condition: data.condition,
    price: Number.parseInt(data.price, 10),
    stock: Number.parseInt(data.quantity, 10),
    vehicle_brand: optionalText(data.vehicleBrand),
    vehicle_model: optionalText(data.vehicleModel),
    year_from: optionalInteger(data.yearFrom),
    year_to: optionalInteger(data.yearTo),
    engine_version: optionalText(data.version),
    oem_code: optionalText(data.oemCode),
    region: data.region,
    commune: data.commune,
    delivery_methods: getDeliveryMethods(data),
    contact_name: data.sellerName.trim(),
    contact_phone: data.phone.trim(),
    contact_email: optionalText(data.email),
    allow_whatsapp: data.whatsapp,
    status: "draft",
  }
}

function validateImages(images: ProductImage[]) {
  if (images.length === 0)
    throw new ListingPublicationError(
      "Agrega al menos una imagen del producto.",
    )
  if (images.length > MAX_IMAGE_COUNT)
    throw new ListingPublicationError(
      "Puedes publicar un máximo de 8 imágenes.",
    )
  if (images.filter((image) => image.isPrimary).length !== 1)
    throw new ListingPublicationError(
      "Selecciona exactamente una imagen principal.",
    )

  for (const image of images) {
    if (!IMAGE_EXTENSIONS[image.file.type])
      throw new ListingPublicationError(
        "Todas las imágenes deben ser JPEG, PNG o WebP.",
      )
    if (image.file.size > MAX_IMAGE_SIZE_BYTES)
      throw new ListingPublicationError(
        `La imagen ${image.file.name} supera el límite de 5 MiB.`,
      )
  }
}

async function createDraftListing(input: CreateListingInput): Promise<string> {
  const { data, error } = await supabase
    .from("listings")
    .insert(input)
    .select("id")
    .single()
  if (error || !data)
    throw new ListingPublicationError(
      "No pudimos crear el borrador de la publicación.",
      error,
    )
  return data.id as string
}

async function uploadListingImages(
  images: ProductImage[],
  userId: string,
  listingId: string,
): Promise<UploadedListingImage[]> {
  const uploaded: UploadedListingImage[] = []
  for (const [position, image] of images.entries()) {
    const extension = IMAGE_EXTENSIONS[image.file.type]
    const storagePath = `${userId}/${listingId}/${crypto.randomUUID()}.${extension}`
    const { error } = await supabase.storage
      .from(LISTING_IMAGES_BUCKET)
      .upload(storagePath, image.file, {
        contentType: image.file.type,
        upsert: false,
      })
    if (error) {
      const uploadError = new ListingPublicationError(
        `No pudimos subir la imagen ${position + 1}.`,
        error,
      )
      Object.assign(uploadError, { uploadedImages: uploaded })
      throw uploadError
    }
    uploaded.push({
      listing_id: listingId,
      storage_path: storagePath,
      position,
      is_primary: image.isPrimary,
    })
  }
  return uploaded
}

async function createListingImageRecords(images: UploadedListingImage[]) {
  const { error } = await supabase.from("listing_images").insert(images)
  if (error)
    throw new ListingPublicationError(
      "Las imágenes se subieron, pero no pudimos guardar su información.",
      error,
    )
}

async function publishListing(listingId: string) {
  const { data, error } = await supabase
    .from("listings")
    .update({ status: "published" })
    .eq("id", listingId)
    .select("id")
    .single()
  if (error || !data)
    throw new ListingPublicationError(
      "La publicación no pudo activarse. Se intentará limpiar el borrador.",
      error,
    )
}

function errorDetail(error: unknown): string {
  return error instanceof Error ? error.message : "Error desconocido"
}

async function cleanupFailedPublication(
  listingId: string,
  uploadedImages: UploadedListingImage[],
) {
  const { error: imageRowsError } = await supabase
    .from("listing_images")
    .delete()
    .eq("listing_id", listingId)
  if (imageRowsError)
    console.warn(
      "No se pudieron limpiar los metadatos:",
      errorDetail(imageRowsError),
    )

  if (uploadedImages.length > 0) {
    const { error: storageError } = await supabase.storage
      .from(LISTING_IMAGES_BUCKET)
      .remove(uploadedImages.map((image) => image.storage_path))
    if (storageError)
      console.warn(
        "No se pudieron limpiar archivos de Storage:",
        errorDetail(storageError),
      )
  }

  const { error: listingError } = await supabase
    .from("listings")
    .delete()
    .eq("id", listingId)
  if (listingError)
    console.warn("No se pudo limpiar el borrador:", errorDetail(listingError))
}

function getPartiallyUploadedImages(error: unknown): UploadedListingImage[] {
  if (
    typeof error === "object" &&
    error !== null &&
    "uploadedImages" in error &&
    Array.isArray(error.uploadedImages)
  )
    return error.uploadedImages as UploadedListingImage[]
  return []
}

export async function createPublication(
  data: PublicationFormData,
  images: ProductImage[],
): Promise<PublicationResult> {
  validateListingData(data)
  validateImages(images)
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user)
    throw new ListingPublicationError(
      "Tu sesión no está disponible. Inicia sesión nuevamente para publicar.",
      authError,
    )

  const listingId = await createDraftListing(
    createListingInput(data, authData.user.id),
  )
  let uploadedImages: UploadedListingImage[] = []
  try {
    uploadedImages = await uploadListingImages(
      images,
      authData.user.id,
      listingId,
    )
    await createListingImageRecords(uploadedImages)
    await publishListing(listingId)
    return { listingId }
  } catch (error) {
    const imagesToCleanup =
      uploadedImages.length > 0
        ? uploadedImages
        : getPartiallyUploadedImages(error)
    await cleanupFailedPublication(listingId, imagesToCleanup)
    throw error
  }
}
