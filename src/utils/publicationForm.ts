import type {
  PublicationErrors,
  PublicationFormData,
  PublicationImagePreview,
} from "../types/publication"

export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"]
export const MAX_PUBLICATION_IMAGES = 8

export function validatePublication(
  data: PublicationFormData,
  images: PublicationImagePreview[],
): PublicationErrors {
  const errors: PublicationErrors = {}
  if (data.title.trim().length < 8)
    errors.title = "Escribe un título de al menos 8 caracteres."
  if (data.description.trim().length < 30)
    errors.description = "La descripción debe tener al menos 30 caracteres."
  if (!data.category) errors.category = "Selecciona una categoría."
  if (!data.condition) errors.condition = "Selecciona el estado del producto."
  if (!Number.isSafeInteger(Number(data.price)) || Number(data.price) <= 0)
    errors.price = "Ingresa un precio entero mayor que cero."
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
  if (images.length > MAX_PUBLICATION_IMAGES)
    errors.images = "Puedes usar un máximo de 8 imágenes."
  if (images.filter((image) => image.isPrimary).length !== 1)
    errors.images = "Selecciona exactamente una imagen principal."
  return errors
}
