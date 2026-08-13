import { useEffect, useRef, useState } from "react"

import { Link, useNavigate } from "react-router-dom"

import {
  MotionConfig,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "motion/react"

import {
  cardEntrance,
  fadeDown,
  fadeUp,
  heroItem,
  imageEntrance,
  staggerFast,
  staggerHeader,
  viewportOnce,
} from "./animations/variants"

import { StaggerGroup } from "./components/animation/Reveal"

import PublicListingCard from "./components/listings/PublicListingCard"

import PublicListingsSkeleton from "./components/listings/PublicListingsSkeleton"

import {
  LISTING_CATEGORY_VALUES,
  PARTS_MENU_CATEGORIES,
  categorySearchUrl,
} from "./constants/listingCategories"

import { useAuth } from "./context/AuthContext"

import { useFavorites } from "./context/FavoritesContext"

import { DESARMADURAS, type Desarmaduria } from "./data/marketplace"

import {
  getMyPublicProfile,
  getProfileAvatarPublicUrl,
  PUBLIC_PROFILE_UPDATED_EVENT,
  type MyPublicProfile,
} from "./services/profileService"

import {
  getPublicListingFilterOptions,
  getPublishedListings,
  type PublicListingCard as PublicListingCardData,
  type PublicListingFilterOptions,
  type PublicListingType,
} from "./services/publicListingService"

function usePublishedListingSection(
  listingTypes: PublicListingType[],

  limit: number,
) {
  const [listings, setListings] = useState<PublicListingCardData[]>([])

  const [isLoading, setIsLoading] = useState(true)

  const [error, setError] = useState<string | null>(null)

  const [requestNumber, setRequestNumber] = useState(0)

  useEffect(() => {
    let active = true

    setIsLoading(true)

    setError(null)

    void getPublishedListings({ listingTypes, limit })

      .then((result) => {
        if (active) setListings(result)
      })

      .catch((requestError: unknown) => {
        if (!active) return

        setError(
          requestError instanceof Error
            ? requestError.message
            : "No pudimos cargar estas publicaciones.",
        )
      })

      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [limit, requestNumber])

  return {
    listings,

    isLoading,

    error,

    retry: () => setRequestNumber((current) => current + 1),
  }
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconSearch() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}

function IconHeart({ filled = false }: { filled?: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

function IconChevronRight() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

function IconChevronDown() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

function IconMenu() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

function IconX() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function IconShield() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function IconMapPin() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function IconStar() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

// ─── Category icons ────────────────────────────────────────────────────────────

function CatEngine() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <line x1="12" y1="12" x2="12" y2="16" />
      <line x1="10" y1="14" x2="14" y2="14" />
    </svg>
  )
}

function CatBody() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-2" />
      <circle cx="7.5" cy="17.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  )
}

function CatSuspension() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22V12" />
      <path d="m9 9 3 3 3-3" />
      <path d="M12 12C12 8 8 6 8 3" />
      <path d="M12 12c0-4 4-6 4-9" />
    </svg>
  )
}

function CatBrakes() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="8" />
      <line x1="12" y1="16" x2="12" y2="22" />
      <line x1="2" y1="12" x2="8" y2="12" />
      <line x1="16" y1="12" x2="22" y2="12" />
    </svg>
  )
}

function CatElectric() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

function CatTires() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function CatAccessories() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  )
}

function CatVehicles() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 17H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h8l4 4h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2z" />
      <circle cx="7.5" cy="17.5" r="1.5" />
      <circle cx="16.5" cy="17.5" r="1.5" />
    </svg>
  )
}

// ─── Step icons ────────────────────────────────────────────────────────────────

function IconBookOpen() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  )
}

function IconScale() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1z" />
      <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1z" />
      <path d="M7 21h10" />
      <line x1="12" y1="3" x2="12" y2="21" />
      <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
    </svg>
  )
}

function IconMessageCircle() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" />
    </svg>
  )
}

// ─── Social icons ──────────────────────────────────────────────────────────────

function IconFacebook() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}

function IconInstagram() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

