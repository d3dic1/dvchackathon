interface Props {
  score: number
  personalBest: number
  accentColor: string
}

export default function ScoreHUD({ score, personalBest, accentColor }: Props) {
  return (
    <div className="score-hud">
      <div className="score-hud__block">
        <div key={score} className="score-hud__value" style={{ color: accentColor }}>{score}</div>
        <div className="score-hud__label">Live score</div>
      </div>
      <div className="score-hud__block score-hud__block--best">
        <div className="score-hud__best" style={{ color: personalBest ? accentColor : undefined }}>
          {personalBest}
        </div>
        <div className="score-hud__label">Personal best</div>
      </div>
    </div>
  )
}
