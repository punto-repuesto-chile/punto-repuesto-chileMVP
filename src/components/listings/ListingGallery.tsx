import { useEffect, useMemo, useState } from "react"

import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import type {
  ListingCondition,
  PublishedListingImage,
} from "../../services/listingService"

const PRICE_FORMATTER = new Intl.NumberFormat("es-CL", {
  style: "currency",

  currency: "CLP",

  maximumFractionDigits: 0,
})

const CONDITION_LABELS: Record<ListingCondition, string> = {
  new: "Nuevo",

  used: "Usado",

  refurbished: "Reacondicionado",
}

export default function ListingGallery({
  images,

  title,

  category,

  condition,

  price,

  commune,

  stock,
  showSummary = true,
}: {
  images: PublishedListingImage[]

  title: string

  category: string

  condition: ListingCondition

  price: number

  commune: string

  stock: number

  showSummary?: boolean
}) {
  const orderedImages = useMemo(() => {
    const imagesByPosition = [...images].sort(
      (first, second) => first.position - second.position,
    )

    const primaryImage = imagesByPosition.find((image) => image.isPrimary)

    if (!primaryImage) return imagesByPosition

    return [
      primaryImage,

      ...imagesByPosition.filter((image) => image.id !== primaryImage.id),
    ]
  }, [images])

  const initialImage = orderedImages[0]

  const [selectedId, setSelectedId] = useState(initialImage?.id ?? null)

  const [direction, setDirection] = useState(1)

  const reduceMotion = useReducedMotion()

  useEffect(() => {
    setSelectedId(initialImage?.id ?? null)
  }, [initialImage?.id])

  const selectedImage =
    orderedImages.find((image) => image.id === selectedId) ?? initialImage

  const selectedIndex = selectedImage
    ? orderedImages.findIndex((image) => image.id === selectedImage.id)
    : -1

  const showPrevious = () => {
    if (orderedImages.length < 2) return

    const previousIndex =
      selectedIndex <= 0 ? orderedImages.length - 1 : selectedIndex - 1

    setDirection(-1)

    setSelectedId(orderedImages[previousIndex].id)
  }

  const showNext = () => {
    if (orderedImages.length < 2) return

    const nextIndex =
      selectedIndex >= orderedImages.length - 1 ? 0 : selectedIndex + 1

    setDirection(1)

    setSelectedId(orderedImages[nextIndex].id)
  }

  const selectThumbnail = (imageId: string, imageIndex: number) => {
    setDirection(imageIndex >= selectedIndex ? 1 : -1)

    setSelectedId(imageId)
  }

  if (!selectedImage)
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-slate-100 text-muted"
        style={{ height: "clamp(270px, 34vw, 440px)" }}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-14 w-14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        >
          <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z" />
          <path d="m4 16 4.5-4.5 3 3 2-2L20 19M15.5 8.5h.01" />
        </svg>
        <span className="text-sm font-semibold">Publicación sin imágenes</span>
      </div>
    )

  return (
    <div className="min-w-0">
      {showSummary && (
        <div className="mb-5 rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
              Publicada
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
              {CONDITION_LABELS[condition]}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-orange">
              {category}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-display text-xl font-extrabold leading-tight text-petrol-dark sm:text-2xl">
                {title}
              </h2>
              <p className="mt-2 text-sm text-muted">
                {commune} · {stock} {stock === 1 ? "unidad" : "unidades"}
              </p>
            </div>
            <p className="font-display text-xl font-extrabold text-petrol sm:text-2xl">
              {PRICE_FORMATTER.format(price)}
            </p>
          </div>
        </div>
      )}
      <div
        className="relative flex items-center justify-center overflow-hidden rounded-2xl border border-border bg-white shadow-sm"
        style={{ height: "clamp(270px, 34vw, 440px)" }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.img
            key={selectedImage.id}
            src={selectedImage.url}
            alt={`Imagen de ${title}`}
            initial={{ opacity: 0, x: reduceMotion ? 0 : direction * 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: reduceMotion ? 0 : direction * -12 }}
            transition={{
              duration: reduceMotion ? 0.01 : 0.24,

              ease: "easeOut",
            }}
            className="h-auto max-h-full w-auto max-w-full object-contain p-2 sm:p-4"
          />
        </AnimatePresence>
        {orderedImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={showPrevious}
              aria-label="Mostrar imagen anterior"
              className="absolute z-20 flex h-10 w-10 items-center justify-center rounded-full text-petrol-dark transition duration-200 hover:brightness-105 sm:h-11 sm:w-11"
              style={{
                left: "0.875rem",

                top: "50%",

                transform: "translateY(-50%)",

                backgroundColor: "rgba(255, 255, 255, 0.82)",

                border: "1px solid rgba(255, 255, 255, 0.9)",

                boxShadow: "0 4px 16px rgba(16, 42, 54, 0.16)",

                backdropFilter: "blur(8px)",
              }}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={showNext}
              aria-label="Mostrar imagen siguiente"
              className="absolute z-20 flex h-10 w-10 items-center justify-center rounded-full text-petrol-dark transition duration-200 hover:brightness-105 sm:h-11 sm:w-11"
              style={{
                right: "0.875rem",

                top: "50%",

                transform: "translateY(-50%)",

                backgroundColor: "rgba(255, 255, 255, 0.82)",

                border: "1px solid rgba(255, 255, 255, 0.9)",

                boxShadow: "0 4px 16px rgba(16, 42, 54, 0.16)",

                backdropFilter: "blur(8px)",
              }}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </>
        )}
      </div>
      {orderedImages.length > 1 && (
        <div
          className="mt-5 flex max-w-full gap-3 overflow-x-auto px-1 pb-3 pt-1 sm:gap-4"
          aria-label="Imágenes de la publicación"
        >
          {orderedImages.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => selectThumbnail(image.id, index)}
              aria-label={`Mostrar imagen ${index + 1}`}
              aria-pressed={selectedImage.id === image.id}
              className={`shrink-0 overflow-hidden rounded-xl border-2 bg-white transition duration-200 ${
                selectedImage.id === image.id
                  ? "scale-[1.03] border-orange shadow-[0_0_0_3px_rgba(249,115,22,0.14)]"
                  : "border-border opacity-75 hover:border-petrol/40 hover:opacity-100"
              }`}
            >
              <img
                src={image.url}
                alt=""
                className="h-20 w-24 object-cover sm:h-24 sm:w-28"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
