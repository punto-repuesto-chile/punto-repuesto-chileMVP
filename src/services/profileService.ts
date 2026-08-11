import { supabase } from "../lib/supabase"

const PROFILE_AVATARS_BUCKET = "profile-avatars"
export const PUBLIC_PROFILE_UPDATED_EVENT = "public-profile-updated"
const MAX_AVATAR_SIZE = 2 * 1024 * 1024
const AVATAR_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

export type MyPublicProfile = {
  id: string
  fullName: string
  displayName: string
  avatarPath: string | null
  region: string | null
  commune: string | null
}

export type SaveMyPublicProfileInput = {
  displayName: string
  region: string | null
  commune: string | null
  avatarFile: File | null
  removeAvatar: boolean
  currentAvatarPath: string | null
}

type MyPublicProfileRow = {
  id: string
  full_name: string
  public_display_name: string | null
  public_avatar_path: string | null
  public_region: string | null
  public_commune: string | null
}

export class ProfileServiceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ProfileServiceError"
  }
}

type ProfileErrorDetails = {
  code?: string
  message: string
}

function reportProfileError(context: string, error: ProfileErrorDetails): void {
  if (import.meta.env.DEV)
    console.error(context, { code: error.code, message: error.message })
}

function mapProfile(row: MyPublicProfileRow): MyPublicProfile {
  return {
    id: row.id,
    fullName: row.full_name,
    displayName: row.public_display_name ?? "",
    avatarPath: row.public_avatar_path,
    region: row.public_region,
    commune: row.public_commune,
  }
}

async function getAuthenticatedUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    if (error) reportProfileError("No se pudo validar la sesión.", error)
    throw new ProfileServiceError("Tu sesión ya no está disponible.")
  }
  return data.user.id
}

export function getProfileAvatarPublicUrl(path: string): string {
  return supabase.storage.from(PROFILE_AVATARS_BUCKET).getPublicUrl(path).data
    .publicUrl
}

export function validateAvatarFile(file: File): string | null {
  if (!AVATAR_EXTENSIONS[file.type])
    return "El avatar debe ser una imagen JPEG, PNG o WebP."
  if (file.size > MAX_AVATAR_SIZE) return "El avatar no puede superar los 2 MB."
  return null
}

export async function getMyPublicProfile(): Promise<MyPublicProfile> {
  const userId = await getAuthenticatedUserId()
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id,full_name,public_display_name,public_avatar_path,public_region,public_commune",
    )
    .eq("id", userId)
    .single()

  if (error) {
    reportProfileError("No se pudo cargar el perfil propio.", error)
    throw new ProfileServiceError("No pudimos cargar tu perfil.")
  }
  return mapProfile(data as MyPublicProfileRow)
}

export async function saveMyPublicProfile(
  input: SaveMyPublicProfileInput,
): Promise<MyPublicProfile> {
  const userId = await getAuthenticatedUserId()
  let nextAvatarPath = input.removeAvatar ? null : input.currentAvatarPath
  let uploadedAvatarPath: string | null = null

  if (input.avatarFile) {
    const validationError = validateAvatarFile(input.avatarFile)
    if (validationError) throw new ProfileServiceError(validationError)
    const extension = AVATAR_EXTENSIONS[input.avatarFile.type]
    uploadedAvatarPath = `${userId}/${crypto.randomUUID()}.${extension}`
    const { error } = await supabase.storage
      .from(PROFILE_AVATARS_BUCKET)
      .upload(uploadedAvatarPath, input.avatarFile, {
        cacheControl: "3600",
        contentType: input.avatarFile.type,
        upsert: false,
      })
    if (error) {
      reportProfileError("No se pudo subir el avatar.", error)
      throw new ProfileServiceError("No pudimos subir tu avatar.")
    }
    nextAvatarPath = uploadedAvatarPath
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      public_display_name: input.displayName.trim(),
      public_avatar_path: nextAvatarPath,
      public_region: input.region,
      public_commune: input.commune,
    })
    .eq("id", userId)
    .select(
      "id,full_name,public_display_name,public_avatar_path,public_region,public_commune",
    )
    .single()

  if (error) {
    if (uploadedAvatarPath)
      await supabase.storage
        .from(PROFILE_AVATARS_BUCKET)
        .remove([uploadedAvatarPath])
    reportProfileError("No se pudo guardar el perfil.", error)
    throw new ProfileServiceError("No pudimos guardar los cambios.")
  }

  if (input.currentAvatarPath && input.currentAvatarPath !== nextAvatarPath) {
    const { error: cleanupError } = await supabase.storage
      .from(PROFILE_AVATARS_BUCKET)
      .remove([input.currentAvatarPath])
    if (cleanupError)
      reportProfileError(
        "No se pudo eliminar el avatar anterior.",
        cleanupError,
      )
  }

  return mapProfile(data as MyPublicProfileRow)
}
