import { supabase } from "../lib/supabase"

import type {
  PublicReview,
  PublicReviewsPage,
  ListingReviewsResult,
  ReputationSummary,
  Review,
  ReviewInteractionAction,
  ReviewInteractionDirection,
  ReviewInteractionListItem,
  ReviewInteractionResult,
  ReviewInteractionStatus,
  ReviewStatus,
  ReviewTargetType,
  ConversationDeal,
} from "../types/review"

type ConversationDealRow = {
  interaction_id: string | null
  status: ReviewInteractionStatus | null
  initiated_by_me: boolean | null
  my_role: "buyer" | "seller"
  both_messaged: boolean
  has_review: boolean | null
  expires_at: string | null
}

type ServiceErrorDetails = {
  code?: string

  message: string
}

type InteractionResultRow = {
  id: string

  listing_id?: string | null

  status: ReviewInteractionStatus

  requested_at?: string | null

  confirmed_at?: string | null

  expires_at: string
}

type InteractionListRow = {
  id: string

  listing_id: string | null

  listing_title: string | null

  direction: ReviewInteractionDirection

  target_type: ReviewTargetType

  status: ReviewInteractionStatus

  requested_at: string

  confirmed_at: string | null

  expires_at: string

  counterpart_display_name: string

  counterpart_avatar_path: string | null
}

type ReviewRow = {
  id: string

  interaction_id: string

  rating: number

  comment: string | null

  status: ReviewStatus

  created_at: string

  updated_at: string
}

type ReputationRow = {
  average_rating: number | string | null

  review_count: number | string
}

type PublicReviewRow = {
  id: string

  rating: number

  comment: string | null

  created_at: string

  updated_at?: string

  reviewer_display_name?: string

  reviewer_avatar_path?: string | null

  public_display_name?: string

  public_avatar_path?: string | null

  total_count?: number | string
}

export class ReviewServiceError extends Error {
  readonly code?: string

  constructor(message: string, code?: string) {
    super(message)

    this.name = "ReviewServiceError"

    this.code = code
  }
}

function reportError(context: string, error: ServiceErrorDetails): void {
  if (import.meta.env.DEV)
    console.error(context, { code: error.code, message: error.message })
}

function throwServiceError(
  context: string,

  publicMessage: string,

  error: ServiceErrorDetails,
): never {
  reportError(context, error)

  const detail = error.message.toLocaleLowerCase("es-CL")

  let message = publicMessage

  if (error.code === "23505" || detail.includes("already exists"))
    message = "Ya tienes una solicitud activa para esta publicación."
  else if (detail.includes("review edit window has expired"))
    message = "El plazo de 30 minutos para editar esta reseña ya terminó."
  else if (detail.includes("expired") || detail.includes("expir"))
    message = "Esta solicitud ya expiró."
  else if (
    error.code === "42501" ||
    detail.includes("permission") ||
    detail.includes("authentication") ||
    detail.includes("does not belong")
  )
    message = "No tienes permiso para realizar esta acción."
  else if (detail.includes("confirmed interaction is required"))
    message =
      "El vendedor debe confirmar el trato antes de que puedas calificar."

  throw new ReviewServiceError(message, error.code)
}

function mapInteractionResult(
  row: InteractionResultRow,
): ReviewInteractionResult {
  return {
    id: row.id,

    listingId: row.listing_id ?? null,

    status: row.status,

    requestedAt: row.requested_at ?? null,

    confirmedAt: row.confirmed_at ?? null,

    expiresAt: row.expires_at,
  }
}

function mapInteractionListItem(
  row: InteractionListRow,
): ReviewInteractionListItem {
  return {
    id: row.id,

    listingId: row.listing_id,

    listingTitle: row.listing_title,

    direction: row.direction,

    targetType: row.target_type,

    status: row.status,

    requestedAt: row.requested_at,

    confirmedAt: row.confirmed_at,

    expiresAt: row.expires_at,

    counterpartDisplayName: row.counterpart_display_name,

    counterpartAvatarPath: row.counterpart_avatar_path,
  }
}

function mapReview(row: ReviewRow): Review {
  return {
    id: row.id,

    interactionId: row.interaction_id,

    rating: row.rating,

    comment: row.comment,

    status: row.status,

    createdAt: row.created_at,

    updatedAt: row.updated_at,
  }
}

