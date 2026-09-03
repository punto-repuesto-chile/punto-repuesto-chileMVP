export type NotificationType = "new_review" | "deal_confirmation_requested" | "deal_confirmed" | "deal_rejected" | "new_question" | "question_answered"

export type AppNotification = {
  id: string
  type: NotificationType
  title: string
  body: string | null
  entityType: string | null
  entityId: string | null
  actionPath: string | null
  readAt: string | null
  createdAt: string
}

export type NotificationPage = { limit?: number, offset?: number }
