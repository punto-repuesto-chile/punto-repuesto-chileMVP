import { supabase } from "../lib/supabase"
import type { ProductImage, PublicationFormData } from "../types/publication"
import type {
  EditableProductImage,
  ExistingProductImage,
} from "../types/publication"

const LISTING_IMAGES_BUCKET = "listing-images"
const MAX_IMAGE_COUNT = 8
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024

const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

type DeliveryMethod = "pickup" | "shipping" | "delivery_agreement"

export type ListingStatus = "draft" | "published" | "paused" | "sold"
export type OwnedListingStatusUpdate = "published" | "paused" | "sold"
export type OwnedListingAction = OwnedListingStatusUpdate | "delete"

export type DeleteOwnedListingResult = {
  storageCleanupFailed: boolean
}

export type MyListing = {
  id: string
  title: string
  price: number
  category: string
  status: ListingStatus
  stock: number
  region: string
  commune: string
  createdAt: string
  primaryImageUrl: string | null
}

export type ListingCondition = "new" | "used" | "refurbished"

export type PublishedListingImage = {
  id: string
  url: string
  position: number
  isPrimary: boolean
}

export type PublishedListing = {
  id: string
  title: string
  description: string
  category: string
  condition: ListingCondition
  price: number
  stock: number
  vehicleBrand: string | null
  vehicleModel: string | null
  yearFrom: number | null
  yearTo: number | null
  engineVersion: string | null
  oemCode: string | null
  region: string
  commune: string
  deliveryMethods: DeliveryMethod[]
  contactName: string
  contactPhone: string
  allowWhatsapp: boolean
  createdAt: string
  images: PublishedListingImage[]
}

type MyListingImageRow = {
  storage_path: string
  is_primary: boolean
}

type PublishedListingImageRow = {
  id: string
  storage_path: string
  position: number
  is_primary: boolean
}

type PublishedListingRow = {
  id: string
  title: string
  description: string
  category: string
  condition: ListingCondition
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
  allow_whatsapp: boolean
  created_at: string
  listing_images: PublishedListingImageRow[] | null
}

type MyListingRow = {
  id: string
  title: string
  price: number
  category: string
  status: ListingStatus
  stock: number
  region: string
  commune: string
  created_at: string
  listing_images: MyListingImageRow[] | null
}

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

type NewUploadedListingImage = UploadedListingImage & { id: string }
type PositionedNewImage = {
  image: ProductImage
  position: number
}

export type PublicationResult = { listingId: string }

export type OwnedListingForEdit = {
  id: string
  status: ListingStatus
  formData: PublicationFormData
  images: ExistingProductImage[]
}

type OwnedListingRow = {
  id: string
  status: ListingStatus
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
  listing_images: PublishedListingImageRow[] | null
}

export class ListingPublicationError extends Error {
  readonly cause?: unknown

  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = "ListingPublicationError"
    this.cause = cause
  }
}

export class ListingsQueryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ListingsQueryError"
  }
}

export function getListingImagePublicUrl(storagePath: string): string {
  return supabase.storage.from(LISTING_IMAGES_BUCKET).getPublicUrl(storagePath)
    .data.publicUrl
}

export async function getMyListings(): Promise<MyListing[]> {
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user)
    throw new ListingsQueryError(
      "Tu sesión no está disponible. Inicia sesión nuevamente.",
    )

  const { data, error } = await supabase
    .from("listings")
    .select(
      "id,title,price,category,status,stock,region,commune,created_at,listing_images(storage_path,is_primary)",
    )
    .eq("seller_id", authData.user.id)
    .eq("listing_images.is_primary", true)
    .order("created_at", { ascending: false })

  if (error)
    throw new ListingsQueryError(
      "No pudimos cargar tus publicaciones en este momento.",
    )

  const rows = (data ?? []) as unknown as MyListingRow[]
  return rows.map((row) => {
    const primaryImage = row.listing_images?.find((image) => image.is_primary)
    return {
      id: row.id,
      title: row.title,
      price: Number(row.price),
      category: row.category,
      status: row.status,
      stock: row.stock,
      region: row.region,
      commune: row.commune,
      createdAt: row.created_at,
      primaryImageUrl: primaryImage
        ? getListingImagePublicUrl(primaryImage.storage_path)
        : null,
    }
  })
}

