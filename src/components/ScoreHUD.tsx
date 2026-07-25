interface Props {
  score: number
  personalBest: number
  accentColor: string
}

export default function ScoreHUD({ score, personalBest, accentColor }: Props) {
  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      padding: 'max(env(safe-area-inset-top), 14px) 18px 14px',
      zIndex: 20,
      background: 'linear-gradient(to bottom, rgba(10,10,15,0.7) 0%, transparent 100%)',
      pointerEvents: 'none',
    }}>
      {/* Current score */}
      <div>
        <div style={{
          fontFamily: 'Orbitron, monospace',
          fontSize: 'clamp(26px, 7vw, 38px)',
          fontWeight: 900,
          color: '#f0f0f5',
          lineHeight: 1,
          textShadow: `0 0 20px ${accentColor}`,
        }}>
          {score}
        </div>
        <div style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '10px',
          color: '#6b6b7a',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginTop: '2px',
        }}>Score</div>
      </div>

      {/* Personal best */}
      <div style={{ textAlign: 'right' }}>
        <div style={{
          fontFamily: 'Orbitron, monospace',
          fontSize: 'clamp(18px, 5vw, 26px)',
          fontWeight: 700,
          color: personalBest > 0 ? accentColor : '#3a3a4a',
          lineHeight: 1,
          textShadow: personalBest > 0 ? `0 0 14px ${accentColor}` : 'none',
          transition: 'color 0.3s, text-shadow 0.3s',
        }}>
          {personalBest}
        </div>
        <div style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '10px',
          color: '#6b6b7a',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginTop: '2px',
        }}>Best</div>
      </div>
    </div>
  )
}
