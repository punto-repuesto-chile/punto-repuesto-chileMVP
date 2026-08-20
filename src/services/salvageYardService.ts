import { supabase } from "../lib/supabase"
import type {
  CreateSalvageYardInput,
  PublicSalvageYard,
  SalvageYard,
  SalvageYardStatus,
  UpdateSalvageYardInput,
} from "../types/salvageYard"

const SALVAGE_YARD_ASSETS_BUCKET = "salvage-yard-assets"
const MAX_LOGO_SIZE = 2 * 1024 * 1024
const LOGO_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

type SalvageYardRow = {
  id: string
  owner_id: string
  business_name: string
  description: string | null
  logo_path: string | null
  region: string
  commune: string
  public_address: string | null
  phone: string | null
  whatsapp: string | null
  opening_hours: string | null
  status: SalvageYardStatus
  created_at: string
  updated_at: string
}

type PublicSalvageYardRow = Omit<SalvageYardRow, "owner_id" | "status" | "updated_at">

type ServiceErrorDetails = {
  code?: string
  message: string
}

export class SalvageYardServiceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "SalvageYardServiceError"
  }
}

function reportError(context: string, error: ServiceErrorDetails): void {
  if (import.meta.env.DEV)
    console.error(context, { code: error.code, message: error.message })
}

async function getAuthenticatedUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    if (error) reportError("No se pudo validar la sesión.", error)
    throw new SalvageYardServiceError("Tu sesión ya no está disponible.")
  }
  return data.user.id
}

