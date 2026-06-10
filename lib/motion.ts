import type { Variants } from 'framer-motion'

/**
 * Shared, GPU-friendly entrance animation used across all pages.
 *
 * Performance notes:
 * - Animates only `opacity` + `y` (transform), which the compositor can run
 *   off the main thread → no layout/paint per frame.
 * - Delays are capped so the stagger never drags on or overlaps heavy work
 *   (data mapping, chart mount) for long, which is what caused the jank when
 *   skeletons were swapped out.
 */
export const EASE_OUT = [0.22, 0.61, 0.36, 1] as const

export const stagger = (i: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.32, delay: Math.min(i, 6) * 0.045, ease: EASE_OUT },
})

/** Container/child variants for list-style staggering (single timeline, smoother). */
export const listContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.02 } },
}

export const listItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE_OUT } },
}
