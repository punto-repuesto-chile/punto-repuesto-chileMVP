export type ReportTargetType = "listing" | "review" | "listing_question"

export type ReportTargetPart = "content" | "question" | "answer"

export type ReportReason = "spam" | "fraud" | "prohibited_item" | "incorrect_information" | "offensive_content" | "harassment" | "personal_data" | "duplicate_content" | "off_topic" | "unrelated_to_transaction" | "other"

type ContentReportTarget = {
  targetType: "listing" | "review"
  targetId: string
  targetPart?: "content"
}

type QuestionReportTarget = {
  targetType: "listing_question"
  targetId: string
  targetPart: "question" | "answer"
}

export type ReportTarget = ContentReportTarget | QuestionReportTarget

export type CreateReportInput = ReportTarget & {
  reason: ReportReason
  details?: string | null
}
