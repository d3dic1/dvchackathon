interface Props {
  soundEnabled: boolean
  onSoundToggle: () => void
  onLeaderboard: () => void
  liked: boolean
  onLike: () => void
  accentColor: string
  gameSlug: string
  gameTitle: string
  score: number
}

export default function SocialRail({
  soundEnabled, onSoundToggle, onLeaderboard, liked, onLike, accentColor, gameSlug, gameTitle, score,
}: Props) {
  const shareChallenge = async () => {
    const url = new URL(window.location.href)
    url.searchParams.set('game', gameSlug)
    if (score > 0) url.searchParams.set('beat', String(score))
    else url.searchParams.delete('beat')
    const data = {
      title: `${gameTitle} · FLICKCADE`,
      text: score > 0 ? `I scored ${score} on ${gameTitle}. Beat it.` : `Try ${gameTitle} on FLICKCADE.`,
      url: url.toString(),
    }
    if (navigator.share) await navigator.share(data).catch(() => {})
    else await navigator.clipboard?.writeText(url.toString())
  }

  return (
    <div className="social-rail">
      <div className="creator-chip" aria-label="Created by Flickcade">
        <span>FC</span>
        <strong>@FLICKCADE</strong>
      </div>
      <button className="rail-button" onClick={onLeaderboard} aria-label="Leaderboard">
        <span className="rail-button__icon" style={{ background: accentColor }}><TrophyIcon /></span>
        <span>Ranks</span>
      </button>
      <button className={`rail-button ${liked ? 'is-active' : ''}`} onClick={onLike} aria-label={liked ? 'Unlike' : 'Like'}>
        <span className="rail-button__icon"><HeartIcon filled={liked} /></span>
        <span>Like</span>
      </button>
      <button
        className="rail-button"
        onClick={shareChallenge}
        aria-label="Share"
      >
        <span className="rail-button__icon"><ShareIcon /></span>
        <span>Share</span>
      </button>
      <button className="rail-button" onClick={onSoundToggle} aria-label={soundEnabled ? 'Mute' : 'Unmute'}>
        <span className="rail-button__icon"><SoundIcon muted={!soundEnabled} /></span>
        <span>{soundEnabled ? 'Sound' : 'Muted'}</span>
      </button>
    </div>
  )
}

function TrophyIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v4c0 3-1.8 5-4 5s-4-2-4-5V4Zm0 2H4v2c0 2 1.4 3 3 3m9-5h4v2c0 2-1.4 3-3 3M12 13v4m-4 3h8m-6-3h4" /></svg>
}
function HeartIcon({ filled }: { filled: boolean }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill={filled ? 'currentColor' : 'none'} d="M20.8 5.8c-1.7-1.7-4.4-1.7-6.1 0L12 8.5 9.3 5.8a4.3 4.3 0 0 0-6.1 6.1L12 20l8.8-8.1a4.3 4.3 0 0 0 0-6.1Z" /></svg>
}
function ShareIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5m0-5-8 8m6 0v5H5V6h5" /></svg>
}
function SoundIcon({ muted }: { muted: boolean }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 10v4h4l5 4V6l-5 4H5Zm12-1c1.5 1.5 1.5 4.5 0 6m2-8c2.8 2.8 2.8 7.2 0 10" />{muted && <path d="M4 4l16 16" />}</svg>
}
