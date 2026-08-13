import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js"
import { supabase } from "../lib/supabase"
import type {
  AuthContextValue,
  SignInCredentials,
  SignUpCredentials,
} from "../types/auth"

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authEvent, setAuthEvent] = useState<AuthChangeEvent | null>(null)

  useEffect(() => {
    let isMounted = true

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return
      if (error)
        console.error("No se pudo recuperar la sesión de Supabase.", error)
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setIsLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!isMounted) return
      setAuthEvent(event)
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setIsLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      isAuthenticated: session !== null,
      isLoading,
      authEvent,
      signIn: async ({ email, password }: SignInCredentials) => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        return { error, session: data.session }
      },
      signUp: async ({ fullName, email, password }: SignUpCredentials) => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        })
        return { error, session: data.session }
      },
      signOut: async () => {
        const { error } = await supabase.auth.signOut()
        if (!error) {
          setSession(null)
          setUser(null)
        }
        return { error }
      },
    }),
    [authEvent, isLoading, session, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context)
    throw new Error("useAuth debe utilizarse dentro de AuthProvider")
  return context
}
