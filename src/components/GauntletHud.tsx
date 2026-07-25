interface GauntletHudProps {
  stage: number
  totalStages: number
  bankedPoints: number
}

export function GauntletHud({ stage, totalStages, bankedPoints }: GauntletHudProps) {
  return (
    <div className="gauntlet-hud" aria-label={`Daily gauntlet event ${stage + 1} of ${totalStages}`}>
      <span>DAILY RUN</span>
      <div className="gauntlet-hud__dots" aria-hidden="true">
        {Array.from({ length: totalStages }, (_, index) => (
          <i
            className={index < stage ? 'is-done' : index === stage ? 'is-live' : ''}
            key={index}
          />
        ))}
      </div>
      <strong>{bankedPoints} PTS</strong>
    </div>
  )
}
