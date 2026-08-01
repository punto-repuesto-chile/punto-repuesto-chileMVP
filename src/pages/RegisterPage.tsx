import { Link } from "react-router-dom"
import RegisterForm from "../components/auth/RegisterForm"

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-bg lg:grid lg:grid-cols-[0.9fr_1.1fr]">
      <section className="relative hidden overflow-hidden bg-petrol-dark p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full border-[55px] border-white/5" />
        <Link
          to="/"
          className="relative flex items-center gap-3"
          aria-label="Ir al inicio"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange text-sm font-extrabold">
            PR
          </span>
          <span className="font-display text-lg font-bold">
            Punto Repuesto Chile
          </span>
        </Link>
        <div className="relative max-w-lg">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange">
            Únete al marketplace
          </p>
          <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight">
            Crea tu cuenta y comienza a publicar.
          </h1>
          <p className="mt-5 text-white/65">
            Compra, vende y administra tus publicaciones desde un solo lugar.
          </p>
        </div>
        <p className="relative text-xs text-white/40">
          Una experiencia clara, moderna y pensada para Chile.
        </p>
      </section>
      <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-8 lg:py-12">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8">
            <Link
              to="/"
              className="mb-5 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-petrol hover:bg-bg"
            >
              ← Volver al inicio
            </Link>
            <p className="text-xs font-bold uppercase tracking-wider text-orange">
              Nueva cuenta
            </p>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-petrol-dark">
              Crear cuenta
            </h2>
            <p className="mb-6 mt-2 text-sm text-muted">
              Regístrate en Punto Repuesto Chile
            </p>
            <RegisterForm />
          </div>
        </div>
      </section>
    </main>
  )
}
