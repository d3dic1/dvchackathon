type Sound = 'tap' | 'success' | 'fail'

let context: AudioContext | null = null

export function playSound(sound: Sound, enabled: boolean) {
  if (!enabled || typeof window === 'undefined') return
  context ??= new AudioContext()
  if (context.state === 'suspended') void context.resume()

  const oscillator = context.createOscillator()
  const gain = context.createGain()
  const now = context.currentTime
  const settings = {
    tap: { start: 260, end: 320, length: .055, volume: .035, wave: 'square' as OscillatorType },
    success: { start: 520, end: 780, length: .11, volume: .05, wave: 'triangle' as OscillatorType },
    fail: { start: 180, end: 72, length: .18, volume: .055, wave: 'sawtooth' as OscillatorType },
  }[sound]

  oscillator.type = settings.wave
  oscillator.frequency.setValueAtTime(settings.start, now)
  oscillator.frequency.exponentialRampToValueAtTime(settings.end, now + settings.length)
  gain.gain.setValueAtTime(settings.volume, now)
  gain.gain.exponentialRampToValueAtTime(.001, now + settings.length)
  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start(now)
  oscillator.stop(now + settings.length)
}
