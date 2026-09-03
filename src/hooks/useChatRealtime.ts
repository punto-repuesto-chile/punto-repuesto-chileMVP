import { useEffect } from "react"
import { supabase } from "../lib/supabase"

export function useChatRealtime(
  conversationId: string | null,
  onMessage: (payload: Record<string, unknown>) => void,
  onRefresh: () => void,
) {
  useEffect(() => {
    const channel = supabase
      .channel(conversationId ? `chat-${conversationId}` : "chat-inbox")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          ...(conversationId
            ? { filter: `conversation_id=eq.${conversationId}` }
            : {}),
        },
        (event) => onMessage(event.new as Record<string, unknown>),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversations" },
        () => onRefresh(),
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [conversationId, onMessage, onRefresh])
}
