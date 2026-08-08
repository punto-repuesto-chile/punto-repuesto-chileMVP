function sanitizePhoneForWhatsapp(phone: string): string {
  const digits = phone.replace(/\D/g, "")

  if (digits.startsWith("56")) return digits

  if (digits.startsWith("9")) return `56${digits}`

  return digits
}

export default function SellerContactCard({
  name,

  phone,

  allowWhatsapp,
}: {
  name: string

  phone: string

  allowWhatsapp: boolean
}) {
  const whatsappPhone = sanitizePhoneForWhatsapp(phone)

  const telephonePhone = phone.replace(/[^\d+]/g, "")

  return (
    <aside className="rounded-2xl bg-petrol-dark p-5 text-white shadow-sm sm:p-6">
      <p className="text-xs font-bold uppercase tracking-wider text-orange">
        Vendedor
      </p>
      <h2 className="mt-2 font-display text-xl font-bold">{name}</h2>
      <p className="mt-2 text-sm text-white/65">{phone}</p>
      <div className="mt-5 grid gap-3">
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
