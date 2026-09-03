import { supabase } from "../lib/supabase"
import type {
  GetModerationReportsInput,
  ModerationAction,
  ModerationJson,
  ModerationReportDetail,
  ModerationReportListItem,
  ModerationReportPage,
  ModerationReportStatus,
  ModerationRole,
  ModerationStatusUpdate,
  ModerationTargetType,
  UpdateModerationReportStatusInput,
} from "../types/moderation"

type ModerationErrorKind = "forbidden" | "conflict" | "not_found" | "invalid_transition" | "unknown"

type RpcError = {
  code?: string
  message: string
}

type ReportListRow = {
  id: string
  target_type: ModerationTargetType
  target_part: "content" | "question" | "answer"
  target_id: string
  reason: string
  status: ModerationReportStatus
  created_at: string
  updated_at: string
  resolved_at: string | null
  assigned_to: string | null
  reviewed_at: string | null
  has_details: boolean
  snapshot_summary: ModerationJson
  reporter_id: string | null
  reporter_display_name: string
  subject_user_id: string | null
  subject_display_name: string
  total_count: number
}

type ActionRow = {
  id: string
  moderator_id: string | null
  moderator_name: string
  action: ModerationAction["action"]
  previous_status: ModerationReportStatus | null
  new_status: ModerationReportStatus | null
  note: string | null
  created_at: string
}

type ReportDetailRow = Omit<ReportListRow, "has_details" | "snapshot_summary"> & {
  details: string | null
  target_snapshot: ModerationJson
  target_exists: boolean
  current_target: ModerationJson | null
  action_history: ActionRow[]
}

type StatusUpdateRow = {
  report_id: string
  status: ModerationReportStatus
  assigned_to: string | null
  reviewed_at: string | null
  resolved_at: string | null
}

export class ModerationServiceError extends Error {
  readonly kind: ModerationErrorKind
  readonly code?: string

  constructor(message: string, kind: ModerationErrorKind, code?: string) {
    super(message)
    this.name = "ModerationServiceError"
    this.kind = kind
    this.code = code
  }
}

function throwModerationError(error: RpcError): never {
  if (import.meta.env.DEV)
    console.error("Falló una operación de moderación.", {
      code: error.code,
      message: error.message,
    })

  const detail = error.message.toLocaleLowerCase("es-CL")

  if (error.code === "42501" || detail.includes("moderation access"))
    throw new ModerationServiceError(
      "No tienes permisos para acceder a moderación.",
      "forbidden",
      error.code,
    )

  if (detail.includes("status conflict"))
    throw new ModerationServiceError(
      "El reporte cambió mientras lo revisabas. Actualiza la bandeja.",
      "conflict",
      error.code,
    )

  if (error.code === "P0002" || detail.includes("not found"))
    throw new ModerationServiceError(
      "El reporte ya no está disponible.",
      "not_found",
      error.code,
    )

  if (detail.includes("invalid report status transition"))
    throw new ModerationServiceError(
      "Ese cambio de estado no está permitido.",
      "invalid_transition",
      error.code,
    )

  throw new ModerationServiceError(
    "No pudimos completar la operación de moderación.",
    "unknown",
    error.code,
  )
}

function mapListRow(row: ReportListRow): ModerationReportListItem {
  return {
    id: row.id,
    targetType: row.target_type,
    targetPart: row.target_part,
    targetId: row.target_id,
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at,
    assignedTo: row.assigned_to,
    reviewedAt: row.reviewed_at,
    hasDetails: row.has_details,
    snapshotSummary: row.snapshot_summary,
    reporterId: row.reporter_id,
    reporterDisplayName: row.reporter_display_name,
    subjectUserId: row.subject_user_id,
    subjectDisplayName: row.subject_display_name,
  }
}

function mapAction(row: ActionRow): ModerationAction {
  return {
    id: row.id,
    moderatorId: row.moderator_id,
    moderatorName: row.moderator_name,
    action: row.action,
    previousStatus: row.previous_status,
    newStatus: row.new_status,
    note: row.note,
    createdAt: row.created_at,
  }
}

export async function getMyModerationRole(): Promise<ModerationRole | null> {
  const { data, error } = await supabase.rpc("get_my_moderation_role")
  if (error) throwModerationError(error)
  if (data === null || data === "admin" || data === "moderator") return data
  throw new ModerationServiceError(
    "La respuesta de autorización no es válida.",
    "unknown",
  )
}

export async function getReports(
  input: GetModerationReportsInput = {},
): Promise<ModerationReportPage> {
  const { data, error } = await supabase.rpc("admin_get_reports", {
    p_status: input.status ?? null,
    p_target_type: input.targetType ?? null,
    p_limit: input.limit ?? 25,
    p_offset: input.offset ?? 0,
  })
  if (error) throwModerationError(error)

  const rows = (data ?? []) as ReportListRow[]
  return {
    reports: rows.map(mapListRow),
    totalCount: rows[0]?.total_count ?? 0,
  }
}

export async function getReport(
  reportId: string,
): Promise<ModerationReportDetail> {
  const { data, error } = await supabase
    .rpc("admin_get_report", { p_report_id: reportId })
    .single()
  if (error) throwModerationError(error)

  const row = data as ReportDetailRow
  return {
    ...mapListRow({
      ...row,
      has_details: row.details !== null,
      snapshot_summary: {},
    }),
    details: row.details,
    targetSnapshot: row.target_snapshot,
    targetExists: row.target_exists,
    currentTarget: row.current_target,
    actionHistory: row.action_history.map(mapAction),
  }
}

export async function updateReportStatus(
  input: UpdateModerationReportStatusInput,
): Promise<ModerationStatusUpdate> {
  const { data, error } = await supabase
    .rpc("admin_update_report_status", {
      p_report_id: input.reportId,
      p_expected_status: input.expectedStatus,
      p_status: input.status,
      p_note: input.note?.trim() || null,
    })
    .single()
  if (error) throwModerationError(error)

  const row = data as StatusUpdateRow
  return {
    reportId: row.report_id,
    status: row.status,
    assignedTo: row.assigned_to,
    reviewedAt: row.reviewed_at,
    resolvedAt: row.resolved_at,
  }
}
