import type {
  AuthChangeEvent,
  AuthError,
  Session,
  User,
} from "@supabase/supabase-js"

export type SignInCredentials = {
  email: string
  password: string
}

export type SignUpCredentials = SignInCredentials & {
  fullName: string
}

export type AuthActionResult = {
  error: AuthError | null
  session: Session | null
}

export type AuthContextValue = {
  user: User | null
  session: Session | null
  isAuthenticated: boolean
  isLoading: boolean
  authEvent: AuthChangeEvent | null
  signIn: (credentials: SignInCredentials) => Promise<AuthActionResult>
  signUp: (credentials: SignUpCredentials) => Promise<AuthActionResult>
  signOut: () => Promise<{ error: AuthError | null }>
}
