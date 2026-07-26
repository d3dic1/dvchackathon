import { useEffect, useRef } from 'react'
import { AudioPreferences } from '../utils/audio'

interface Props {
  settings: AudioPreferences
  onChange: (settings: AudioPreferences) => void
  onClose: () => void
}

export function AudioSettingsSheet({ settings, onChange, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const updateVolume = (key: 'musicVolume' | 'sfxVolume', value: string) => {
    onChange({ ...settings, [key]: Number(value), muted: false })
  }

  return (
    <div className="audio-sheet-backdrop" role="presentation" onClick={onClose}>
      <section
        className="audio-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="audio-settings-title"
        onClick={event => event.stopPropagation()}
      >
        <div className="audio-sheet__handle" aria-hidden="true" />
        <div className="audio-sheet__header">
          <div>
            <span>SOUND SYSTEM</span>
            <h2 id="audio-settings-title">AUDIO MIX</h2>
          </div>
          <button ref={closeRef} onClick={onClose} aria-label="Close audio settings">×</button>
        </div>

        <label className="audio-control">
          <span><b>MUSIC</b><output>{Math.round(settings.musicVolume * 100)}%</output></span>
          <input
            type="range"
            min="0"
            max="1"
            step=".05"
            value={settings.musicVolume}
            onChange={event => updateVolume('musicVolume', event.target.value)}
          />
        </label>

        <label className="audio-control">
          <span><b>GAME SFX</b><output>{Math.round(settings.sfxVolume * 100)}%</output></span>
          <input
            type="range"
            min="0"
            max="1"
            step=".05"
            value={settings.sfxVolume}
            onChange={event => updateVolume('sfxVolume', event.target.value)}
          />
        </label>

        <button
          className={`audio-sheet__mute ${settings.muted ? 'is-muted' : ''}`}
          onClick={() => onChange({ ...settings, muted: !settings.muted })}
        >
          {settings.muted ? 'TURN SOUND BACK ON' : 'MUTE EVERYTHING'}
        </button>
        <p>Original procedural soundtrack · pauses when this tab is hidden</p>
      </section>
    </div>
  )
}
