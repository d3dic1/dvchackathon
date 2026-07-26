export type Sound = 'tap' | 'success' | 'fail' | 'milestone' | 'challenge'
export type MusicMode = 'play' | 'soft'

export interface AudioPreferences {
  musicVolume: number
  sfxVolume: number
  muted: boolean
}

export const DEFAULT_AUDIO_PREFERENCES: AudioPreferences = {
  musicVolume: .28,
  sfxVolume: .8,
  muted: false,
}

const STORAGE_KEY = 'flickcade_audio_preferences'
const BPM = 132
const STEP_LENGTH = 60 / BPM / 4
const LOOK_AHEAD_SECONDS = .32

let context: AudioContext | null = null
let musicBus: GainNode | null = null
let sfxBus: GainNode | null = null
let musicTimer: ReturnType<typeof setInterval> | null = null
let musicStarted = false
let musicPaused = false
let nextMusicTime = 0
let musicStep = 0
let musicMode: MusicMode = 'soft'
let musicDucked = false
let preferences = { ...DEFAULT_AUDIO_PREFERENCES }

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

// Original 64-step C-major-pentatonic phrase composed for FLICKCADE.
const MELODY: Array<number | null> = [
  72, null, 76, null, 79, null, 81, 79,
  76, null, 74, 72, null, 67, 69, null,
  72, null, 74, 76, 79, null, 76, 74,
  72, 69, null, 67, 69, null, 72, null,
  79, null, 81, 84, 81, null, 79, 76,
  74, null, 76, 79, null, 74, 72, null,
  69, null, 72, 74, 76, null, 79, 76,
  74, 72, 69, null, 67, 69, 72, null,
]

const BASS = [48, 48, 53, 55, 45, 45, 50, 43]

const clampVolume = (value: unknown, fallback: number) => {
  const number = typeof value === 'number' ? value : fallback
  return Math.max(0, Math.min(1, number))
}

export function loadAudioPreferences(): AudioPreferences {
  if (typeof window === 'undefined') return { ...DEFAULT_AUDIO_PREFERENCES }
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<AudioPreferences>
    return {
      musicVolume: clampVolume(stored.musicVolume, DEFAULT_AUDIO_PREFERENCES.musicVolume),
      sfxVolume: clampVolume(stored.sfxVolume, DEFAULT_AUDIO_PREFERENCES.sfxVolume),
      muted: typeof stored.muted === 'boolean' ? stored.muted : DEFAULT_AUDIO_PREFERENCES.muted,
    }
  } catch {
    return { ...DEFAULT_AUDIO_PREFERENCES }
  }
}

function ensureContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  context ??= new AudioContext()
  if (!musicBus || !sfxBus) {
    musicBus = context.createGain()
    sfxBus = context.createGain()
    musicBus.connect(context.destination)
    sfxBus.connect(context.destination)
  }
  applyBusLevels()
  return context
}

function applyBusLevels() {
  if (!context || !musicBus || !sfxBus) return
  const now = context.currentTime
  const musicLevel = preferences.muted || musicPaused
    ? 0
    : preferences.musicVolume * (musicMode === 'play' && !musicDucked ? .16 : .085)
  const sfxLevel = preferences.muted ? 0 : preferences.sfxVolume
  musicBus.gain.cancelScheduledValues(now)
  musicBus.gain.setTargetAtTime(musicLevel, now, .045)
  sfxBus.gain.cancelScheduledValues(now)
  sfxBus.gain.setTargetAtTime(sfxLevel, now, .025)
}

function midiToFrequency(note: number) {
  return 440 * Math.pow(2, (note - 69) / 12)
}

function scheduleTone(
  frequency: number,
  start: number,
  length: number,
  volume: number,
  wave: OscillatorType,
  destination: AudioNode,
) {
  if (!context) return
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = wave
  oscillator.frequency.setValueAtTime(frequency, start)
  gain.gain.setValueAtTime(.001, start)
  gain.gain.exponentialRampToValueAtTime(Math.max(.001, volume), start + .012)
  gain.gain.exponentialRampToValueAtTime(.001, start + length)
  oscillator.connect(gain)
  gain.connect(destination)
  oscillator.start(start)
  oscillator.stop(start + length + .015)
}

