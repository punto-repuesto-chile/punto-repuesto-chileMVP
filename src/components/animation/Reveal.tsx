import { motion, useReducedMotion, type Variants } from "motion/react"
import type { ReactNode } from "react"
import { fadeUp, staggerFast, viewportOnce } from "../../animations/variants"

type Props = {
  children: ReactNode
  className?: string
  variants?: Variants
}

export function Reveal({ children, className, variants = fadeUp }: Props) {
  const reduceMotion = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : "hidden"}
      whileInView="visible"
      viewport={viewportOnce}
      variants={variants}
    >
      {children}
    </motion.div>
  )
}

export function StaggerGroup({ children, className }: Omit<Props, "variants">) {
  const reduceMotion = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : "hidden"}
      whileInView="visible"
      viewport={viewportOnce}
      variants={staggerFast}
    >
      {children}
    </motion.div>
  )
}
