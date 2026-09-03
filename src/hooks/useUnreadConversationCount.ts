import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { getUnreadConversationCount } from "../services/chatService"

export default function useUnreadConversationCount(enabled: boolean) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!enabled) {
      setCount(0)
      return
    }
    let active = true
    const refresh = () =>
      void getUnreadConversationCount()
        .then((value) => active && setCount(value))
        .catch(() => {})
    refresh()
    const channel = supabase
      .channel("chat-unread-count")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversations" },
        refresh,
      )
      .subscribe()
    return () => {
      active = false
      void supabase.removeChannel(channel)
    }
  }, [enabled])
  return count
}
