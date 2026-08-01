import type { Variants } from "motion/react"

export const quickEase = [0.22, 1, 0.36, 1] as const

export const fadeDown: Variants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: quickEase } },
}

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: quickEase },
  },
}

export const heroItem: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.48, ease: quickEase },
  },
}

export const imageEntrance: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.58, ease: quickEase },
  },
}

export const staggerFast: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
}

export const staggerHeader: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}

export const cardEntrance: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.46, ease: quickEase },
  },
}

export const viewportOnce = { once: true, amount: 0.16 } as const
