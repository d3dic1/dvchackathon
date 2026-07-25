import { useCallback, useRef } from 'react'

const SWIPE_THRESHOLD = 12

export function useTapGesture<T extends HTMLElement>(onTap: () => void) {
  const gesture = useRef({ pointerId: -1, x: 0, y: 0, moved: false })

  const onPointerDown = useCallback((event: React.PointerEvent<T>) => {
    gesture.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      moved: false,
    }
  }, [])

  const onPointerMove = useCallback((event: React.PointerEvent<T>) => {
    const start = gesture.current
    if (start.pointerId !== event.pointerId) return
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > SWIPE_THRESHOLD) {
      start.moved = true
    }
  }, [])

  const onPointerUp = useCallback((event: React.PointerEvent<T>) => {
    const current = gesture.current
    if (current.pointerId === event.pointerId && !current.moved) onTap()
    gesture.current.pointerId = -1
  }, [onTap])

  const onPointerCancel = useCallback(() => {
    gesture.current.pointerId = -1
  }, [])

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel }
}