const ALLOWED_SOURCE_STATUSES: Record<OwnedListingStatusUpdate, ListingStatus[]> =
  {
    paused: ["published"],
    published: ["paused"],
    sold: ["published", "paused"],
  }

export async function updateOwnedListingStatus(
  listingId: string,
  status: OwnedListingStatusUpdate,
): Promise<MyListing> {
  if (!UUID_PATTERN.test(listingId))
    throw new ListingPublicationError("La publicación no es válida.")

  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user)
    throw new ListingPublicationError(
      "Tu sesión no está disponible. Inicia sesión nuevamente.",
      authError,
    )

  const { data, error } = await supabase
    .from("listings")
    .update({ status })
    .eq("id", listingId)
    .eq("seller_id", authData.user.id)
    .in("status", ALLOWED_SOURCE_STATUSES[status])
    .select(
      "id,title,price,category,status,stock,region,commune,created_at,listing_images(storage_path,is_primary)",
    )
    .eq("listing_images.is_primary", true)
    .maybeSingle()

  if (error) {
    if (import.meta.env.DEV)
      console.error("No se pudo actualizar el estado:", {
        code: error.code,
        message: error.message,
      })
    throw new ListingPublicationError(
      "No pudimos actualizar la publicación. Inténtalo nuevamente.",
      error,
    )
  }
  if (!data)
    throw new ListingPublicationError(
      "La publicación no pertenece a tu cuenta o ese cambio de estado no está permitido.",
    )

  const row = data as unknown as MyListingRow
  const primaryImage = row.listing_images?.find((image) => image.is_primary)
  return {
    id: row.id,
    title: row.title,
    price: Number(row.price),
    category: row.category,
    status: row.status,
    stock: row.stock,
    region: row.region,
    commune: row.commune,
    createdAt: row.created_at,
    primaryImageUrl: primaryImage
      ? getListingImagePublicUrl(primaryImage.storage_path)
      : null,
  }
}

type OwnedListingForDeletionRow = {
  id: string
  status: ListingStatus
  listing_images: { storage_path: string }[] | null
}