function IconTwitter() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.736l7.73-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function Badge({
  label,

  variant = "new",
}: {
  label: string

  variant?: "new" | "used" | "verified" | "company"
}) {
  const styles: Record<string, string> = {
    new: "bg-emerald-50 text-emerald-700 border border-emerald-200",

    used: "bg-amber-50 text-amber-700 border border-amber-200",

    verified: "text-white",

    company: "text-white",
  }

  if (variant === "verified") {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
        style={{ background: "#16835D" }}
      >
        <IconCheck /> Vendedor verificado
      </span>
    )
  }

  if (variant === "company") {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
        style={{ background: "#16835D" }}
      >
        <IconCheck /> Empresa verificada
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${styles[variant]}`}
    >
      {label}
    </span>
  )
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  const [partsMenuOpen, setPartsMenuOpen] = useState(false)

  const [mobilePartsOpen, setMobilePartsOpen] = useState(false)

  const partsMenuRef = useRef<HTMLDivElement>(null)

  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const [authNotice, setAuthNotice] = useState("")

  const [isScrolled, setIsScrolled] = useState(false)

  const { user, signOut } = useAuth()

  const [ownProfile, setOwnProfile] = useState<MyPublicProfile | null>(null)

  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false)

  const { favoriteListingIds, isLoading: favoritesLoading } = useFavorites()

  const navigate = useNavigate()

  const { scrollY } = useScroll()

  useEffect(() => {
    let active = true

    const handleProfileUpdate = (event: Event) => {
      const profileEvent = event as CustomEvent<MyPublicProfile>

      setOwnProfile(profileEvent.detail)
    }

    window.addEventListener(PUBLIC_PROFILE_UPDATED_EVENT, handleProfileUpdate)

    if (!user) setOwnProfile(null)
    else
      void getMyPublicProfile()

        .then((profile) => {
          if (active) setOwnProfile(profile)
        })

        .catch((error: unknown) => {
          if (import.meta.env.DEV)
            console.error(
              "No se pudo cargar el perfil del Header.",

              error instanceof Error ? error.message : "Error desconocido",
            )
        })

    return () => {
      active = false

      window.removeEventListener(
        PUBLIC_PROFILE_UPDATED_EVENT,

        handleProfileUpdate,
      )
    }
  }, [user])

  useEffect(() => setAvatarLoadFailed(false), [ownProfile?.avatarPath])

  const metadataName = user?.user_metadata.full_name

  const displayName =
    ownProfile?.displayName.trim() ||
    ownProfile?.fullName.trim() ||
    (typeof metadataName === "string" && metadataName.trim()
      ? metadataName.trim()
      : (user?.email ?? "Usuario"))

  const publicAvatarUrl =
    ownProfile?.avatarPath && !avatarLoadFailed
      ? getProfileAvatarPublicUrl(ownProfile.avatarPath)
      : null

  const initials = displayName

    .split(/\s+/)

    .slice(0, 2)

    .map((part) => part[0]?.toUpperCase())

    .join("")

  useMotionValueEvent(scrollY, "change", (latest) => setIsScrolled(latest > 24))

  const links = [
    { label: "Vehículos", to: "/buscar?tipo=vehicle" },

    { label: "Desarmadurías", href: "#" },

    { label: "Cómo funciona", href: "#" },
  ]

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!partsMenuRef.current?.contains(event.target as Node))
        setPartsMenuOpen(false)
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return

      setPartsMenuOpen(false)

      setMobilePartsOpen(false)
    }

    document.addEventListener("mousedown", closeOnOutsideClick)

    document.addEventListener("keydown", closeOnEscape)

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick)

      document.removeEventListener("keydown", closeOnEscape)
    }
  }, [])

  const showComingSoon = (label: string) => {
    setAuthNotice(`${label} estará disponible próximamente.`)

    setUserMenuOpen(false)
  }

  const handleLogout = async () => {
    const { error } = await signOut()

    if (error) {
      setAuthNotice("No fue posible cerrar la sesión. Inténtalo nuevamente.")

      return
    }

    setUserMenuOpen(false)

    setMobileOpen(false)

    setAuthNotice("Sesión cerrada correctamente.")

    navigate("/")
  }

  return (
    <motion.header
      initial="hidden"
      animate="visible"
      variants={staggerHeader}
      className={`sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur-sm transition-[box-shadow,background-color] duration-300 ${
        isScrolled ? "shadow-md" : "shadow-sm"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`flex items-center justify-between transition-[height] duration-300 ${
            isScrolled ? "h-14" : "h-16"
          }`}
        >
          {/* Logo */}
          <motion.div
            variants={fadeDown}
            className="flex items-center gap-2 flex-shrink-0"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "#123B4A" }}
            >
              <span className="text-white text-xs font-bold">PR</span>
            </div>
            <span
              className="font-bold text-base leading-tight"
              style={{ fontFamily: "Manrope, sans-serif", color: "#102A36" }}
            >
              Punto Repuesto
              <br />
              <span style={{ color: "#F97316" }}>Chile</span>
            </span>
          </motion.div>

          {/* Desktop nav */}
          <motion.nav
            variants={staggerHeader}
            className="hidden md:flex items-center gap-6"
          >
            <motion.div
              ref={partsMenuRef}
              variants={fadeDown}
              className="relative"
              onMouseEnter={() => setPartsMenuOpen(true)}
              onMouseLeave={() => setPartsMenuOpen(false)}
            >
              <button
                type="button"
                aria-expanded={partsMenuOpen}
                aria-haspopup="menu"
                onClick={() => setPartsMenuOpen(true)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" ||
                    event.key === " " ||
                    event.key === "ArrowDown"
                  )
                    setPartsMenuOpen(true)
                }}
                className="flex items-center gap-1 text-sm font-medium transition-colors hover:opacity-80"
                style={{ color: "#102A36" }}
              >
                Repuestos
                <span
                  className={`transition-transform ${
                    partsMenuOpen ? "rotate-180" : ""
                  }`}
                >
                  <IconChevronDown />
                </span>
              </button>
              {partsMenuOpen && (
                <div
                  role="menu"
                  aria-label="Categorías de repuestos"
                  className="absolute left-1/2 top-full z-50 w-[min(720px,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-border bg-white p-5 shadow-xl"
                >
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">
                    Buscar repuestos por categoría
                  </p>
                  <div className="grid grid-cols-3 gap-1">
                    {PARTS_MENU_CATEGORIES.map((category) => (
                      <Link
                        key={category.value}
                        role="menuitem"
                        to={categorySearchUrl(category.value)}
                        onClick={() => setPartsMenuOpen(false)}
                        className="rounded-lg px-3 py-2 text-sm font-medium text-petrol-dark transition-colors hover:bg-bg hover:text-orange"
                      >
                        {category.label}
                      </Link>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                    <Link
                      role="menuitem"
                      to="/buscar?tipo=part"
                      onClick={() => setPartsMenuOpen(false)}
                      className="text-sm font-bold text-petrol hover:text-orange"
                    >
                      Ver todos los repuestos →
                    </Link>
                    <Link
                      role="menuitem"
                      to="/buscar?tipo=accessory"
                      onClick={() => setPartsMenuOpen(false)}
                      className="text-sm font-semibold text-muted hover:text-orange"
                    >
                      Accesorios
                    </Link>
                  </div>
                </div>
              )}
            </motion.div>
            {links.map((link) =>
              link.to ? (
                <motion.div variants={fadeDown} key={link.label}>
                  <Link
                    to={link.to}
                    className="text-sm font-medium transition-colors hover:opacity-80"
                    style={{ color: "#102A36" }}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ) : (
                <motion.a
                  variants={fadeDown}
                  key={link.label}
                  href={link.href}
                  className="text-sm font-medium transition-colors hover:opacity-80"
                  style={{ color: "#102A36" }}
                >
                  {link.label}
                </motion.a>
              ),
            )}
          </motion.nav>

          {/* Desktop actions */}
          <motion.div
            variants={fadeDown}
            className="hidden md:flex items-center gap-3"
          >
            <Link
              to={user ? "/favoritos" : "/login"}
              state={user ? undefined : { from: "/", reason: "favorite" }}
              aria-label={
                user ? "Ver favoritos" : "Inicia sesión para ver favoritos"
              }
              className="relative p-2 rounded-lg transition-colors hover:bg-gray-100"
              style={{ color: "#64757D" }}
            >
              <IconHeart />
              {user && !favoritesLoading && favoriteListingIds.size > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-white text-xs flex items-center justify-center"
                  style={{ background: "#F97316", fontSize: "10px" }}
                >
                  {favoriteListingIds.size > 9 ? "9+" : favoriteListingIds.size}
                </span>
              )}
            </Link>
            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((current) => !current)}
                  aria-expanded={userMenuOpen}
                  aria-haspopup="menu"
                  className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-semibold text-petrol-dark hover:bg-bg"
                >
                  {publicAvatarUrl ? (
                    <img
                      src={publicAvatarUrl}
                      alt=""
                      onError={() => setAvatarLoadFailed(true)}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-petrol text-xs font-bold text-white">
                      {initials}
                    </span>
                  )}
                  <span className="hidden lg:block">{displayName}</span>
                  <IconChevronDown />
                </button>
                {userMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-12 w-52 rounded-xl border border-border bg-white p-2 shadow-lg"
                  >
                    <Link
                      role="menuitem"
                      to="/mi-perfil"
                      onClick={() => setUserMenuOpen(false)}
                      className="block w-full rounded-lg px-3 py-2 text-left text-sm text-petrol-dark hover:bg-bg"
                    >
                      Mi perfil
                    </Link>
                    <Link
                      role="menuitem"
                      to="/mis-publicaciones"
                      onClick={() => setUserMenuOpen(false)}
                      className="block w-full rounded-lg px-3 py-2 text-left text-sm text-petrol-dark hover:bg-bg"
                    >
                      Mis publicaciones
                    </Link>
                    <Link
                      role="menuitem"
                      to="/mi-desarmaduria"
                      onClick={() => setUserMenuOpen(false)}
                      className="block w-full rounded-lg px-3 py-2 text-left text-sm text-petrol-dark hover:bg-bg"
                    >
                      Mi desarmaduría
                    </Link>
                    <Link
                      role="menuitem"
                      to="/favoritos"
                      onClick={() => setUserMenuOpen(false)}
                      className="block w-full rounded-lg px-3 py-2 text-left text-sm text-petrol-dark hover:bg-bg"
                    >
                      Favoritos
                    </Link>
                    <Link
                      role="menuitem"
                      to="/publicar"
                      onClick={() => setUserMenuOpen(false)}
                      className="block rounded-lg px-3 py-2 text-sm text-petrol-dark hover:bg-bg"
                    >
                      Publicar producto
                    </Link>
                    <div className="my-1 h-px bg-border" />
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
                    >
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/registro"
                  className="text-sm font-medium text-muted hover:text-petrol"
                >
                  Registrarse
                </Link>
                <Link to="/login" className="text-sm font-medium text-petrol">
                  Iniciar sesión
                </Link>
              </div>
            )}
            <Link
              to="/publicar"
              className="publish-button px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 active:opacity-80"
              style={{ background: "#F97316" }}
            >
              Publicar
            </Link>
          </motion.div>

          {/* Mobile hamburger */}
          <button
            type="button"
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={mobileOpen}
            className="md:hidden p-2 rounded-lg"
            style={{ color: "#102A36" }}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <IconX /> : <IconMenu />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div
            className="md:hidden py-4 border-t"
            style={{ borderColor: "#DCE3E6" }}
          >
            <nav className="flex flex-col gap-1 mb-4">
              <button
                type="button"
                aria-expanded={mobilePartsOpen}
                aria-controls="mobile-parts-menu"
                onClick={() => setMobilePartsOpen((current) => !current)}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-petrol-dark"
              >
                Repuestos
                <span
                  className={`transition-transform ${
                    mobilePartsOpen ? "rotate-180" : ""
                  }`}
                >
                  <IconChevronDown />
                </span>
              </button>
              {mobilePartsOpen && (
                <div
                  id="mobile-parts-menu"
                  className="mx-3 mb-2 grid grid-cols-1 gap-1 border-l-2 border-orange/30 pl-3"
                >
                  {PARTS_MENU_CATEGORIES.map((category) => (
                    <Link
                      key={category.value}
                      to={categorySearchUrl(category.value)}
                      onClick={() => {
                        setMobilePartsOpen(false)

                        setMobileOpen(false)
                      }}
                      className="rounded-lg px-2 py-2 text-sm text-petrol-dark hover:bg-bg"
                    >
                      {category.label}
                    </Link>
                  ))}
                  <Link
                    to="/buscar?tipo=part"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-2 py-2 text-sm font-bold text-petrol"
                  >
                    Ver todos los repuestos
                  </Link>
                  <Link
                    to="/buscar?tipo=accessory"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-2 py-2 text-sm font-semibold text-muted"
                  >
                    Accesorios
                  </Link>
                </div>
              )}
              {links.map((link) =>
                link.to ? (
                  <Link
                    key={link.label}
                    to={link.to}
                    onClick={() => setMobileOpen(false)}
                    className="px-3 py-2.5 rounded-lg text-sm font-medium"
                    style={{ color: "#102A36" }}
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    key={link.label}
                    href={link.href}
                    className="px-3 py-2.5 rounded-lg text-sm font-medium"
                    style={{ color: "#102A36" }}
                  >
                    {link.label}
                  </a>
                ),
              )}
            </nav>
            {user && (
              <div className="mx-3 mb-3 rounded-xl bg-bg p-3">
                <div className="flex items-center gap-3">
                  {publicAvatarUrl ? (
                    <img
                      src={publicAvatarUrl}
                      alt=""
                      onError={() => setAvatarLoadFailed(true)}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-petrol text-xs font-bold text-white">
                      {initials}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-petrol-dark">
                      {displayName}
                    </p>
                    <p className="truncate text-xs text-muted">{user.email}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Link
                    to="/mis-publicaciones"
                    onClick={() => setMobileOpen(false)}
                    className="col-span-2 rounded-lg bg-white px-2 py-2 text-center text-xs font-semibold text-petrol"
                  >
                    Mis publicaciones
                  </Link>
                  <Link
                    to="/favoritos"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg bg-white px-2 py-2 text-center text-xs font-semibold text-petrol"
                  >
                    Favoritos
                  </Link>
                  <Link
                    to="/mi-perfil"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg bg-white px-2 py-2 text-center text-xs font-semibold text-petrol"
                  >
                    Mi perfil
                  </Link>
                  <Link
                    to="/mi-desarmaduria"
                    onClick={() => setMobileOpen(false)}
                    className="col-span-2 rounded-lg bg-white px-2 py-2 text-center text-xs font-semibold text-petrol"
                  >
                    Mi desarmaduría
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-lg bg-white px-2 py-2 text-xs font-semibold text-red-600"
                  >
                    Cerrar sesión
                  </button>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 px-3">
              {!user && (
                <div className="flex flex-1 gap-2">
                  <Link
                    to="/registro"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center py-2.5 rounded-lg text-sm font-medium border border-border text-muted"
                  >
                    Registrarse
                  </Link>
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center py-2.5 rounded-lg text-sm font-medium border border-border text-petrol"
                  >
                    Iniciar sesión
                  </Link>
                </div>
              )}
              <Link
                to="/publicar"
                onClick={() => setMobileOpen(false)}
                className="publish-button flex-1 py-2.5 rounded-lg text-sm font-semibold text-white"
                style={{ background: "#F97316" }}
              >
                Publicar
              </Link>
            </div>
          </div>
        )}
      </div>
      {authNotice && (
        <div
          role="status"
          className="border-t border-blue-100 bg-blue-50 px-4 py-2 text-center text-xs font-medium text-blue-800"
        >
          {authNotice}
        </div>
      )}
    </motion.header>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

const QUICK_LINKS = [
  "Motor",

  "Parachoques",

  "Focos",

  "Neumáticos",

  "Puertas",

  "Accesorios",
]

function Hero() {
  const [query, setQuery] = useState("")

  const navigate = useNavigate()

  const [brand, setBrand] = useState("")

  const [model, setModel] = useState("")

  const [year, setYear] = useState("")

  const [region, setRegion] = useState("")

  const [filterOptions, setFilterOptions] =
    useState<PublicListingFilterOptions>({
      categories: [],

      brands: [],

      modelsByBrand: {},

      regions: [],

      years: [],
    })

  const [filterOptionsError, setFilterOptionsError] = useState(false)

  const reduceMotion = useReducedMotion()

  useEffect(() => {
    let active = true

    void getPublicListingFilterOptions()

      .then((options) => {
        if (!active) return

        setFilterOptions(options)

        setFilterOptionsError(false)
      })

      .catch(() => {
        if (active) setFilterOptionsError(true)
      })

    return () => {
      active = false
    }
  }, [])

  const availableModels = brand
    ? (filterOptions.modelsByBrand[brand] ?? [])
    : []

  const selectClass =
    "w-full px-3 py-2.5 text-sm rounded-lg border bg-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-opacity-40"

  const selectStyle = {
    borderColor: "#DCE3E6",

    color: "#102A36",

    focusRingColor: "#123B4A",
  }

  const navigateToSearch = () => {
    const normalizedQuery = query.trim().replace(/\s+/g, " ")

    const params = new URLSearchParams()

    if (normalizedQuery) params.set("q", normalizedQuery)

    if (brand) params.set("marca", brand)

    if (model) params.set("modelo", model)

    if (year) params.set("anio", year)

    if (region) params.set("region", region)

    const search = params.toString()

    navigate(search ? `/buscar?${search}` : "/buscar")
  }

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault()

    navigateToSearch()
  }

  return (
    <motion.section
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      style={{ background: "#F7F9FA" }}
      className="py-12 md:py-16"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Left */}
          <motion.div
            initial={reduceMotion ? false : "hidden"}
            animate="visible"
            variants={staggerFast}
          >
            <motion.div
              variants={heroItem}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-5"
              style={{ background: "#E8F0F3", color: "#123B4A" }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full inline-block"
                style={{ background: "#F97316" }}
              ></span>
              El marketplace automotriz de Chile
            </motion.div>
            <motion.h1
              variants={heroItem}
              className="text-3xl sm:text-4xl xl:text-5xl font-extrabold leading-tight mb-4"
              style={{ fontFamily: "Manrope, sans-serif", color: "#102A36" }}
            >
              Encuentra el repuesto
              <br />
              que tu <span style={{ color: "#F97316" }}>vehículo necesita</span>
            </motion.h1>
            <motion.p
              variants={heroItem}
              className="text-base mb-8"
              style={{ color: "#64757D" }}
            >
              Busca repuestos, vehículos y desarmadurías de todo Chile en un
              solo lugar.
            </motion.p>

            {/* Search box */}
            <motion.form
              onSubmit={submitSearch}
              role="search"
              variants={imageEntrance}
              className="search-panel bg-white rounded-2xl border shadow-md p-5 transition-[transform,box-shadow,border-color] duration-300 focus-within:border-petrol focus-within:shadow-xl"
              style={{ borderColor: "#DCE3E6" }}
            >
              {/* Keyword */}
              <div className="relative mb-3">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: "#64757D" }}
                >
                  <IconSearch />
                </span>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return

                    event.preventDefault()

                    navigateToSearch()
                  }}
                  placeholder="Busca un producto, pieza o palabra clave…"
                  className="w-full pl-10 pr-4 py-3 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-opacity-30"
                  style={
                    {
                      borderColor: "#DCE3E6",

                      color: "#102A36",

                      "--tw-ring-color": "#123B4A",
                    } as React.CSSProperties
                  }
                />
              </div>

              {/* Selectors */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                {[
                  {
                    value: brand,

                    set: setBrand,

                    label: "Marca",

                    options: [
                      "Toyota",

                      "Hyundai",

                      "Kia",

                      "Chevrolet",

                      "Nissan",

                      "Suzuki",

                      "Mitsubishi",
                    ],
                  },

                  {
                    value: model,

                    set: setModel,

                    label: "Modelo",

                    options: [
                      "Yaris",

                      "Accent",

                      "Rio",

                      "Sail",

                      "Sentra",

                      "Swift",

                      "Outlander",
                    ],
                  },

                  {
                    value: year,

                    set: setYear,

                    label: "Año",

                    options: [
                      "2024",

                      "2023",

                      "2022",

                      "2021",

                      "2020",

                      "2019",

                      "2018",

                      "2017",

                      "2016",

                      "2015",
                    ],
                  },

                  {
                    value: region,

                    set: setRegion,

                    label: "Región (opcional)",

                    options: [
                      "Región Metropolitana",

                      "Valparaíso",

                      "Bio-Bío",

                      "Araucanía",

                      "Los Lagos",

                      "Antofagasta",

                      "Maule",
                    ],
                  },
                ].map(({ value, set, label, options }) => {
                  const dynamicOptions =
                    label === "Marca"
                      ? filterOptions.brands
                      : label === "Modelo"
                        ? availableModels
                        : label.startsWith("A")
                          ? filterOptions.years.map(String)
                          : label.startsWith("Regi")
                            ? filterOptions.regions
                            : options

                  const disabled = label === "Modelo" && !brand

                  return (
                    <div key={label} className="relative">
                      <select
                        value={value}
                        disabled={disabled}
                        onChange={(e) => {
                          set(e.target.value)

                          if (label === "Marca") setModel("")
                        }}
                        className={`${selectClass} disabled:cursor-not-allowed disabled:bg-slate-100`}
                        style={{
                          borderColor: "#DCE3E6",

                          color: value ? "#102A36" : "#64757D",
                        }}
                      >
                        <option value="">{label}</option>
                        {dynamicOptions.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                      <span
                        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"
                        style={{ color: "#64757D" }}
                      >
                        <IconChevronDown />
                      </span>
                    </div>
                  )
                })}
              </div>

              {filterOptionsError && (
                <p className="mb-3 text-xs font-medium text-amber-700">
                  No pudimos cargar todas las opciones. Aún puedes buscar por
                  palabra clave.
                </p>
              )}

              <motion.button
                type="submit"
                whileHover={reduceMotion ? undefined : { y: -2, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90 active:opacity-80 focus:outline-none focus:ring-2 focus:ring-orange/30"
                style={{ background: "#F97316" }}
              >
                <IconSearch />
                Buscar repuestos
              </motion.button>
            </motion.form>

            {/* Quick links */}
            <motion.div
              variants={heroItem}
              className="mt-5 flex flex-wrap gap-2"
            >
              <span
                className="text-xs font-medium"
                style={{ color: "#64757D" }}
              >
                Búsquedas rápidas:
              </span>
              {QUICK_LINKS.map((ql) => (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  key={ql}
                  className="text-xs px-3 py-1 rounded-full border font-medium transition-colors hover:border-opacity-60"
                  style={{
                    borderColor: "#DCE3E6",

                    color: "#123B4A",

                    background: "#fff",
                  }}
                >
                  {ql}
                </motion.button>
              ))}
            </motion.div>
          </motion.div>

          {/* Right image */}
          <motion.div
            initial={reduceMotion ? false : "hidden"}
            animate="visible"
            variants={imageEntrance}
            className="hidden lg:block relative"
          >
            <motion.div
              animate={reduceMotion ? undefined : { y: [0, -4, 0] }}
              transition={{
                duration: 5.5,

                repeat: Infinity,

                ease: "easeInOut",
              }}
              className="rounded-3xl overflow-hidden shadow-2xl aspect-[4/3]"
              style={{ background: "#E8F0F3" }}
            >
              <img
                src="https://images.unsplash.com/photo-1725885970369-884a996b638c?w=720&h=540&fit=crop&auto=format"
                alt="Automóvil disponible en Punto Repuesto Chile"
                className="w-full h-full object-cover"
              />
              <div
                className="absolute inset-0 rounded-3xl"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(18,59,74,0.12) 0%, transparent 60%)",
                }}
              ></div>
            </motion.div>
            {/* Floating stats */}
            <div
              className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-lg px-4 py-3 border"
              style={{ borderColor: "#DCE3E6" }}
            >
              <div
                className="text-2xl font-extrabold"
                style={{ fontFamily: "Manrope, sans-serif", color: "#102A36" }}
              >
                12.400+
              </div>
              <div className="text-xs" style={{ color: "#64757D" }}>
                Repuestos publicados
              </div>
            </div>
            <div
              className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-lg px-4 py-3 border"
              style={{ borderColor: "#DCE3E6" }}
            >
              <div
                className="text-2xl font-extrabold"
                style={{ fontFamily: "Manrope, sans-serif", color: "#F97316" }}
              >
                340+
              </div>
              <div className="text-xs" style={{ color: "#64757D" }}>
                Desarmadurías activas
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.section>
  )
}

