export type ModerationRole = "moderator" | "admin"

export type ModerationReportStatus = "pending" | "in_review" | "resolved" | "dismissed"

export type ModerationTargetType = "listing" | "review" | "listing_question"

export type ModerationActionType = "take_for_review" | "resolve" | "dismiss" | "hide_content" | "restore_content"

export type ContentModerationState = "none" | "hidden" | "restored"

export type ModerationJson = Record<string, unknown>

export type ModerationReportListItem = {
  id: string

  targetType: ModerationTargetType

  targetPart: "content" | "question" | "answer"

  targetId: string

  reason: string

  status: ModerationReportStatus

  createdAt: string

  updatedAt: string

  resolvedAt: string | null

  assignedTo: string | null

  reviewedAt: string | null

  hasDetails: boolean

  snapshotSummary: ModerationJson

  reporterId: string | null

  reporterDisplayName: string

  subjectUserId: string | null

  subjectDisplayName: string
}

export type ModerationReportPage = {
  reports: ModerationReportListItem[]

  totalCount: number
}

export type ModerationAction = {
  id: string

  moderatorId: string | null

  moderatorName: string

  action: ModerationActionType

  previousStatus: ModerationReportStatus | null

  newStatus: ModerationReportStatus | null

  note: string | null

  createdAt: string
  contentModerationId: string | null
  previousContentState: ContentModerationState | null
  newContentState: ContentModerationState | null
}

export type ModerationReportDetail = Omit<ModerationReportListItem, "hasDetails" | "snapshotSummary"> & {
  details: string | null

  targetSnapshot: ModerationJson

  targetExists: boolean

  currentTarget: ModerationJson | null

  actionHistory: ModerationAction[]
  moderationState: ContentModerationState
  moderationVersion: number
  moderationOriginReportId: string | null
  moderationHiddenAt: string | null
  moderationHiddenByName: string | null
  moderationId: string | null
}

export type HideReportTargetInput = {
  reportId: string
  expectedReportStatus: "pending" | "in_review"
  expectedModerationVersion?: number
  note?: string | null
}

export type RestoreReportTargetInput = {
  reportId: string
  expectedModerationVersion: number
  note?: string | null
}

export type ContentModerationUpdate = {
  reportId: string
  reportStatus: ModerationReportStatus
  moderationId: string
  moderationState: Exclude<ContentModerationState, "none">
  moderationVersion: number
}

export type GetModerationReportsInput = {
  status?: ModerationReportStatus | null

  targetType?: ModerationTargetType | null

  limit?: number

  offset?: number
}

export type UpdateModerationReportStatusInput = {
  reportId: string

  expectedStatus: ModerationReportStatus

  status: ModerationReportStatus

  note?: string | null
}

export type ModerationStatusUpdate = {
  reportId: string

  status: ModerationReportStatus

  assignedTo: string | null

  reviewedAt: string | null

  resolvedAt: string | null
}