export async function deleteOwnedListing(
  listingId: string,
): Promise<DeleteOwnedListingResult> {
  if (!UUID_PATTERN.test(listingId))
    throw new ListingPublicationError("La publicación no es válida.")

  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user)
    throw new ListingPublicationError(
      "Tu sesión no está disponible. Inicia sesión nuevamente.",
      authError,
    )

  const userId = authData.user.id
  const { data: listingData, error: listingError } = await supabase
    .from("listings")
    .select("id,status,listing_images(storage_path)")
    .eq("id", listingId)
    .eq("seller_id", userId)
    .maybeSingle()

  if (listingError)
    throw new ListingPublicationError(
      "No pudimos preparar la eliminación. Inténtalo nuevamente.",
      listingError,
    )
  if (!listingData)
    throw new ListingPublicationError(
      "La publicación no existe o no pertenece a tu cuenta.",
    )

  const listing = listingData as unknown as OwnedListingForDeletionRow
  const storagePaths = (listing.listing_images ?? []).map(
    (image) => image.storage_path,
  )
  const wasPublished = listing.status === "published"

  if (wasPublished) {
    const { data: pausedListing, error: pauseError } = await supabase
      .from("listings")
      .update({ status: "paused" })
      .eq("id", listingId)
      .eq("seller_id", userId)
      .eq("status", "published")
      .select("id")
      .maybeSingle()

    if (pauseError || !pausedListing)
      throw new ListingPublicationError(
        "No pudimos ocultar la publicación antes de eliminarla. No se eliminó nada.",
        pauseError,
      )
  }

  const { data: deletedListing, error: deleteError } = await supabase
    .from("listings")
    .delete()
    .eq("id", listingId)
    .eq("seller_id", userId)
    .select("id")
    .maybeSingle()

  if (deleteError || !deletedListing) {
    if (wasPublished) {
      const { error: restoreError } = await supabase
        .from("listings")
        .update({ status: "published" })
        .eq("id", listingId)
        .eq("seller_id", userId)
        .eq("status", "paused")
      if (restoreError && import.meta.env.DEV)
        console.warn("No se pudo restaurar el estado de la publicación:", {
          code: restoreError.code,
          message: restoreError.message,
        })
    }
    throw new ListingPublicationError(
      "No pudimos eliminar la publicación. Inténtalo nuevamente.",
      deleteError,
    )
  }

  if (storagePaths.length === 0) return { storageCleanupFailed: false }

  const { error: storageError } = await supabase.storage
    .from(LISTING_IMAGES_BUCKET)
    .remove(storagePaths)
  if (storageError) {
    if (import.meta.env.DEV)
      console.error("La publicación se eliminó, pero falló Storage:", {
        code: storageError.name,
        message: storageError.message,
        storagePaths,
      })
    return { storageCleanupFailed: true }
  }

  return { storageCleanupFailed: false }
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function getPublishedListingById(
  listingId: string,
): Promise<PublishedListing | null> {
  if (!UUID_PATTERN.test(listingId)) return null

  const { data, error } = await supabase
    .from("listings")
    .select(
      "id,title,description,category,condition,price,stock,vehicle_brand,vehicle_model,year_from,year_to,engine_version,oem_code,region,commune,delivery_methods,contact_name,contact_phone,allow_whatsapp,created_at,listing_images(id,storage_path,position,is_primary)",
    )
    .eq("id", listingId)
    .eq("status", "published")
    .order("position", { referencedTable: "listing_images", ascending: true })
    .maybeSingle()

  if (error)
    throw new ListingsQueryError(
      "No pudimos cargar esta publicación en este momento.",
    )
  if (!data) return null

  const row = data as unknown as PublishedListingRow
  const images = (row.listing_images ?? [])
    .slice()
    .sort((first, second) => first.position - second.position)
    .map((image) => ({
      id: image.id,
      url: getListingImagePublicUrl(image.storage_path),
      position: image.position,
      isPrimary: image.is_primary,
    }))

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    condition: row.condition,
    price: Number(row.price),
    stock: row.stock,
    vehicleBrand: row.vehicle_brand,
    vehicleModel: row.vehicle_model,
    yearFrom: row.year_from,
    yearTo: row.year_to,
    engineVersion: row.engine_version,
    oemCode: row.oem_code,
    region: row.region,
    commune: row.commune,
    deliveryMethods: row.delivery_methods,
    contactName: row.contact_name,
    contactPhone: row.contact_phone,
    allowWhatsapp: row.allow_whatsapp,
    createdAt: row.created_at,
    images,
  }
}

function rowToPublicationFormData(row: OwnedListingRow): PublicationFormData {
  return {
    title: row.title,
    description: row.description,
    category: row.category,
    condition: row.condition,
    price: String(row.price),
    quantity: String(row.stock),
    vehicleBrand: row.vehicle_brand ?? "",
    vehicleModel: row.vehicle_model ?? "",
    yearFrom: row.year_from === null ? "" : String(row.year_from),
    yearTo: row.year_to === null ? "" : String(row.year_to),
    version: row.engine_version ?? "",
    oemCode: row.oem_code ?? "",
    multipleVehicles: false,
    region: row.region,
    commune: row.commune,
    pickup: row.delivery_methods.includes("pickup"),
    shipping: row.delivery_methods.includes("shipping"),
    deliveryAgreement: row.delivery_methods.includes("delivery_agreement"),
    sellerName: row.contact_name,
    phone: row.contact_phone,
    email: row.contact_email ?? "",
    whatsapp: row.allow_whatsapp,
  }
}

