import { useEffect, useRef } from 'react'

interface Props {
  score: number
  personalBest: number
  isNewBest: boolean
  onPlayAgain: () => void
  accentColor: string
  rank?: number
}

export default function GameOver({ score, personalBest, isNewBest, onPlayAgain, accentColor, rank }: Props) {
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const t = setTimeout(() => btnRef.current?.focus(), 100)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(10,10,15,0.88)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 50,
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={e => e.stopPropagation()}
    >
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:scale(0.95) } to { opacity:1; transform:scale(1) } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.7 } }
      `}</style>

      {/* Game Over label */}
      <div style={{
        fontFamily: 'Orbitron, monospace',
        fontSize: 'clamp(13px, 4vw, 17px)',
        fontWeight: 700,
        color: '#ff006e',
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        textShadow: '0 0 20px #ff006e',
        marginBottom: '20px',
      }}>
        Game Over
      </div>

      {/* Score */}
      <div style={{
        fontFamily: 'Orbitron, monospace',
        fontSize: 'clamp(52px, 18vw, 88px)',
        fontWeight: 900,
        color: '#f0f0f5',
        lineHeight: 1,
        textShadow: `0 0 40px ${accentColor}`,
        marginBottom: '8px',
      }}>
        {score}
      </div>

      {isNewBest && (
        <div style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 'clamp(11px, 3vw, 14px)',
          fontWeight: 700,
          color: accentColor,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          textShadow: `0 0 12px ${accentColor}`,
          animation: 'pulse 1.2s infinite',
          marginBottom: '20px',
        }}>
          ★ New Personal Best!
        </div>
      )}

      {/* Stats row */}
      <div style={{
        display: 'flex',
        gap: '24px',
        marginBottom: '32px',
        marginTop: isNewBest ? 0 : '20px',
      }}>
        <Stat label="Best" value={personalBest} color="#6b6b7a" />
        {rank !== undefined && <Stat label="Rank" value={`#${rank}`} color={accentColor} />}
      </div>

      {/* Play Again */}
      <button
        ref={btnRef}
        onClick={onPlayAgain}
        style={{
          fontFamily: 'Orbitron, monospace',
          fontSize: 'clamp(13px, 4vw, 16px)',
          fontWeight: 700,
          letterSpacing: '0.1em',
          color: '#0a0a0f',
          background: accentColor,
          border: 'none',
          borderRadius: '14px',
          padding: '14px 40px',
          cursor: 'pointer',
          boxShadow: `0 0 30px ${accentColor}88, 0 4px 20px rgba(0,0,0,0.4)`,
          transition: 'transform 0.1s, box-shadow 0.1s',
          touchAction: 'manipulation',
        }}
        onPointerDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.96)' }}
        onPointerUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
      >
        Play Again
      </button>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontFamily: 'Orbitron, monospace',
        fontSize: 'clamp(18px, 5vw, 26px)',
        fontWeight: 700,
        color,
        textShadow: `0 0 12px ${color}`,
      }}>{value}</div>
      <div style={{
        fontFamily: 'Inter, sans-serif',
        fontSize: 'clamp(10px, 2.5vw, 12px)',
        color: '#6b6b7a',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        marginTop: '2px',
      }}>{label}</div>
    </div>
  )
}
