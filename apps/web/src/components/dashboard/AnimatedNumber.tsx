// Number that eases from its old value to the new one (a "ticker").
// The animation writes straight to the DOM node on each frame, so React does
// NOT re-render 60 times a second. With reduced motion it just jumps.
//
// React renders an EMPTY span and never owns its text; the layout effect fills
// it before the browser paints. Mixing React-rendered text with manual
// textContent writes would make the two fight over the same node.
import { useLayoutEffect, useRef } from 'react'
import { animate } from 'motion/react'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface AnimatedNumberProps {
  value: number | null
  format: (value: number | null) => string
  className?: string
}

export function AnimatedNumber({ value, format, className }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const previous = useRef<number | null>(null)
  const reducedMotion = useReducedMotion()

  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return
    const from = previous.current
    previous.current = value

    if (value === null || from === null || reducedMotion || from === value) {
      node.textContent = format(value)
      return
    }

    const controls = animate(from, value, {
      duration: 0.6,
      ease: 'easeOut',
      onUpdate: (v) => {
        node.textContent = format(v)
      },
    })
    // If a new value arrives mid-animation, stop at the current frame and
    // start the next animation from the value we were aiming for.
    return () => controls.stop()
  }, [value, format, reducedMotion])

  return <span ref={ref} className={className} />
}