export async function getOwnedListingById(
  listingId: string,
): Promise<OwnedListingForEdit | null> {
  if (!UUID_PATTERN.test(listingId)) return null
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) return null

  const { data, error } = await supabase
    .from("listings")
    .select(
      "id,status,title,description,category,condition,price,stock,vehicle_brand,vehicle_model,year_from,year_to,engine_version,oem_code,region,commune,delivery_methods,contact_name,contact_phone,contact_email,allow_whatsapp,listing_images(id,storage_path,position,is_primary)",
    )
    .eq("id", listingId)
    .eq("seller_id", authData.user.id)
    .order("position", { referencedTable: "listing_images", ascending: true })
    .maybeSingle()

  if (error || !data) return null
  const row = data as unknown as OwnedListingRow
  return {
    id: row.id,
    status: row.status,
    formData: rowToPublicationFormData(row),
    images: (row.listing_images ?? []).map((image) => ({
      kind: "existing",
      id: image.id,
      imageRecordId: image.id,
      storagePath: image.storage_path,
      position: image.position,
      previewUrl: getListingImagePublicUrl(image.storage_path),
      isPrimary: image.is_primary,
    })),
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

function validateNewImageFiles(images: ProductImage[]) {
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

type ListingUpdateInput = Omit<CreateListingInput, "seller_id" | "listing_type" | "contact_email" | "status">

function createListingUpdateInput(
  data: PublicationFormData,
  sellerId: string,
): ListingUpdateInput {
  const {
    seller_id: _sellerId,
    listing_type: _listingType,
    contact_email: _contactEmail,
    status: _status,
    ...updateInput
  } = createListingInput(data, sellerId)
  return updateInput
}

function isNewImage(image: EditableProductImage): image is ProductImage {
  return image.kind === "new"
}

function isExistingImage(
  image: EditableProductImage,
): image is ExistingProductImage {
  return image.kind === "existing"
}

async function uploadAdditionalListingImages(
  listingId: string,
  userId: string,
  images: PositionedNewImage[],
): Promise<NewUploadedListingImage[]> {
  const uploaded: NewUploadedListingImage[] = []
  for (const { image, position } of images) {
    const extension = IMAGE_EXTENSIONS[image.file.type]
    const imageId = crypto.randomUUID()
    const storagePath = `${userId}/${listingId}/${imageId}.${extension}`
    const { error } = await supabase.storage
      .from(LISTING_IMAGES_BUCKET)
      .upload(storagePath, image.file, {
        contentType: image.file.type,
        upsert: false,
      })
    if (error) {
      const uploadError = new ListingPublicationError(
        "No pudimos subir una de las imágenes nuevas.",
        error,
      )
      Object.assign(uploadError, { uploadedImages: uploaded })
      throw uploadError
    }
    uploaded.push({
      id: imageId,
      listing_id: listingId,
      storage_path: storagePath,
      position,
      is_primary: image.isPrimary,
    })
  }
  return uploaded
}

async function cleanupNewUploadedImages(images: NewUploadedListingImage[]) {
  if (images.length === 0) return
  const paths = images.map((image) => image.storage_path)
  await supabase
    .from("listing_images")
    .delete()
    .in(
      "id",
      images.map((image) => image.id),
    )
  const { error } = await supabase.storage
    .from(LISTING_IMAGES_BUCKET)
    .remove(paths)
  if (error)
    console.warn("No se pudieron limpiar imágenes nuevas:", errorDetail(error))
}

export async function updateOwnedListing(
  listingId: string,
  data: PublicationFormData,
  images: EditableProductImage[],
  original: OwnedListingForEdit,
): Promise<void> {
  validateListingData(data)
  if (images.length === 0 || images.length > MAX_IMAGE_COUNT)
    throw new ListingPublicationError(
      "La publicación debe tener entre 1 y 8 imágenes.",
    )
  if (images.filter((image) => image.isPrimary).length !== 1)
    throw new ListingPublicationError(
      "Selecciona exactamente una imagen principal.",
    )

  const newImages = images.filter(isNewImage)
  validateNewImageFiles(newImages)

  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user)
    throw new ListingPublicationError("Tu sesión no está disponible.")

  const { data: ownedRow, error: ownershipError } = await supabase
    .from("listings")
    .select("id")
    .eq("id", listingId)
    .eq("seller_id", authData.user.id)
    .maybeSingle()
  if (ownershipError || !ownedRow)
    throw new ListingPublicationError("No tienes acceso a esta publicación.")

  const finalImages = images.map((image, position) => ({ image, position }))
  const newFinalImages = finalImages
    .filter(({ image }) => isNewImage(image))
    .map(({ image, position }) => ({ image: image as ProductImage, position }))
  const keptExisting = finalImages
    .filter(({ image }) => isExistingImage(image))
    .map(({ image, position }) => ({
      image: image as ExistingProductImage,
      position,
    }))
  const keptIds = new Set(keptExisting.map(({ image }) => image.imageRecordId))
  const removed = original.images.filter(
    (image) => !keptIds.has(image.imageRecordId),
  )
  let uploaded: NewUploadedListingImage[] = []

  try {
    uploaded = await uploadAdditionalListingImages(
      listingId,
      authData.user.id,
      newFinalImages,
    )

    const { error: listingError } = await supabase
      .from("listings")
      .update(createListingUpdateInput(data, authData.user.id))
      .eq("id", listingId)
      .eq("seller_id", authData.user.id)
    if (listingError) throw listingError

    if (original.images.length > 0) {
      const staged = original.images.map((image, index) => ({
        id: image.imageRecordId,
        listing_id: listingId,
        storage_path: image.storagePath,
        position: 10000 + index,
        is_primary: false,
      }))
      const { error } = await supabase.from("listing_images").upsert(staged)
      if (error) throw error
    }

    if (uploaded.length > 0) {
      const { error } = await supabase.from("listing_images").insert(uploaded)
      if (error) throw error
    }

    if (keptExisting.length > 0) {
      const finalized = keptExisting.map(({ image, position }) => ({
        id: image.imageRecordId,
        listing_id: listingId,
        storage_path: image.storagePath,
        position,
        is_primary: image.isPrimary,
      }))
      const { error } = await supabase.from("listing_images").upsert(finalized)
      if (error) throw error
    }

    if (removed.length > 0) {
      const { error } = await supabase
        .from("listing_images")
        .delete()
        .in(
          "id",
          removed.map((image) => image.imageRecordId),
        )
      if (error) throw error
      const { error: storageError } = await supabase.storage
        .from(LISTING_IMAGES_BUCKET)
        .remove(removed.map((image) => image.storagePath))
      if (storageError)
        console.warn(
          "No se pudieron eliminar algunos archivos antiguos:",
          errorDetail(storageError),
        )
    }
  } catch (error) {
    const imagesToCleanup =
      uploaded.length > 0
        ? uploaded
        : getPartiallyUploadedImages(error) as NewUploadedListingImage[]
    await cleanupNewUploadedImages(imagesToCleanup)
    const originalRows = original.images.map((image) => ({
      id: image.imageRecordId,
      listing_id: listingId,
      storage_path: image.storagePath,
      position: image.position,
      is_primary: image.isPrimary,
    }))
    if (originalRows.length > 0)
      await supabase.from("listing_images").upsert(originalRows)
    await supabase
      .from("listings")
      .update(createListingUpdateInput(original.formData, authData.user.id))
      .eq("id", listingId)
      .eq("seller_id", authData.user.id)
    throw new ListingPublicationError(
      "No pudimos guardar todos los cambios. Inténtalo nuevamente.",
      error,
    )
  }
}