function mapPublicReview(row: PublicReviewRow): PublicReview {
  return {
    id: row.id,

    rating: row.rating,

    comment: row.comment,

    createdAt: row.created_at,

    updatedAt: row.updated_at,

    reviewerDisplayName:
      row.reviewer_display_name ?? row.public_display_name ?? "Usuario",

    reviewerAvatarPath:
      row.reviewer_avatar_path ?? row.public_avatar_path ?? null,
  }
}

function normalizeComment(comment: string | null | undefined): string | null {
  if (comment === null || comment === undefined) return null

  return comment.trim()
}

async function getMyReviewInteractions(
  direction: ReviewInteractionDirection,
): Promise<ReviewInteractionListItem[]> {
  const { data, error } = await supabase.rpc("get_my_review_interactions", {
    p_direction: direction,
  })

  if (error)
    throwServiceError(
      "No se pudieron cargar las interacciones de reseña.",

      "No pudimos cargar tus solicitudes de trato.",

      error,
    )

  return ((data ?? []) as InteractionListRow[]).map(mapInteractionListItem)
}

async function getReputation(
  rpcName: "get_seller_reputation" | "get_salvage_yard_reputation",

  parameters: { p_seller_id: string } | { p_salvage_yard_id: string },
): Promise<ReputationSummary> {
  const { data, error } = await supabase.rpc(rpcName, parameters).single()

  if (error)
    throwServiceError(
      "No se pudo cargar el resumen de reputación.",

      "No pudimos cargar la reputación.",

      error,
    )

  const row = data as ReputationRow

  return {
    averageRating:
      row.average_rating === null ? null : Number(row.average_rating),

    reviewCount: Number(row.review_count),
  }
}

async function getPublicReviews(
  rpcName: "get_seller_reviews" | "get_salvage_yard_reviews",

  targetParameters: { p_seller_id: string } | { p_salvage_yard_id: string },

  page: PublicReviewsPage,
): Promise<PublicReview[]> {
  const { data, error } = await supabase.rpc(rpcName, {
    ...targetParameters,

    p_limit: page.limit ?? 10,

    p_offset: page.offset ?? 0,
  })

  if (error)
    throwServiceError(
      "No se pudieron cargar las reseñas públicas.",

      "No pudimos cargar las reseñas.",

      error,
    )

  return ((data ?? []) as PublicReviewRow[]).map(mapPublicReview)
}

export async function requestReviewInteraction(
  listingId: string,
): Promise<ReviewInteractionResult> {
  const { data, error } = await supabase

    .rpc("request_review_interaction", { p_listing_id: listingId })

    .single()

  if (error)
    throwServiceError(
      "No se pudo solicitar la confirmación de trato.",

      "No pudimos enviar la solicitud de trato.",

      error,
    )

  return mapInteractionResult(data as InteractionResultRow)
}

export async function getConversationDeal(
  conversationId: string,
): Promise<ConversationDeal> {
  const { data, error } = await supabase
    .rpc("get_conversation_deal", { p_conversation_id: conversationId })
    .single()
  if (error)
    throwServiceError(
      "No se pudo cargar el estado del trato.",
      "No pudimos cargar el estado del trato.",
      error,
    )
  const row = data as ConversationDealRow
  return {
    interactionId: row.interaction_id,
    status: row.status,
    initiatedByMe: row.initiated_by_me === true,
    myRole: row.my_role,
    bothMessaged: row.both_messaged,
    hasReview: row.has_review === true,
    expiresAt: row.expires_at,
  }
}

export async function proposeDeal(conversationId: string): Promise<string> {
  const { data, error } = await supabase.rpc("propose_deal", {
    p_conversation_id: conversationId,
  })
  if (error)
    throwServiceError(
      "No se pudo proponer el trato.",
      error.message.includes("both participants")
        ? "Ambas personas deben enviar al menos un mensaje antes de proponer un trato."
        : "No pudimos proponer el trato.",
      error,
    )
  return data as string
}

export async function respondDeal(
  interactionId: string,
  action: ReviewInteractionAction,
): Promise<ReviewInteractionStatus> {
  const { data, error } = await supabase.rpc("respond_deal", {
    p_interaction_id: interactionId,
    p_action: action,
  })
  if (error)
    throwServiceError(
      "No se pudo responder al trato.",
      "No pudimos actualizar el trato.",
      error,
    )
  return data as ReviewInteractionStatus
}

