interface ShareChallengeOptions {
  gameSlug: string
  gameTitle: string
  score: number
  challenger?: string | null
  revenge?: boolean
}

export async function shareChallenge({
  gameSlug,
  gameTitle,
  score,
  challenger,
  revenge = false,
}: ShareChallengeOptions) {
  const url = new URL(window.location.href)
  url.searchParams.set('game', gameSlug)
  if (score > 0) url.searchParams.set('beat', String(score))
  else url.searchParams.delete('beat')
  if (challenger) url.searchParams.set('from', challenger.slice(0, 32))
  else url.searchParams.delete('from')
  if (revenge) url.searchParams.set('revenge', '1')
  else url.searchParams.delete('revenge')

  const text = score > 0
    ? `${revenge ? 'Rematch:' : 'Challenge:'} I scored ${score} on ${gameTitle}. Beat it.`
    : `Try ${gameTitle} on FLICKCADE.`
  const data = { title: `${gameTitle} · FLICKCADE`, text, url: url.toString() }

  if (navigator.share) {
    try {
      await navigator.share(data)
      return 'shared' as const
    } catch {
      return 'cancelled' as const
    }
  }
  await navigator.clipboard?.writeText(url.toString())
  return 'copied' as const
}
