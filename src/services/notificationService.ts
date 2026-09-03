import { supabase } from "../lib/supabase"
import type {
  AppNotification,
  NotificationPage,
  NotificationType,
} from "../types/notification"

type NotificationRow = {
  id: string
  type: NotificationType
  title: string
  body: string | null
  entity_type: string | null
  entity_id: string | null
  action_path: string | null
  read_at: string | null
  created_at: string
}

function mapNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    entityType: row.entity_type,
    entityId: row.entity_id,
    actionPath: row.action_path,
    readAt: row.read_at,
    createdAt: row.created_at,
  }
}

function fail(message: string, error: { message: string }): never {
  if (import.meta.env.DEV) console.error(message, error.message)
  throw new Error(message)
}

export async function getMyNotifications(
  page: NotificationPage = {},
): Promise<AppNotification[]> {
  const { data, error } = await supabase.rpc("get_my_notifications", {
    p_limit: page.limit ?? 20,
    p_offset: page.offset ?? 0,
  })
  if (error) fail("No pudimos cargar tus notificaciones.", error)
  return ((data ?? []) as NotificationRow[]).map(mapNotification)
}

export async function getUnreadNotificationCount(): Promise<number> {
  const { data, error } = await supabase.rpc("get_unread_notification_count")
  if (error) fail("No pudimos cargar tus notificaciones pendientes.", error)
  return Number(data ?? 0)
}

export async function markNotificationRead(
  notificationId: string,
): Promise<string> {
  const { data, error } = await supabase.rpc("mark_notification_read", {
    p_notification_id: notificationId,
  })
  if (error) fail("No pudimos marcar la notificación como leída.", error)
  return data as string
}

export async function markAllNotificationsRead(): Promise<number> {
  const { data, error } = await supabase.rpc("mark_all_notifications_read")
  if (error) fail("No pudimos marcar las notificaciones como leídas.", error)
  return Number(data ?? 0)
}