// ─── Categories ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  {
    name: "Motor y transmisión",

    to: categorySearchUrl(LISTING_CATEGORY_VALUES.motor),

    Icon: CatEngine,
  },

  {
    name: "Carrocería",

    to: categorySearchUrl(LISTING_CATEGORY_VALUES.body),

    Icon: CatBody,
  },

  {
    name: "Suspensión y dirección",

    to: categorySearchUrl(LISTING_CATEGORY_VALUES.suspension),

    Icon: CatSuspension,
  },

  {
    name: "Frenos",

    to: categorySearchUrl(LISTING_CATEGORY_VALUES.brakes),

    Icon: CatBrakes,
  },

  {
    name: "Electricidad e iluminación",

    to: categorySearchUrl(LISTING_CATEGORY_VALUES.electricity),

    Icon: CatElectric,
  },

  {
    name: "Neumáticos y llantas",

    to: categorySearchUrl(LISTING_CATEGORY_VALUES.tires),

    Icon: CatTires,
  },

  { name: "Accesorios", to: "/buscar?tipo=accessory", Icon: CatAccessories },

  { name: "Vehículos", to: "/buscar?tipo=vehicle", Icon: CatVehicles },
]

function Categories() {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={fadeUp}
      className="py-14"
      style={{ background: "#fff" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2
          className="text-2xl font-bold mb-8"
          style={{ fontFamily: "Manrope, sans-serif", color: "#102A36" }}
        >
          ¿Qué estás buscando?
        </h2>
        <StaggerGroup className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {CATEGORIES.map(({ name, to, Icon }) => (
            <motion.div
              variants={cardEntrance}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
              key={name}
              className="animated-card group rounded-2xl border text-center transition-[box-shadow,border-color] hover:shadow-md"
              style={{ borderColor: "#DCE3E6", background: "#F7F9FA" }}
            >
              <Link
                to={to}
                className="flex h-full cursor-pointer flex-col items-center gap-3 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-orange/30"
                aria-label={`Ver ${name}`}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors group-hover:bg-opacity-90"
                  style={{ background: "#E8F0F3", color: "#123B4A" }}
                >
                  <Icon />
                </div>
                <span
                  className="text-xs font-semibold leading-tight"
                  style={{ color: "#102A36" }}
                >
                  {name}
                </span>
                <span style={{ color: "#64757D" }}>
                  <IconChevronRight />
                </span>
              </Link>
            </motion.div>
          ))}
        </StaggerGroup>
      </div>
    </motion.section>
  )
}

// First catalog version: "featured" means most recently published.

const PART_LISTING_TYPES: PublicListingType[] = ["part", "accessory"]

const VEHICLE_LISTING_TYPES: PublicListingType[] = ["vehicle"]

function CatalogSectionMessage({
  message,

  onRetry,
}: {
  message: string

  onRetry?: () => void
}) {
  return (
    <div className="rounded-2xl border border-border bg-white px-6 py-10 text-center shadow-sm">
      <p className="text-sm font-semibold text-muted">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-xl bg-petrol px-5 py-2.5 text-sm font-bold text-white transition hover:bg-petrol-dark"
        >
          Reintentar
        </button>
      )}
    </div>
  )
}

