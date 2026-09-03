export type ListingQuestionAnswererIdentityType = "profile" | "salvage_yard"

export type ListingQuestion = {
  id: string
  question: string
  createdAt: string
  updatedAt: string
  askerDisplayName: string
  askerAvatarPath: string | null
  answer: string | null
  answeredAt: string | null
  answerUpdatedAt: string | null
  answererIdentityType: ListingQuestionAnswererIdentityType | null
  answererDisplayName: string | null
  answererAvatarPath: string | null
}

export type ListingQuestionsPage = {
  questions: ListingQuestion[]
  totalCount: number
}

export type ListingQuestionPagination = {
  limit?: number
  offset?: number
}