function nullableText(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function getLogoPublicUrl(path: string | null): string | null {
  if (!path) return null
  return supabase.storage.from(SALVAGE_YARD_ASSETS_BUCKET).getPublicUrl(path)
    .data.publicUrl
}

function mapSalvageYard(row: SalvageYardRow): SalvageYard {
  return {
    id: row.id,
    ownerId: row.owner_id,
    businessName: row.business_name,
    description: row.description,
    logoPath: row.logo_path,
    logoUrl: getLogoPublicUrl(row.logo_path),
    region: row.region,
    commune: row.commune,
    publicAddress: row.public_address,
    phone: row.phone,
    whatsapp: row.whatsapp,
    openingHours: row.opening_hours,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapPublicSalvageYard(row: PublicSalvageYardRow): PublicSalvageYard {
  return {
    id: row.id,
    businessName: row.business_name,
    description: row.description,
    logoPath: row.logo_path,
    logoUrl: getLogoPublicUrl(row.logo_path),
    region: row.region,
    commune: row.commune,
    publicAddress: row.public_address,
    phone: row.phone,
    whatsapp: row.whatsapp,
    openingHours: row.opening_hours,
    createdAt: row.created_at,
  }
}

function toDatabaseInput(
  input: CreateSalvageYardInput | UpdateSalvageYardInput,
) {
  return {
    ...(input.businessName !== undefined && {
      business_name: input.businessName.trim(),
    }),
    ...(input.description !== undefined && {
      description: nullableText(input.description),
    }),
    ...(input.logoPath !== undefined && { logo_path: input.logoPath }),
    ...(input.region !== undefined && { region: input.region.trim() }),
    ...(input.commune !== undefined && { commune: input.commune.trim() }),
    ...(input.publicAddress !== undefined && {
      public_address: nullableText(input.publicAddress),
    }),
    ...(input.phone !== undefined && { phone: nullableText(input.phone) }),
    ...(input.whatsapp !== undefined && {
      whatsapp: nullableText(input.whatsapp),
    }),
    ...(input.openingHours !== undefined && {
      opening_hours: nullableText(input.openingHours),
    }),
    ...(input.status !== undefined && { status: input.status }),
  }
}

const OWN_SELECT =
  "id,owner_id,business_name,description,logo_path,region,commune,public_address,phone,whatsapp,opening_hours,status,created_at,updated_at"

export function validateSalvageYardLogo(file: File): string | null {
  if (!LOGO_EXTENSIONS[file.type])
    return "El logo debe ser una imagen JPEG, PNG o WebP."
  if (file.size > MAX_LOGO_SIZE) return "El logo no puede superar los 2 MB."
  return null
}

export async function getMySalvageYard(): Promise<SalvageYard | null> {
  const ownerId = await getAuthenticatedUserId()
  const { data, error } = await supabase
    .from("salvage_yards")
    .select(OWN_SELECT)
    .eq("owner_id", ownerId)
    .maybeSingle()

  if (error) {
    reportError("No se pudo cargar la desarmaduría propia.", error)
    throw new SalvageYardServiceError("No pudimos cargar tu desarmaduría.")
  }
  return data ? mapSalvageYard(data as SalvageYardRow) : null
}

export async function createSalvageYard(
  input: CreateSalvageYardInput,
): Promise<SalvageYard> {
  const ownerId = await getAuthenticatedUserId()
  const { data, error } = await supabase
    .from("salvage_yards")
    .insert({ owner_id: ownerId, ...toDatabaseInput(input) })
    .select(OWN_SELECT)
    .single()

  if (error) {
    reportError("No se pudo crear la desarmaduría.", error)
    throw new SalvageYardServiceError(
      error.code === "23505"
        ? "Ya tienes una desarmaduría registrada."
        : "No pudimos registrar la desarmaduría.",
    )
  }
  return mapSalvageYard(data as SalvageYardRow)
}

export async function updateMySalvageYard(
  input: UpdateSalvageYardInput,
): Promise<SalvageYard> {
  const ownerId = await getAuthenticatedUserId()
  const { data, error } = await supabase
    .from("salvage_yards")
    .update(toDatabaseInput(input))
    .eq("owner_id", ownerId)
    .select(OWN_SELECT)
    .single()

  if (error) {
    reportError("No se pudo actualizar la desarmaduría.", error)
    throw new SalvageYardServiceError("No pudimos guardar los cambios.")
  }
  return mapSalvageYard(data as SalvageYardRow)
}

export async function getPublicSalvageYard(
  salvageYardId: string,
): Promise<PublicSalvageYard | null> {
  const { data, error } = await supabase
    .rpc("get_public_salvage_yard", {
      target_salvage_yard_id: salvageYardId,
    })
    .maybeSingle()

  if (error) {
    reportError("No se pudo cargar la desarmaduría pública.", error)
    throw new SalvageYardServiceError("No pudimos cargar la desarmaduría.")
  }
  return data ? mapPublicSalvageYard(data as PublicSalvageYardRow) : null
}

export type PublicSalvageYardFilters = {
  region?: string
  commune?: string
}

export async function getPublicSalvageYards(
  filters: PublicSalvageYardFilters = {},
): Promise<PublicSalvageYard[]> {
  let query = supabase
    .from("salvage_yards")
    .select(
      "id,business_name,description,logo_path,region,commune,public_address,phone,whatsapp,opening_hours,created_at",
    )
    .order("created_at", { ascending: false })

  if (filters.region) query = query.eq("region", filters.region)
  if (filters.commune) query = query.eq("commune", filters.commune)

  const { data, error } = await query
  if (error) {
    reportError("No se pudo cargar el directorio de desarmadurías.", error)
    throw new SalvageYardServiceError("No pudimos cargar las desarmadurías.")
  }
  return ((data ?? []) as PublicSalvageYardRow[]).map(mapPublicSalvageYard)
}

export function getSalvageYardLogoPublicUrl(
  path: string | null,
): string | null {
  return getLogoPublicUrl(path)
}

export async function uploadSalvageYardLogo(
  salvageYardId: string,
  file: File,
): Promise<string> {
  const validationError = validateSalvageYardLogo(file)
  if (validationError) throw new SalvageYardServiceError(validationError)

  const extension = LOGO_EXTENSIONS[file.type]
  const path = `${salvageYardId}/logo/${crypto.randomUUID()}.${extension}`
  const { error } = await supabase.storage
    .from(SALVAGE_YARD_ASSETS_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    })

  if (error) {
    reportError("No se pudo subir el logo.", error)
    throw new SalvageYardServiceError("No pudimos subir el logo.")
  }
  return path
}

export async function deleteSalvageYardLogo(path: string): Promise<void> {
  const { error } = await supabase.storage
    .from(SALVAGE_YARD_ASSETS_BUCKET)
    .remove([path])
  if (error) {
    reportError("No se pudo eliminar el logo.", error)
    throw new SalvageYardServiceError("No pudimos eliminar el logo.")
  }
}