function FeaturedProducts() {
  const { listings, isLoading, error, retry } = usePublishedListingSection(
    PART_LISTING_TYPES,

    8,
  )

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={fadeUp}
      className="py-14"
      style={{ background: "#F7F9FA" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h2
            className="text-2xl font-bold"
            style={{ fontFamily: "Manrope, sans-serif", color: "#102A36" }}
          >
            Publicaciones destacadas
          </h2>
          <span className="text-xs font-medium text-muted">Más recientes</span>
        </div>
        {isLoading ? (
          <PublicListingsSkeleton count={4} />
        ) : error ? (
          <CatalogSectionMessage message={error} onRetry={retry} />
        ) : listings.length === 0 ? (
          <CatalogSectionMessage message="Aún no hay publicaciones disponibles." />
        ) : (
          <StaggerGroup className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {listings.map((listing) => (
              <PublicListingCard key={listing.id} listing={listing} />
            ))}
          </StaggerGroup>
        )}
      </div>
    </motion.section>
  )
}

// ─── Search by Vehicle ────────────────────────────────────────────────────────

function SearchByVehicle() {
  const [brand, setBrand] = useState("")

  const [model, setModel] = useState("")

  const [year, setYear] = useState("")

  const [version, setVersion] = useState("")

  const fieldClass =
    "w-full px-3 py-3 text-sm rounded-xl border bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-offset-1"

  const fieldStyle = { borderColor: "#DCE3E6", color: "#102A36" }

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={fadeUp}
      className="py-16"
      style={{ background: "#123B4A" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-5"
              style={{ background: "rgba(249,115,22,0.2)", color: "#F97316" }}
            >
              Búsqueda inteligente
            </div>
            <h2
              className="text-3xl font-extrabold text-white mb-4"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              Encuentra repuestos compatibles con tu vehículo
            </h2>
            <p className="text-base mb-2" style={{ color: "#A8C4CF" }}>
              Selecciona tu vehículo y revisa productos que realmente podrían
              ser compatibles.
            </p>
            <p className="text-sm" style={{ color: "#7AA5B4" }}>
              No necesitas saber el nombre técnico de la pieza — busca por tu
              auto y te mostramos lo que sirve.
            </p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-xl">
            <div className="grid grid-cols-2 gap-3 mb-3">
              {[
                {
                  value: brand,

                  set: setBrand,

                  label: "Marca del vehículo",

                  options: [
                    "Toyota",

                    "Hyundai",

                    "Kia",

                    "Chevrolet",

                    "Nissan",

                    "Suzuki",

                    "Mitsubishi",

                    "Ford",

                    "Renault",

                    "Volkswagen",
                  ],
                },

                {
                  value: model,

                  set: setModel,

                  label: "Modelo",

                  options: [
                    "Yaris",

                    "Accent",

                    "Rio",

                    "Sail",

                    "Sentra",

                    "Swift",

                    "Outlander",

                    "Fiesta",

                    "Sandero",

                    "Polo",
                  ],
                },

                {
                  value: year,

                  set: setYear,

                  label: "Año",

                  options: [
                    "2024",

                    "2023",

                    "2022",

                    "2021",

                    "2020",

                    "2019",

                    "2018",

                    "2017",

                    "2016",

                    "2015",

                    "2014",
                  ],
                },

                {
                  value: version,

                  set: setVersion,

                  label: "Versión (opcional)",

                  options: [
                    "1.0 Turbo",

                    "1.5 GDI",

                    "1.6 MT",

                    "1.4 CVT",

                    "2.0 AT",

                    "1.5 Híbrido",
                  ],
                },
              ].map(({ value, set, label, options }) => (
                <div key={label} className="relative">
                  <select
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    className={fieldClass}
                    style={{
                      ...fieldStyle,

                      color: value ? "#102A36" : "#64757D",
                    }}
                  >
                    <option value="">{label}</option>
                    {options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                  <span
                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"
                    style={{ color: "#64757D" }}
                  >
                    <IconChevronDown />
                  </span>
                </div>
              ))}
            </div>
            <button
              className="w-full py-3 rounded-xl font-bold text-white text-sm transition-opacity hover:opacity-90"
              style={{ background: "#F97316" }}
            >
              Ver repuestos compatibles
            </button>
          </div>
        </div>
      </div>
    </motion.section>
  )
}

// ─── Vehicles ─────────────────────────────────────────────────────────────────

function Vehicles() {
  const { listings, isLoading, error, retry } = usePublishedListingSection(
    VEHICLE_LISTING_TYPES,

    6,
  )

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={fadeUp}
      className="py-14"
      style={{ background: "#fff" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h2
            className="text-2xl font-bold"
            style={{ fontFamily: "Manrope, sans-serif", color: "#102A36" }}
          >
            Vehículos disponibles
          </h2>
          <span className="text-xs font-medium text-muted">Más recientes</span>
        </div>
        {isLoading ? (
          <PublicListingsSkeleton count={3} />
        ) : error ? (
          <CatalogSectionMessage message={error} onRetry={retry} />
        ) : listings.length === 0 ? (
          <CatalogSectionMessage message="Aún no hay vehículos publicados." />
        ) : (
          <StaggerGroup className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {listings.map((listing) => (
              <PublicListingCard
                key={listing.id}
                listing={listing}
                vehicleLayout
              />
            ))}
          </StaggerGroup>
        )}
      </div>
    </motion.section>
  )
}

// ─── Desarmadurías ────────────────────────────────────────────────────────────

function DesarmCard({ d }: { d: Desarmaduria }) {
  return (
    <motion.div
      variants={cardEntrance}
      whileHover={{ y: -4 }}
      className="animated-card group bg-white rounded-2xl border overflow-hidden transition-[box-shadow,border-color] hover:shadow-xl"
      style={{ borderColor: "#DCE3E6" }}
    >
      <div
        className="aspect-[16/7] overflow-hidden"
        style={{ background: "#E8F0F3" }}
      >
        <img
          src={d.img}
          alt={d.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
        />
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between mb-2">
          <h3
            className="font-bold text-base"
            style={{ fontFamily: "Manrope, sans-serif", color: "#102A36" }}
          >
            {d.name}
          </h3>
          <Badge label="" variant="company" />
        </div>
        <div
          className="flex items-center gap-1 text-xs mb-3"
          style={{ color: "#64757D" }}
        >
          <IconMapPin /> {d.location}
        </div>
        <div className="flex items-center gap-1 mb-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <span key={i} style={{ color: "#F97316" }}>
              <IconStar />
            </span>
          ))}
          <span className="text-xs ml-1" style={{ color: "#64757D" }}>
            5.0
          </span>
        </div>
        <p className="text-xs mb-1" style={{ color: "#64757D" }}>
          <strong style={{ color: "#102A36" }}>
            {d.listings.toLocaleString("es-CL")}
          </strong>{" "}
          publicaciones activas
        </p>
        <p className="text-xs mb-4" style={{ color: "#64757D" }}>
          Especialidad: {d.specialty}
        </p>
        <button
          className="w-full py-2.5 rounded-xl text-sm font-semibold border transition-colors hover:bg-opacity-5"
          style={{ color: "#123B4A", borderColor: "#123B4A" }}
        >
          Ver inventario
        </button>
      </div>
    </motion.div>
  )
}

function Desarmaduras() {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={fadeUp}
      className="py-14"
      style={{ background: "#F7F9FA" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2
              className="text-2xl font-bold"
              style={{ fontFamily: "Manrope, sans-serif", color: "#102A36" }}
            >
              Desarmadurías destacadas
            </h2>
            <p className="text-sm mt-1" style={{ color: "#64757D" }}>
              Proveedores verificados con amplio inventario
            </p>
          </div>
          <a
            href="#"
            className="hidden sm:flex text-sm font-semibold items-center gap-1 hover:underline"
            style={{ color: "#123B4A" }}
          >
            Ver todas <IconChevronRight />
          </a>
        </div>
        <StaggerGroup className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {DESARMADURAS.map((d) => (
            <DesarmCard key={d.name} d={d} />
          ))}
        </StaggerGroup>
      </div>
    </motion.section>
  )
}

// ─── How it works ─────────────────────────────────────────────────────────────

const STEPS = [
  {
    num: "01",

    Icon: IconSearch,

    title: "Buscar",

    desc: "Busca por producto, marca, modelo o año desde el buscador principal.",
  },

  {
    num: "02",

    Icon: IconScale,

    title: "Comparar",

    desc: "Revisa precios, estado, ubicación y perfil del vendedor.",
  },

  {
    num: "03",

    Icon: IconMessageCircle,

    title: "Contactar",

    desc: "Comunícate directamente con el vendedor y coordina la compra.",
  },
]

function HowItWorks() {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={fadeUp}
      className="py-16"
      style={{ background: "#fff" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2
            className="text-2xl font-bold mb-2"
            style={{ fontFamily: "Manrope, sans-serif", color: "#102A36" }}
          >
            Encuentra lo que necesitas en pocos pasos
          </h2>
          <p className="text-sm" style={{ color: "#64757D" }}>
            Sin intermediarios. Sin complicaciones.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative">
          {STEPS.map(({ num, Icon, title, desc }, i) => (
            <div
              key={num}
              className="relative flex flex-col items-center text-center p-8 rounded-2xl border"
              style={{ borderColor: "#DCE3E6", background: "#F7F9FA" }}
            >
              <div
                className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ background: "#F97316" }}
              >
                {num}
              </div>
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: "#E8F0F3", color: "#123B4A" }}
              >
                <Icon />
              </div>
              <h3
                className="text-base font-bold mb-2"
                style={{ fontFamily: "Manrope, sans-serif", color: "#102A36" }}
              >
                {title}
              </h3>
              <p className="text-sm" style={{ color: "#64757D" }}>
                {desc}
              </p>
              {i < STEPS.length - 1 && (
                <div
                  className="hidden sm:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10"
                  style={{ color: "#DCE3E6" }}
                >
                  <IconChevronRight />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  )
}

// ─── Seller CTA ───────────────────────────────────────────────────────────────

const BENEFITS = [
  "Publicaciones fáciles de administrar",

  "Perfil comercial con tu inventario",

  "Contacto directo con compradores",

  "Mayor visibilidad para tu inventario",
]

function SellerCTA() {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={fadeUp}
      className="py-16"
      style={{ background: "#123B4A" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2
              className="text-3xl font-extrabold text-white mb-4"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              ¿Tienes repuestos o vehículos para vender?
            </h2>
            <p className="text-base mb-8" style={{ color: "#A8C4CF" }}>
              Publica tus productos y llega a compradores de todo Chile sin
              tener que crear tu propia página web.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                className="px-6 py-3 rounded-xl font-bold text-white transition-opacity hover:opacity-90"
                style={{ background: "#F97316" }}
              >
                Comenzar a vender
              </button>
              <button className="px-6 py-3 rounded-xl font-semibold border border-white border-opacity-30 text-white transition-colors hover:bg-white hover:bg-opacity-10">
                Conocer planes para desarmadurías
              </button>
            </div>
          </div>
          <div>
            <ul className="space-y-4">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-center gap-3">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white"
                    style={{ background: "rgba(22,131,93,0.8)" }}
                  >
                    <IconCheck />
                  </div>
                  <span
                    className="text-sm font-medium"
                    style={{ color: "#C5DDE6" }}
                  >
                    {b}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </motion.section>
  )
}

// ─── Trust & Safety ───────────────────────────────────────────────────────────

const TRUST_ITEMS = [
  {
    icon: <IconShield />,

    title: "Vendedores verificados",

    desc: "Revisamos la identidad y reputación de los vendedores activos en la plataforma.",
  },

  {
    icon: <IconBookOpen />,

    title: "Información clara",

    desc: "Cada publicación muestra el estado del producto, precio y datos del vendedor de forma transparente.",
  },

  {
    icon: <IconMessageCircle />,

    title: "Reporta publicaciones",

    desc: "Si algo no se ve bien, puedes reportar una publicación fácilmente y la revisaremos.",
  },

  {
    icon: <IconCheck />,

    title: "Compra de forma segura",

    desc: "Seguimos recomendaciones para ayudarte a tomar decisiones informadas y seguras.",
  },
]

function TrustSection() {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={fadeUp}
      className="py-14"
      style={{ background: "#F7F9FA" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2
            className="text-2xl font-bold"
            style={{ fontFamily: "Manrope, sans-serif", color: "#102A36" }}
          >
            Tu seguridad, nuestra prioridad
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {TRUST_ITEMS.map(({ icon, title, desc }) => (
            <div
              key={title}
              className="bg-white rounded-2xl border p-5"
              style={{ borderColor: "#DCE3E6" }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: "#E8F0F3", color: "#123B4A" }}
              >
                {icon}
              </div>
              <h3
                className="text-sm font-bold mb-2"
                style={{ fontFamily: "Manrope, sans-serif", color: "#102A36" }}
              >
                {title}
              </h3>
              <p
                className="text-xs leading-relaxed"
                style={{ color: "#64757D" }}
              >
                {desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  const cols = [
    {
      heading: "Marketplace",

      links: ["Repuestos", "Vehículos", "Desarmadurías", "Categorías"],
    },

    {
      heading: "Vendedores",

      links: [
        "Publicar",

        "Crear cuenta",

        "Perfil comercial",

        "Ayuda para vendedores",
      ],
    },

    {
      heading: "Ayuda",

      links: [
        "Preguntas frecuentes",

        "Contacto",

        "Compra segura",

        "Reportar publicación",
      ],
    },

    {
      heading: "Legal",

      links: [
        "Términos y condiciones",

        "Política de privacidad",

        "Política de publicaciones",
      ],
    },
  ]

  return (
    <footer style={{ background: "#102A36" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "#F97316" }}
              >
                <span className="text-white text-xs font-bold">PR</span>
              </div>
              <span
                className="font-bold text-sm text-white"
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                Punto Repuesto
                <br />
                Chile
              </span>
            </div>
            <p
              className="text-xs leading-relaxed mb-5"
              style={{ color: "#7AA5B4" }}
            >
              El marketplace automotriz de Chile. Compra y vende repuestos,
              accesorios y vehículos de todo el país.
            </p>
            <div className="flex gap-3">
              {[IconFacebook, IconInstagram, IconTwitter].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-opacity hover:opacity-80"
                  style={{
                    background: "rgba(255,255,255,0.1)",

                    color: "#A8C4CF",
                  }}
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>

          {/* Cols */}
          {cols.map(({ heading, links }) => (
            <div key={heading}>
              <h4
                className="text-xs font-bold uppercase tracking-wider mb-4"
                style={{ color: "#A8C4CF" }}
              >
                {heading}
              </h4>
              <ul className="space-y-2.5">
                {links.map((l) => (
                  <li key={l}>
                    <a
                      href="#"
                      className="text-xs transition-opacity hover:opacity-80"
                      style={{ color: "#7AA5B4" }}
                    >
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="mt-12 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          <p className="text-xs" style={{ color: "#4A6B7A" }}>
            © 2026 Punto Repuesto Chile. Todos los derechos reservados.
          </p>
          <p className="text-xs" style={{ color: "#4A6B7A" }}>
            Hecho en Chile 🇨🇱
          </p>
        </div>
      </div>
    </footer>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <div style={{ fontFamily: "Inter, sans-serif", background: "#F7F9FA" }}>
        <Navbar />
        <Hero />
        <Categories />
        <FeaturedProducts />
        <SearchByVehicle />
        <Vehicles />
        <Desarmaduras />
        <HowItWorks />
        <SellerCTA />
        <TrustSection />
        <Footer />
      </div>
    </MotionConfig>
  )
}
