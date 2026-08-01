import { Link } from "react-router-dom"
import LoginForm from "../components/auth/LoginForm"

const BENEFITS = [
  "Publica repuestos y vehículos en pocos pasos",
  "Administra tus publicaciones desde un solo lugar",
  "Contacta directamente con compradores de todo Chile",
]

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-bg lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-petrol-dark p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full border-[55px] border-white/5" />
        <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-orange/10" />
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
        <div className="relative max-w-xl py-16">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange">
            Marketplace automotriz chileno
          </p>
          <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight xl:text-5xl">
            Encuentra, publica y vende repuestos de forma simple y segura.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-white/65">
            Tu cuenta reúne todo lo que necesitas para comprar y vender en Punto
            Repuesto Chile.
          </p>
          <ul className="mt-8 space-y-4">
            {BENEFITS.map((benefit) => (
              <li
                key={benefit}
                className="flex items-center gap-3 text-sm text-white/85"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green text-xs font-bold">
                  ✓
                </span>
                {benefit}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/40">
          Una experiencia clara, moderna y pensada para Chile.
        </p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-8 lg:py-12">
        <div className="w-full max-w-md">
          <div className="mb-7 flex items-center justify-between lg:hidden">
            <Link
              to="/"
              className="flex items-center gap-2"
              aria-label="Ir al inicio"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-petrol text-xs font-bold text-white">
                PR
              </span>
              <span className="font-display text-sm font-bold text-petrol-dark">
                Punto Repuesto <span className="text-orange">Chile</span>
              </span>
            </Link>
            <Link
              to="/"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-muted hover:bg-white"
            >
              ← Inicio
            </Link>
          </div>
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8">
            <Link
              to="/"
              className="mb-6 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-petrol transition hover:bg-bg focus:outline-none focus:ring-2 focus:ring-orange/30"
            >
              <span aria-hidden="true">←</span>
              Volver al inicio
            </Link>
            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-wider text-orange">
                Bienvenido
              </p>
              <h2 className="mt-2 font-display text-3xl font-extrabold text-petrol-dark">
                Inicia sesión
              </h2>
              <p className="mt-2 text-sm text-muted">
                Accede a tu cuenta de Punto Repuesto Chile
              </p>
            </div>
            <LoginForm />
          </div>
          <Link
            to="/"
            className="mx-auto mt-6 hidden w-fit text-sm font-semibold text-muted hover:text-petrol lg:block"
          >
            ← Volver a la página de inicio
          </Link>
        </div>
      </section>
    </main>
  )
}