export async function respondReviewInteraction(
  interactionId: string,

  action: ReviewInteractionAction,
): Promise<ReviewInteractionResult> {
  const { data, error } = await supabase

    .rpc("respond_review_interaction", {
      p_interaction_id: interactionId,

      p_action: action,
    })

    .single()

  if (error)
    throwServiceError(
      "No se pudo responder la solicitud de trato.",

      "No pudimos actualizar la solicitud de trato.",

      error,
    )

  return mapInteractionResult(data as InteractionResultRow)
}

export function getMySentReviewInteractions(): Promise<ReviewInteractionListItem[]> {
  return getMyReviewInteractions("sent")
}

export function getMyReceivedReviewInteractions(): Promise<ReviewInteractionListItem[]> {
  return getMyReviewInteractions("received")
}

export async function createReview(
  interactionId: string,

  rating: number,

  comment?: string | null,
): Promise<Review> {
  const { data, error } = await supabase

    .rpc("create_review_from_interaction", {
      p_interaction_id: interactionId,

      p_rating: rating,

      p_comment: normalizeComment(comment),
    })

    .single()

  if (error)
    throwServiceError(
      "No se pudo crear la reseña.",

      "No pudimos publicar tu reseña.",

      error,
    )

  return mapReview(data as ReviewRow)
}

export async function updateReview(
  reviewId: string,

  rating: number,

  comment?: string | null,
): Promise<Review> {
  const { data, error } = await supabase

    .rpc("update_own_review", {
      p_review_id: reviewId,

      p_rating: rating,

      p_comment: normalizeComment(comment),
    })

    .single()

  if (error)
    throwServiceError(
      "No se pudo actualizar la reseña.",

      "No pudimos guardar los cambios de tu reseña.",

      error,
    )

  return mapReview(data as ReviewRow)
}

export async function deleteReview(reviewId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("delete_own_review", {
    p_review_id: reviewId,
  })

  if (error)
    throwServiceError(
      "No se pudo eliminar la reseña.",

      "No pudimos eliminar tu reseña.",

      error,
    )

  return data === true
}

export async function getMyReviews(): Promise<Review[]> {
  const { data, error } = await supabase

    .from("reviews")

    .select("id,interaction_id,rating,comment,status,created_at,updated_at")

    .order("created_at", { ascending: false })

  if (error)
    throwServiceError(
      "No se pudieron cargar tus reseñas.",

      "No pudimos cargar tus reseñas.",

      error,
    )

  return ((data ?? []) as ReviewRow[]).map(mapReview)
}

export function getSellerReputation(
  sellerId: string,
): Promise<ReputationSummary> {
  return getReputation("get_seller_reputation", { p_seller_id: sellerId })
}

export function getSalvageYardReputation(
  salvageYardId: string,
): Promise<ReputationSummary> {
  return getReputation("get_salvage_yard_reputation", {
    p_salvage_yard_id: salvageYardId,
  })
}

export function getSellerReviews(
  sellerId: string,

  page: PublicReviewsPage = {},
): Promise<PublicReview[]> {
  return getPublicReviews("get_seller_reviews", { p_seller_id: sellerId }, page)
}

export function getSalvageYardReviews(
  salvageYardId: string,

  page: PublicReviewsPage = {},
): Promise<PublicReview[]> {
  return getPublicReviews(
    "get_salvage_yard_reviews",

    { p_salvage_yard_id: salvageYardId },

    page,
  )
}

export async function getListingReviews(
  listingId: string,

  page: PublicReviewsPage = {},
): Promise<ListingReviewsResult> {
  const { data, error } = await supabase.rpc("get_listing_reviews", {
    p_listing_id: listingId,

    p_limit: page.limit ?? 10,

    p_offset: page.offset ?? 0,
  })

  if (error)
    throwServiceError(
      "No se pudieron cargar las reseñas de la publicación.",

      "No pudimos cargar las reseñas de esta publicación.",

      error,
    )

  const rows = (data ?? []) as PublicReviewRow[]

  return {
    reviews: rows.map(mapPublicReview),

    totalCount: rows.length === 0 ? 0 : Number(rows[0].total_count ?? 0),
  }
}