function scheduleKick(start: number) {
  if (!context || !musicBus) return
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(135, start)
  oscillator.frequency.exponentialRampToValueAtTime(48, start + .095)
  gain.gain.setValueAtTime(.22, start)
  gain.gain.exponentialRampToValueAtTime(.001, start + .11)
  oscillator.connect(gain)
  gain.connect(musicBus)
  oscillator.start(start)
  oscillator.stop(start + .12)
}

function scheduleStep(step: number, start: number) {
  if (!musicBus) return
  const melodyNote = MELODY[step % MELODY.length]
  if (melodyNote !== null) {
    scheduleTone(midiToFrequency(melodyNote), start, STEP_LENGTH * .82, .22, 'square', musicBus)
  }

  if (step % 4 === 0) {
    const bassNote = BASS[Math.floor(step / 8) % BASS.length]
    scheduleTone(midiToFrequency(bassNote), start, STEP_LENGTH * 3.25, .3, 'triangle', musicBus)
    if (musicMode === 'play') scheduleKick(start)
  }

  if (musicMode === 'play' && step % 2 === 1) {
    scheduleTone(4200, start, .025, .035, 'square', musicBus)
  }

  if (step % 8 === 6) {
    const harmony = melodyNote ?? MELODY[(step + 2) % MELODY.length]
    if (harmony !== null) {
      scheduleTone(midiToFrequency(harmony - 12), start, STEP_LENGTH * 1.7, .09, 'triangle', musicBus)
    }
  }
}

function scheduler() {
  if (!context || musicPaused) return
  while (nextMusicTime < context.currentTime + LOOK_AHEAD_SECONDS) {
    scheduleStep(musicStep, nextMusicTime)
    nextMusicTime += STEP_LENGTH
    musicStep = (musicStep + 1) % MELODY.length
  }
}

export function setAudioPreferences(next: AudioPreferences) {
  preferences = {
    musicVolume: clampVolume(next.musicVolume, DEFAULT_AUDIO_PREFERENCES.musicVolume),
    sfxVolume: clampVolume(next.sfxVolume, DEFAULT_AUDIO_PREFERENCES.sfxVolume),
    muted: next.muted,
  }
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
  }
  applyBusLevels()
}

export function setMusicMode(mode: MusicMode) {
  musicMode = mode
  applyBusLevels()
}

export function setMusicDucked(ducked: boolean) {
  musicDucked = ducked
  applyBusLevels()
}

export function startMusic() {
  const audioContext = ensureContext()
  if (!audioContext) return
  void audioContext.resume()
  if (musicStarted) {
    applyBusLevels()
    return
  }
  musicStarted = true
  musicPaused = false
  nextMusicTime = audioContext.currentTime + .06
  scheduler()
  musicTimer = setInterval(scheduler, 90)
  applyBusLevels()
}

export function setMusicPaused(paused: boolean) {
  musicPaused = paused
  if (!context || !musicStarted) return
  if (paused) {
    if (musicTimer) clearInterval(musicTimer)
    musicTimer = null
  } else {
    nextMusicTime = context.currentTime + .06
    if (!musicTimer) musicTimer = setInterval(scheduler, 90)
    scheduler()
  }
  applyBusLevels()
}

export function stopMusic() {
  if (musicTimer) clearInterval(musicTimer)
  musicTimer = null
  musicStarted = false
  musicPaused = true
  applyBusLevels()
}

export function playSound(sound: Sound, enabled: boolean) {
  if (!enabled) return
  const audioContext = ensureContext()
  if (!audioContext || !sfxBus) return
  void audioContext.resume()

  const now = audioContext.currentTime
  for (const note of SOUNDS[sound]) {
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    const start = now + note.delay
    const end = start + note.length

    oscillator.type = note.wave
    oscillator.frequency.setValueAtTime(note.frequency, start)
    if (note.endFrequency) oscillator.frequency.exponentialRampToValueAtTime(note.endFrequency, end)
    gain.gain.setValueAtTime(note.volume, start)
    gain.gain.exponentialRampToValueAtTime(.001, end)
    oscillator.connect(gain)
    gain.connect(sfxBus)
    oscillator.start(start)
    oscillator.stop(end)
  }
}
