export type SalvageYardStatus = "draft" | "active"

export type SalvageYard = {
  id: string
  ownerId: string
  businessName: string
  description: string | null
  logoPath: string | null
  logoUrl: string | null
  region: string
  commune: string
  publicAddress: string | null
  phone: string | null
  whatsapp: string | null
  openingHours: string | null
  status: SalvageYardStatus
  createdAt: string
  updatedAt: string
}

export type PublicSalvageYard = Omit<SalvageYard, "ownerId" | "status" | "updatedAt">

export type CreateSalvageYardInput = {
  businessName: string
  description?: string | null
  logoPath?: string | null
  region: string
  commune: string
  publicAddress?: string | null
  phone?: string | null
  whatsapp?: string | null
  openingHours?: string | null
  status?: SalvageYardStatus
}

export type UpdateSalvageYardInput = Partial<CreateSalvageYardInput>
