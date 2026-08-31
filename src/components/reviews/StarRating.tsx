import { useId } from "react"

type StarRatingProps = {
  value: number
  onChange?: (value: number) => void
  label?: string
  size?: "sm" | "lg"
}

export default function StarRating({
  value,
  onChange,
  label = "Calificación",
  size = "sm",
}: StarRatingProps) {
  const groupId = useId()
  const interactive = Boolean(onChange)
  const fontSize = size === "lg" ? "text-3xl" : "text-lg"

  return (
    <div
      role={interactive ? "radiogroup" : undefined}
      aria-label={label}
      className={`inline-flex items-center gap-0.5 ${fontSize}`}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = value >= star
        const partlyFilled = !filled && value > star - 1
        const starLabel = `${star} ${star === 1 ? "estrella" : "estrellas"}`

        if (!interactive)
          return (
            <span
              key={star}
              aria-hidden="true"
              className={filled ? "text-orange" : "text-slate-200"}
              style={partlyFilled ? { opacity: 0.65 } : undefined}
            >
              ★
            </span>
          )

        return (
          <button
            key={star}
            id={`${groupId}-${star}`}
            type="button"
            role="radio"
            aria-label={starLabel}
            aria-checked={value === star}
            onClick={() => onChange?.(star)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowUp") {
                event.preventDefault()
                onChange?.(Math.min(5, star + 1))
              } else if (
                event.key === "ArrowLeft" ||
                event.key === "ArrowDown"
              ) {
                event.preventDefault()
                onChange?.(Math.max(1, star - 1))
              }
            }}
            tabIndex={value === star || (value < 1 && star === 1) ? 0 : -1}
            className={`rounded-md px-0.5 leading-none transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-orange/30 ${
              filled ? "text-orange" : "text-slate-300"
            }`}
          >
            ★
          </button>
        )
      })}
    </div>
  )
}
