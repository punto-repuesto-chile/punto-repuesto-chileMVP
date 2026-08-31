export type ReviewInteractionStatus = "pending" | "confirmed" | "rejected" | "expired"

export type ReviewInteractionAction = "confirm" | "reject"

export type ReviewInteractionDirection = "sent" | "received"

export type ReviewTargetType = "seller" | "salvage_yard"

export type ReviewStatus = "published" | "hidden" | "deleted"

export type ReviewInteractionResult = {
  id: string

  listingId: string | null

  status: ReviewInteractionStatus

  requestedAt: string | null

  confirmedAt: string | null

  expiresAt: string
}

export type ReviewInteractionListItem = {
  id: string

  listingId: string | null

  listingTitle: string | null

  direction: ReviewInteractionDirection

  targetType: ReviewTargetType

  status: ReviewInteractionStatus

  requestedAt: string

  confirmedAt: string | null

  expiresAt: string

  counterpartDisplayName: string

  counterpartAvatarPath: string | null
}

export type Review = {
  id: string

  interactionId: string

  rating: number

  comment: string | null

  status: ReviewStatus

  createdAt: string

  updatedAt: string
}

export type PublicReview = {
  id: string
  rating: number
  comment: string | null
  createdAt: string
  updatedAt?: string
  reviewerDisplayName: string
  reviewerAvatarPath: string | null
}

export type ReputationSummary = {
  averageRating: number | null

  reviewCount: number
}

export type PublicReviewsPage = {
  limit?: number
  offset?: number
}

export type ListingReviewsResult = {
  reviews: PublicReview[]
  totalCount: number
}
