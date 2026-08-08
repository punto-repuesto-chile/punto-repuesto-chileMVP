export type ListingCategory = {
  label: string
  value: string
  showInPartsMenu: boolean
}

export const LISTING_CATEGORY_VALUES = {
  motor: "Motor",
  transmission: "Transmisión",
  clutch: "Embrague",
  brakes: "Frenos",
  suspension: "Suspensión",
  body: "Carrocería",
  electricity: "Electricidad",
  lighting: "Iluminación",
  tires: "Neumáticos y llantas",
} as const

export const LISTING_CATEGORIES: ListingCategory[] = [
  {
    label: "Motor",
    value: LISTING_CATEGORY_VALUES.motor,
    showInPartsMenu: true,
  },
  {
    label: "Transmisión",
    value: LISTING_CATEGORY_VALUES.transmission,
    showInPartsMenu: true,
  },
  {
    label: "Embrague",
    value: LISTING_CATEGORY_VALUES.clutch,
    showInPartsMenu: true,
  },
  {
    label: "Frenos",
    value: LISTING_CATEGORY_VALUES.brakes,
    showInPartsMenu: true,
  },
  {
    label: "Suspensión y dirección",
    value: LISTING_CATEGORY_VALUES.suspension,
    showInPartsMenu: true,
  },
  {
    label: "Carrocería",
    value: LISTING_CATEGORY_VALUES.body,
    showInPartsMenu: true,
  },
  {
    label: "Electricidad",
    value: LISTING_CATEGORY_VALUES.electricity,
    showInPartsMenu: true,
  },
  {
    label: "Luces e iluminación",
    value: LISTING_CATEGORY_VALUES.lighting,
    showInPartsMenu: true,
  },
  {
    label: "Neumáticos y llantas",
    value: LISTING_CATEGORY_VALUES.tires,
    showInPartsMenu: true,
  },
  {
    label: "Interior y tapiz",
    value: "Interior y tapiz",
    showInPartsMenu: true,
  },
  { label: "Climatización", value: "Climatización", showInPartsMenu: true },
  { label: "Escape", value: "Escape", showInPartsMenu: true },
  { label: "Filtros", value: "Filtros", showInPartsMenu: true },
  {
    label: "Accesorios",
    value: "Accesorios",
    showInPartsMenu: false,
  },
  { label: "Otros", value: "Otros", showInPartsMenu: false },
]

export const PARTS_MENU_CATEGORIES = LISTING_CATEGORIES.filter(
  (category) => category.showInPartsMenu,
)

export const PRODUCT_CATEGORIES = LISTING_CATEGORIES.map(
  (category) => category.value,
)

export function categorySearchUrl(value: string): string {
  return `/buscar?${new URLSearchParams({
    tipo: "part",
    categoria: value,
  }).toString()}`
}

export function listingCategoryLabel(value: string): string {
  return (
    LISTING_CATEGORIES.find((category) => category.value === value)?.label ??
    value
  )
}
