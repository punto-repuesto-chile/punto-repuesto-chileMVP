import { Link } from "react-router-dom"

const QUICK_LINKS = [
  { label: "Inicio", to: "/" },

  { label: "Publicar producto", to: "/publicar" },

  { label: "Mis publicaciones", to: "/mis-publicaciones" },

  { label: "Cómo funciona", to: "/#como-funciona" },
]

const FAQ_ITEMS = [
  "¿Cómo publico un producto?",

  "¿Cómo contacto a un vendedor?",

  "¿Qué productos puedo vender?",

  "¿Las publicaciones son públicas?",
]

export default function SiteFooter() {
  return (
    <footer className="mt-16 bg-petrol-dark text-white sm:mt-24">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.35fr_0.8fr_1.1fr_1fr] lg:gap-12">
          <div>
            <Link to="/" className="inline-flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange text-sm font-extrabold">
                PR
              </span>
              <span className="font-display text-lg font-bold">
                Punto Repuesto Chile
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/60">
              El punto de encuentro para comprar y vender repuestos, accesorios
              y soluciones automotrices en todo Chile.
            </p>
          </div>

          <div>
            <h2 className="font-display text-sm font-bold">
              Navegación rápida
            </h2>
            <ul className="mt-4 space-y-3">
              {QUICK_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-sm text-white/60 transition hover:text-orange"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-display text-sm font-bold">
              Ayuda y preguntas
            </h2>
            <ul className="mt-4 space-y-3 text-sm text-white/60">
              {FAQ_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-display text-sm font-bold">Contacto</h2>
            <address className="mt-4 space-y-3 text-sm not-italic text-white/60">
              <p>
                <span className="block text-xs text-white/35">Email</span>
                <a
                  href="mailto:equipo.puntorepuesto@gmail.com"
                  className="break-all transition hover:text-orange"
                >
                  equipo.puntorepuesto@gmail.com
                </a>
              </p>
              <p>
                <span className="block text-xs text-white/35">Teléfono</span>
                Por definir
              </p>
              <p>
                <span className="block text-xs text-white/35">WhatsApp</span>
                Por definir
              </p>
              <p>
                <span className="block text-xs text-white/35">Ubicación</span>
                Santiago, Región Metropolitana, Chile
              </p>
            </address>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6 text-center text-xs text-white/40 sm:text-left">
          © {new Date().getFullYear()} Punto Repuesto Chile. Todos los derechos
          reservados.
        </div>
      </div>
    </footer>
  )
}
