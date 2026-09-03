import { supabase } from "../lib/supabase"
import type {
  ChatMessage,
  ConversationContext,
  ChatSellerIdentityType,
  ChatSenderRole,
  ConversationPage,
  ConversationReference,
  ConversationSummary,
  MessagePage,
} from "../types/chat"

type ConversationContextRow = {
  conversation_id: string
  my_role: ChatSenderRole
  counterparty_type: ChatSellerIdentityType
  counterparty_public_id: string | null
  counterparty_name: string
  counterparty_avatar_path: string | null
  listing_id: string | null
  listing_title_snapshot: string
  listing_image_path_snapshot: string | null
  seller_identity_type: ChatSellerIdentityType
}

type ServiceErrorDetails = {
  code?: string
  message: string
}

type ConversationReferenceRow = {
  id: string
  seller_identity_type: ChatSellerIdentityType
  counterpart_display_name: string
  counterpart_avatar_path: string | null
  listing_title: string
  listing_image_path: string | null
  created_at: string
}

type ConversationSummaryRow = ConversationReferenceRow & {
  last_message_preview: string | null
  last_message_at: string | null
  unread: boolean
}

type ChatMessageRow = {
  id: string
  sender_role: ChatSenderRole
  body: string
  created_at: string
}

export class ChatServiceError extends Error {
  readonly code?: string

  constructor(message: string, code?: string) {
    super(message)
    this.name = "ChatServiceError"
    this.code = code
  }
}

function reportError(context: string, error: ServiceErrorDetails): void {
  if (import.meta.env.DEV)
    console.error(context, { code: error.code, message: error.message })
}

function throwChatError(
  context: string,
  fallbackMessage: string,
  error: ServiceErrorDetails,
): never {
  reportError(context, error)
  const detail = error.message.toLocaleLowerCase("es-CL")
  let message = fallbackMessage

  if (detail.includes("cooldown"))
    message = "Espera un momento antes de enviar otro mensaje."
  else if (detail.includes("cannot be empty"))
    message = "Escribe un mensaje antes de enviarlo."
  else if (detail.includes("3000"))
    message = "El mensaje no puede superar los 3000 caracteres."
  else if (detail.includes("cannot start") || detail.includes("themselves"))
    message = "No puedes iniciar una conversación en tu propia publicación."
  else if (detail.includes("not available"))
    message = "Esta publicación no está disponible para iniciar un chat."
  else if (
    error.code === "42501" ||
    detail.includes("authentication") ||
    detail.includes("not a participant")
  )
    message = "No tienes permiso para acceder a esta conversación."

  throw new ChatServiceError(message, error.code)
}

function mapConversationReference(
  row: ConversationReferenceRow,
): ConversationReference {
  return {
    id: row.id,
    sellerIdentityType: row.seller_identity_type,
    counterpartDisplayName: row.counterpart_display_name,
    counterpartAvatarPath: row.counterpart_avatar_path,
    listingTitle: row.listing_title,
    listingImagePath: row.listing_image_path,
    createdAt: row.created_at,
  }
}

function mapConversationSummary(
  row: ConversationSummaryRow,
): ConversationSummary {
  return {
    ...mapConversationReference(row),
    lastMessagePreview: row.last_message_preview,
    lastMessageAt: row.last_message_at,
    unread: row.unread,
  }
}

function mapChatMessage(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    senderRole: row.sender_role,
    body: row.body,
    createdAt: row.created_at,
  }
}

export async function getOrCreateConversation(
  listingId: string,
): Promise<ConversationReference> {
  const { data, error } = await supabase
    .rpc("get_or_create_conversation", { p_listing_id: listingId })
    .single()

  if (error)
    throwChatError(
      "No se pudo crear u obtener la conversación.",
      "No pudimos abrir la conversación.",
      error,
    )

  return mapConversationReference(data as ConversationReferenceRow)
}

