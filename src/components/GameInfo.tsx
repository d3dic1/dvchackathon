interface Props {
  title: string
  instruction: string
  accentColor: string
}

export default function GameInfo({ title, instruction, accentColor }: Props) {
  return (
    <div className="game-info">
      <div className="game-info__kicker">NOW PLAYING</div>
      <div className="game-info__title" style={{ color: accentColor }}>{title}</div>
      <div className="game-info__rule">{instruction}</div>
    </div>
  )
}
