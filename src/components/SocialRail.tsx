interface Props {
  soundEnabled: boolean
  onSoundToggle: () => void
  onLeaderboard: () => void
  liked: boolean
  onLike: () => void
  accentColor: string
}

export default function SocialRail({ soundEnabled, onSoundToggle, onLeaderboard, liked, onLike, accentColor }: Props) {
  const btn: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '5px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    touchAction: 'manipulation',
    color: '#f0f0f5',
    fontFamily: 'Inter, sans-serif',
    fontSize: '10px',
    fontWeight: 500,
    letterSpacing: '0.04em',
  }

  const icon: React.CSSProperties = {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.08)',
    border: '1.5px solid rgba(255,255,255,0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    transition: 'transform 0.12s, box-shadow 0.12s',
  }

  return (
    <div style={{
      position: 'absolute',
      right: '10px',
      bottom: '120px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      zIndex: 20,
    }}>
      {/* Leaderboard */}
      <button style={btn} onClick={onLeaderboard} aria-label="Leaderboard">
        <div style={{
          ...icon,
          boxShadow: `0 0 12px ${accentColor}44`,
          borderColor: `${accentColor}44`,
        }}>🏆</div>
        <span style={{ color: '#6b6b7a' }}>Ranks</span>
      </button>

      {/* Like */}
      <button
        style={btn}
        onClick={onLike}
        aria-label={liked ? 'Unlike' : 'Like'}
        onPointerDown={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.88)' }}
        onPointerUp={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
      >
        <div style={{
          ...icon,
          background: liked ? `${accentColor}22` : 'rgba(255,255,255,0.08)',
          borderColor: liked ? accentColor : 'rgba(255,255,255,0.12)',
          boxShadow: liked ? `0 0 16px ${accentColor}66` : 'none',
          fontSize: '22px',
        }}>
          {liked ? '♥' : '♡'}
        </div>
        <span style={{ color: liked ? accentColor : '#6b6b7a' }}>Like</span>
      </button>

      {/* Share */}
      <button
        style={btn}
        onClick={() => {
          if (navigator.share) {
            navigator.share({ title: 'Tip Tap Games', url: window.location.href }).catch(() => {})
          }
        }}
        aria-label="Share"
      >
        <div style={icon}>↗</div>
        <span style={{ color: '#6b6b7a' }}>Share</span>
      </button>

      {/* Sound */}
      <button style={btn} onClick={onSoundToggle} aria-label={soundEnabled ? 'Mute' : 'Unmute'}>
        <div style={{
          ...icon,
          background: soundEnabled ? 'rgba(255,255,255,0.08)' : 'rgba(255,0,110,0.12)',
          borderColor: soundEnabled ? 'rgba(255,255,255,0.12)' : '#ff006e55',
        }}>
          {soundEnabled ? '🔊' : '🔇'}
        </div>
        <span style={{ color: '#6b6b7a' }}>{soundEnabled ? 'Sound' : 'Muted'}</span>
      </button>
    </div>
  )
}
