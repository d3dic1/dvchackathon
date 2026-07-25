import { LeaderboardEntry } from '../types/game'

interface Props {
  entries: LeaderboardEntry[]
  loading: boolean
  onClose: () => void
  accentColor: string
  gameTitle: string
  deviceId: string
}

export default function LeaderboardPanel({ entries, loading, onClose, accentColor, gameTitle, deviceId }: Props) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 60,
        background: 'rgba(10,10,15,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        flexDirection: 'column',
        padding: '0 0 env(safe-area-inset-bottom) 0',
        animation: 'slideUp 0.25s ease',
      }}
      onClick={onClose}
    >
      <style>{`@keyframes slideUp { from { transform:translateY(100%) } to { transform:translateY(0) } }`}</style>
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 20px',
          maxWidth: '480px',
          width: '100%',
          margin: '0 auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <div style={{
              fontFamily: 'Orbitron, monospace',
              fontSize: 'clamp(14px, 4vw, 18px)',
              fontWeight: 700,
              color: '#f0f0f5',
              textShadow: `0 0 16px ${accentColor}`,
            }}>{gameTitle}</div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#6b6b7a', marginTop: '2px' }}>
              Top Scores
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1.5px solid rgba(255,255,255,0.12)',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              color: '#f0f0f5',
              fontSize: '18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >×</button>
        </div>

        {loading ? (
          <div style={{ color: '#6b6b7a', textAlign: 'center', fontFamily: 'Inter, sans-serif', marginTop: '40px' }}>
            Loading...
          </div>
        ) : entries.length === 0 ? (
          <div style={{ color: '#6b6b7a', textAlign: 'center', fontFamily: 'Inter, sans-serif', marginTop: '40px' }}>
            No scores yet. Be the first!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
            {entries.map(e => {
              const isMe = e.deviceId === deviceId
              return (
                <div
                  key={e.rank}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    background: isMe ? `${accentColor}18` : 'rgba(255,255,255,0.04)',
                    border: isMe ? `1.5px solid ${accentColor}55` : '1.5px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div style={{
                    fontFamily: 'Orbitron, monospace',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: e.rank <= 3 ? accentColor : '#6b6b7a',
                    width: '28px',
                    textAlign: 'center',
                  }}>
                    {e.rank === 1 ? '🥇' : e.rank === 2 ? '🥈' : e.rank === 3 ? '🥉' : `#${e.rank}`}
                  </div>
                  <div style={{
                    flex: 1,
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '13px',
                    color: isMe ? '#f0f0f5' : '#a0a0b0',
                  }}>
                    {isMe ? 'You' : `${e.deviceId.slice(0, 6)}...`}
                  </div>
                  <div style={{
                    fontFamily: 'Orbitron, monospace',
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#f0f0f5',
                    textShadow: isMe ? `0 0 10px ${accentColor}` : 'none',
                  }}>
                    {e.score}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
