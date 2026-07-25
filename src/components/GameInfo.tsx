interface Props {
  title: string
  instruction: string
  accentColor: string
}

export default function GameInfo({ title, instruction, accentColor }: Props) {
  return (
    <div style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: '70px',
      padding: '0 18px max(env(safe-area-inset-bottom), 24px) 18px',
      background: 'linear-gradient(to top, rgba(10,10,15,0.75) 0%, transparent 100%)',
      zIndex: 20,
      pointerEvents: 'none',
    }}>
      <div style={{
        fontFamily: 'Orbitron, monospace',
        fontSize: 'clamp(16px, 4.5vw, 22px)',
        fontWeight: 700,
        color: '#f0f0f5',
        textShadow: `0 0 16px ${accentColor}`,
        marginBottom: '5px',
      }}>
        {title}
      </div>
      <div style={{
        fontFamily: 'Inter, sans-serif',
        fontSize: 'clamp(11px, 3vw, 14px)',
        color: '#a0a0b0',
        lineHeight: 1.4,
        maxWidth: '260px',
      }}>
        {instruction}
      </div>
    </div>
  )
}
