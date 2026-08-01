export type Product = {
  id: number
  title: string
  compatible: string
  years: string
  location: string
  price: string
  seller: string
  verified: boolean
  condition: "Nuevo" | "Usado"
  img: string
}

export type Vehicle = {
  id: number
  brand: string
  year: number
  km: string
  location: string
  price: string
  seller: string
  img: string
}

export type Desarmaduria = {
  name: string
  location: string
  listings: number
  specialty: string
  img: string
}

export const PRODUCTS: Product[] = [
  {
    id: 1,
    title: "Parachoques delantero Toyota Yaris",
    compatible: "Toyota Yaris",
    years: "2016–2020",
    location: "Santiago, RM",
    price: "$48.000",
    seller: "AutoPiezas del Sur",
    verified: true,
    condition: "Usado",
    img: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=400&h=280&fit=crop&auto=format",
  },
  {
    id: 2,
    title: "Alternador Hyundai Accent",
    compatible: "Hyundai Accent",
    years: "2015–2019",
    location: "Concepción, Bio-Bío",
    price: "$62.000",
    seller: "Juan Pérez",
    verified: false,
    condition: "Usado",
    img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=280&fit=crop&auto=format",
  },
  {
    id: 3,
    title: "Foco delantero Chevrolet Sail",
    compatible: "Chevrolet Sail",
    years: "2018–2022",
    location: "Valparaíso, V Región",
    price: "$35.500",
    seller: "Repuestos Pacífico",
    verified: true,
    condition: "Nuevo",
    img: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&h=280&fit=crop&auto=format",
  },
  {
    id: 4,
    title: "Caja de cambios Kia Rio",
    compatible: "Kia Rio",
    years: "2017–2021",
    location: "Temuco, La Araucanía",
    price: "$185.000",
    seller: "Desarmaduría Central",
    verified: true,
    condition: "Usado",
    img: "https://images.unsplash.com/photo-1517524285303-d6fc683dddf8?w=400&h=280&fit=crop&auto=format",
  },
]

export const VEHICLES: Vehicle[] = [
  {
    id: 1,
    brand: "Nissan Sentra",
    year: 2019,
    km: "62.000 km",
    location: "Santiago, RM",
    price: "$9.200.000",
    seller: "Particular",
    img: "https://images.unsplash.com/photo-1602519939776-094734d4a4de?w=400&h=260&fit=crop&auto=format",
  },
  {
    id: 2,
    brand: "Suzuki Swift",
    year: 2020,
    km: "38.000 km",
    location: "Viña del Mar, V Región",
    price: "$8.400.000",
    seller: "Vendedor profesional",
    img: "https://images.unsplash.com/photo-1563720360172-67b8f3dce741?w=400&h=260&fit=crop&auto=format",
  },
  {
    id: 3,
    brand: "Chevrolet Cruze",
    year: 2018,
    km: "88.000 km",
    location: "Concepción, Bio-Bío",
    price: "$7.100.000",
    seller: "Particular",
    img: "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=400&h=260&fit=crop&auto=format",
  },
]

export const DESARMADURAS: Desarmaduria[] = [
  {
    name: "Desarmaduría Oriente",
    location: "Peñalolén, Región Metropolitana",
    listings: 847,
    specialty: "Toyota, Hyundai, Kia",
    img: "https://images.unsplash.com/photo-1632823471406-4c5c7e4c6f24?w=300&h=200&fit=crop&auto=format",
  },
  {
    name: "AutoPartes del Sur",
    location: "San Pedro de la Paz, Bio-Bío",
    listings: 523,
    specialty: "Chevrolet, Ford, Nissan",
    img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=200&fit=crop&auto=format",
  },
  {
    name: "Repuestos Norte Grande",
    location: "Antofagasta, Región de Antofagasta",
    listings: 312,
    specialty: "Suzuki, Mitsubishi, Mazda",
    img: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=300&h=200&fit=crop&auto=format",
  },
]
