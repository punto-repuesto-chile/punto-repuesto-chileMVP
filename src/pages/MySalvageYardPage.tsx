import { useEffect, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import SalvageYardForm from "../components/salvage/SalvageYardForm"
import { getMySalvageYard } from "../services/salvageYardService"
import type { SalvageYard } from "../types/salvageYard"

export default function MySalvageYardPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [yard, setYard] = useState<SalvageYard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    void getMySalvageYard()
      .then((value) => {
        if (active) setYard(value)
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof Error
              ? e.message
              : "No pudimos cargar tu desarmaduría.",
          )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])
  if (loading)
    return (
      <main className="min-h-screen bg-bg px-4 py-10">
        <div className="mx-auto max-w-4xl animate-pulse rounded-3xl border border-border bg-white p-8">
          <div className="h-8 w-64 rounded bg-slate-200" />
          <div className="mt-8 h-48 rounded bg-slate-200" />
        </div>
      </main>
    )
  if (!yard)
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg px-4">
        <div className="w-full max-w-lg rounded-3xl border border-border bg-white p-8 text-center shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-orange">
            Cuenta comercial
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold">
            Aún no tienes una desarmaduría registrada.
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Registra tu negocio para preparar tu identidad comercial.
          </p>
          <Link
            to="/registrar-desarmaduria"
            className="mt-6 inline-flex rounded-xl bg-orange px-5 py-3 text-sm font-bold text-white"
          >
            Registrar desarmaduría
          </Link>
          {error && <p className="mt-5 text-sm text-red-600">{error}</p>}
        </div>
      </main>
    )
  return (
    <main className="min-h-screen bg-bg px-4 py-10 text-petrol-dark sm:px-6 sm:py-14">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              to="/mi-perfil"
              className="text-sm font-semibold text-petrol hover:text-orange"
            >
              ← Mi perfil
            </Link>
            <p className="mt-8 text-xs font-bold uppercase tracking-wider text-orange">
              Administración comercial
            </p>
            <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">
              Mi desarmaduría
            </h1>
          </div>
          <span
            className={`w-fit rounded-full px-3 py-1.5 text-xs font-bold ${
              yard.status === "active"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {yard.status === "active" ? "Activa" : "Borrador"}
          </span>
        </div>
        {location.state?.created && (
          <div
            role="status"
            className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800"
          >
            Desarmaduría creada como borrador.
          </div>
        )}
        {yard.status === "draft" ? (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-bold">Tu desarmaduría está en borrador.</p>
            <p className="mt-1 leading-5">
              Completa al menos un teléfono o WhatsApp y activa la desarmaduría
              para hacerla pública y publicar como negocio.
            </p>
          </div>
        ) : (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <span>Tu desarmaduría está activa y visible públicamente.</span>
            <Link
              to={`/desarmaduria/${yard.id}`}
              className="font-bold underline underline-offset-2"
            >
              Ver perfil público
            </Link>
          </div>
        )}
        <div className="mt-8">
          <SalvageYardForm yard={yard} onSaved={setYard} />
        </div>
      </div>
    </main>
  )
}
