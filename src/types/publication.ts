export type ProductCondition = "new" | "used" | "refurbished" | ""

export type PublicationFormData = {
  title: string

  description: string

  category: string

  condition: ProductCondition

  price: string

  quantity: string

  vehicleBrand: string

  vehicleModel: string

  yearFrom: string

  yearTo: string

  version: string

  oemCode: string

  multipleVehicles: boolean

  region: string

  commune: string

  pickup: boolean

  shipping: boolean

  deliveryAgreement: boolean

  sellerName: string

  phone: string

  email: string

  whatsapp: boolean
}

export type PublicationField = keyof PublicationFormData | "images" | "delivery"

export type PublicationErrors = Partial<Record<PublicationField, string>>

export type PublicationImagePreview = {
  id: string

  previewUrl: string

  isPrimary: boolean
}

export type ProductImage = PublicationImagePreview & {
  kind: "new"

  file: File
}

export type ExistingProductImage = PublicationImagePreview & {
  kind: "existing"

  imageRecordId: string

  storagePath: string

  position: number
}

export type EditableProductImage = ProductImage | ExistingProductImage

export type SetPublicationField = <K extends keyof PublicationFormData,>(
  field: K,

  value: PublicationFormData[K],
) => void

export const INITIAL_PUBLICATION_DATA: PublicationFormData = {
  title: "",

  description: "",

  category: "",

  condition: "",

  price: "",

  quantity: "1",

  vehicleBrand: "",

  vehicleModel: "",

  yearFrom: "",

  yearTo: "",

  version: "",

  oemCode: "",

  multipleVehicles: false,

  region: "",

  commune: "",

  pickup: false,

  shipping: false,

  deliveryAgreement: false,

  sellerName: "",

  phone: "",

  email: "",

  whatsapp: false,
}
