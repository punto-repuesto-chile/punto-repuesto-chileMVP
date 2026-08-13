import { useEffect, useState } from "react"
import { Link, Navigate, useNavigate } from "react-router-dom"
import SalvageYardForm from "../components/salvage/SalvageYardForm"
import { getMySalvageYard } from "../services/salvageYardService"
import type { SalvageYard } from "../types/salvageYard"

export default function RegisterSalvageYardPage() {
  const navigate = useNavigate()
  const [yard, setYard] = useState<SalvageYard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    void getMySalvageYard()
      .then(setYard)
      .catch((e) =>
        setError(
          e instanceof Error ? e.message : "No pudimos cargar la información.",
        ),
      )
      .finally(() => setLoading(false))
  }, [])
  if (loading)
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg">
        <p className="text-sm text-muted">Comprobando tu desarmaduría…</p>
      </main>
    )
  if (yard) return <Navigate to="/mi-desarmaduria" replace />
  return (
    <main className="min-h-screen bg-bg px-4 py-10 text-petrol-dark sm:px-6 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <Link
          to="/mi-perfil"
          className="text-sm font-semibold text-petrol hover:text-orange"
        >
          ← Volver a mi perfil
        </Link>
        <div className="mb-8 mt-8">
          <p className="text-xs font-bold uppercase tracking-wider text-orange">
            Cuenta comercial
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">
            Registra tu desarmaduría
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            Crea tu espacio comercial y completa los datos que verán tus
            compradores. Primero se guardará como borrador.
          </p>
        </div>
        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}
        <SalvageYardForm
          yard={null}
          onSaved={(saved) =>
            navigate(`/mi-desarmaduria`, {
              state: { created: saved.id },
              replace: true,
            })
          }
        />
      </div>
    </main>
  )
}
