export type Sound = 'tap' | 'success' | 'fail' | 'milestone' | 'challenge'

let context: AudioContext | null = null

interface Note {
  frequency: number
  endFrequency?: number
  delay: number
  length: number
  volume: number
  wave: OscillatorType
}

const SOUNDS: Record<Sound, Note[]> = {
  tap: [
    { frequency: 260, endFrequency: 320, delay: 0, length: .055, volume: .035, wave: 'square' },
  ],
  success: [
    { frequency: 520, endFrequency: 680, delay: 0, length: .08, volume: .045, wave: 'triangle' },
    { frequency: 780, delay: .065, length: .09, volume: .035, wave: 'square' },
  ],
  fail: [
    { frequency: 180, endFrequency: 72, delay: 0, length: .18, volume: .055, wave: 'sawtooth' },
    { frequency: 112, endFrequency: 54, delay: .08, length: .2, volume: .035, wave: 'square' },
  ],
  milestone: [
    { frequency: 392, delay: 0, length: .08, volume: .04, wave: 'square' },
    { frequency: 523, delay: .07, length: .08, volume: .04, wave: 'square' },
    { frequency: 659, delay: .14, length: .13, volume: .045, wave: 'triangle' },
  ],
  challenge: [
    { frequency: 523, delay: 0, length: .1, volume: .045, wave: 'square' },
    { frequency: 659, delay: .08, length: .1, volume: .045, wave: 'square' },
    { frequency: 784, delay: .16, length: .1, volume: .045, wave: 'square' },
    { frequency: 1047, delay: .24, length: .24, volume: .05, wave: 'triangle' },
  ],
}

export function playSound(sound: Sound, enabled: boolean) {
  if (!enabled || typeof window === 'undefined') return
  context ??= new AudioContext()
  if (context.state === 'suspended') void context.resume()

  const now = context.currentTime
  for (const note of SOUNDS[sound]) {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const start = now + note.delay
    const end = start + note.length

    oscillator.type = note.wave
    oscillator.frequency.setValueAtTime(note.frequency, start)
    if (note.endFrequency) oscillator.frequency.exponentialRampToValueAtTime(note.endFrequency, end)
    gain.gain.setValueAtTime(note.volume, start)
    gain.gain.exponentialRampToValueAtTime(.001, end)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start(start)
    oscillator.stop(end)
  }
}
