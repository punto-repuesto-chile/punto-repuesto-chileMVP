function sanitizePhoneForWhatsapp(phone: string): string {
  const digits = phone.replace(/\D/g, "")

  if (digits.startsWith("56")) return digits

  if (digits.startsWith("9")) return `56${digits}`

  return digits
}

type CommercialIdentity = {
  id: string
  businessName: string
}

export default function SellerContactCard({
  name,

  phone,

  allowWhatsapp,

  sellerId,

  salvageYard,
}: {
  name: string

  phone: string

  allowWhatsapp: boolean

  sellerId: string

  salvageYard?: CommercialIdentity | null
}) {
  const whatsappPhone = sanitizePhoneForWhatsapp(phone)

  const telephonePhone = phone.replace(/[^\d+]/g, "")

  return (
    <aside className="rounded-2xl bg-petrol-dark p-5 text-white shadow-sm sm:p-6">
      <p className="text-xs font-bold uppercase tracking-wider text-orange">
        {salvageYard ? "Publicado por" : "Vendedor"}
      </p>
      <h2 className="mt-2 font-display text-xl font-bold">
        {salvageYard?.businessName ?? name}
      </h2>
      {salvageYard && (
        <p className="mt-2 text-sm text-white/65">Contacto: {name}</p>
      )}
      <p className="mt-2 text-sm text-white/65">{phone}</p>
      <div className="mt-5 grid gap-3">
        <Link
          to={
            salvageYard
              ? `/desarmaduria/${salvageYard.id}`
              : `/vendedor/${sellerId}`
          }
          className="rounded-xl bg-orange px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-orange-dark"
        >
          {salvageYard ? "Ver desarmaduría" : "Ver perfil del vendedor"}
        </Link>
        {allowWhatsapp && whatsappPhone && (
          <a
            href={`https://wa.me/${whatsappPhone}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-green px-4 py-3 text-center text-sm font-bold text-white transition hover:brightness-110"
          >
            Contactar por WhatsApp
          </a>
        )}
        {telephonePhone && (
          <a
            href={`tel:${telephonePhone}`}
            className="rounded-xl border border-white/20 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-white/10"
          >
            Llamar
          </a>
        )}
      </div>
    </aside>
  )
}

import { Link } from "react-router-dom"
