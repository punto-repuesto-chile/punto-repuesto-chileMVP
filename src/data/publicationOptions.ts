export { PRODUCT_CATEGORIES } from "../constants/listingCategories"

export const VEHICLE_BRANDS = [
  "Chevrolet",
  "Ford",
  "Hyundai",
  "Kia",
  "Mazda",
  "Nissan",
  "Suzuki",
  "Toyota",
  "Volkswagen",
  "Otra",
]

export const CHILE_LOCATIONS: Record<string, string[]> = {
  "Región de Antofagasta": ["Antofagasta", "Calama", "Tocopilla"],
  "Región de Valparaíso": ["Valparaíso", "Viña del Mar", "Quilpué"],
  "Región Metropolitana": ["Santiago", "Maipú", "Puente Alto", "Peñalolén"],
  "Región del Biobío": ["Concepción", "Talcahuano", "San Pedro de la Paz"],
  "Región de La Araucanía": ["Temuco", "Padre Las Casas", "Villarrica"],
}
