import { useState, useCallback } from 'react'

const KEY_PREFIX = 'ttg_pb_'

export function usePersonalBest(gameSlug: string) {
  const key = KEY_PREFIX + gameSlug

  const [personalBest, setPersonalBest] = useState<number>(() => {
    return parseInt(localStorage.getItem(key) ?? '0', 10)
  })

  const updatePersonalBest = useCallback((score: number) => {
    setPersonalBest(prev => {
      if (score > prev) {
        localStorage.setItem(key, String(score))
        return score
      }
      return prev
    })
  }, [key])

  return { personalBest, updatePersonalBest }
}