export async function getConversationContext(
  conversationId: string,
): Promise<ConversationContext> {
  const { data, error } = await supabase
    .rpc("get_conversation_context", { p_conversation_id: conversationId })
    .single()

  if (error)
    throwChatError(
      "No se pudo cargar el contexto de la conversación.",
      "No pudimos abrir esta conversación.",
      error,
    )

  const row = data as ConversationContextRow
  return {
    id: row.conversation_id,
    myRole: row.my_role,
    counterpartyType: row.counterparty_type,
    counterpartyPublicId: row.counterparty_public_id,
    counterpartyName: row.counterparty_name,
    counterpartyAvatarPath: row.counterparty_avatar_path,
    listingId: row.listing_id,
    listingTitle: row.listing_title_snapshot,
    listingImagePath: row.listing_image_path_snapshot,
    sellerIdentityType: row.seller_identity_type,
  }
}

export function getChatAvatarPublicUrl(
  path: string,
  identityType: ChatSellerIdentityType,
): string {
  const bucket =
    identityType === "salvage_yard" ? "salvage-yard-assets" : "profile-avatars"
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

export function getChatListingImagePublicUrl(path: string): string {
  return supabase.storage.from("listing-images").getPublicUrl(path).data
    .publicUrl
}

export async function sendMessage(
  conversationId: string,
  body: string,
): Promise<ChatMessage> {
  const { data, error } = await supabase
    .rpc("send_message", {
      p_conversation_id: conversationId,
      p_body: body.trim(),
    })
    .single()

  if (error)
    throwChatError(
      "No se pudo enviar el mensaje.",
      "No pudimos enviar tu mensaje.",
      error,
    )

  return mapChatMessage(data as ChatMessageRow)
}

export async function getMyConversations(
  page: ConversationPage = {},
): Promise<ConversationSummary[]> {
  const { data, error } = await supabase.rpc("get_my_conversations", {
    p_limit: page.limit ?? 20,
    p_offset: page.offset ?? 0,
  })

  if (error)
    throwChatError(
      "No se pudieron cargar las conversaciones.",
      "No pudimos cargar tus conversaciones.",
      error,
    )

  return ((data ?? []) as ConversationSummaryRow[]).map(mapConversationSummary)
}

export async function getConversationMessages(
  conversationId: string,
  page: MessagePage = {},
): Promise<ChatMessage[]> {
  const { data, error } = await supabase.rpc("get_conversation_messages", {
    p_conversation_id: conversationId,
    p_before: page.before ?? null,
    p_limit: page.limit ?? 30,
  })

  if (error)
    throwChatError(
      "No se pudieron cargar los mensajes.",
      "No pudimos cargar los mensajes.",
      error,
    )

  return ((data ?? []) as ChatMessageRow[]).map(mapChatMessage)
}

export function mapRealtimeChatMessage(
  payload: Record<string, unknown>,
): ChatMessage | null {
  if (
    typeof payload.id !== "string" ||
    typeof payload.sender_role !== "string" ||
    typeof payload.body !== "string" ||
    typeof payload.created_at !== "string"
  )
    return null
  if (payload.sender_role !== "buyer" && payload.sender_role !== "seller")
    return null
  return {
    id: payload.id,
    senderRole: payload.sender_role,
    body: payload.body,
    createdAt: payload.created_at,
  }
}

export async function markConversationRead(
  conversationId: string,
): Promise<string> {
  const { data, error } = await supabase.rpc("mark_conversation_read", {
    p_conversation_id: conversationId,
  })

  if (error)
    throwChatError(
      "No se pudo marcar la conversación como leída.",
      "No pudimos actualizar la conversación.",
      error,
    )

  return data as string
}

export async function getUnreadConversationCount(): Promise<number> {
  const { data, error } = await supabase.rpc("get_unread_conversation_count")

  if (error)
    throwChatError(
      "No se pudo cargar el contador de conversaciones.",
      "No pudimos cargar tus mensajes pendientes.",
      error,
    )

  return Number(data ?? 0)
}
