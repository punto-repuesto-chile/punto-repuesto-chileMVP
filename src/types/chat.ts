export type ChatSellerIdentityType = "profile" | "salvage_yard"

export type ChatSenderRole = "buyer" | "seller"

export type ConversationSummary = {
  id: string
  counterpartDisplayName: string
  counterpartAvatarPath: string | null
  listingTitle: string
  listingImagePath: string | null
  lastMessagePreview: string | null
  lastMessageAt: string | null
  unread: boolean
  sellerIdentityType: ChatSellerIdentityType
  createdAt: string
}

export type ConversationReference = {
  id: string
  sellerIdentityType: ChatSellerIdentityType
  counterpartDisplayName: string
  counterpartAvatarPath: string | null
  listingTitle: string
  listingImagePath: string | null
  createdAt: string
}

export type ConversationContext = {
  id: string
  myRole: ChatSenderRole
  counterpartyType: ChatSellerIdentityType
  counterpartyPublicId: string | null
  counterpartyName: string
  counterpartyAvatarPath: string | null
  listingId: string | null
  listingTitle: string
  listingImagePath: string | null
  sellerIdentityType: ChatSellerIdentityType
}

export type ChatMessage = {
  id: string
  senderRole: ChatSenderRole
  body: string
  createdAt: string
}

export type ConversationPage = {
  limit?: number
  offset?: number
}

export type MessagePage = {
  before?: string | null
  limit?: number
}
