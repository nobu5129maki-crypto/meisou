export type BreathPhase = {
  kind: 'in' | 'hold' | 'out' | 'rest'
  label: string
  seconds: number
}

export type Cue = {
  /** 開始からの秒数 */
  at: number
  text: string
}

export type ProgramCategory = 'guided' | 'breath' | 'free'

export type Program = {
  id: string
  title: string
  subtitle: string
  emoji: string
  category: ProgramCategory
  /** 秒。free の場合は設定値で上書き */
  durationSec: number
  description: string
  /** カードのアクセントカラー */
  color: string
  cues?: Cue[]
  breath?: BreathPhase[]
  /** おすすめ時間帯 */
  bestFor?: ('morning' | 'day' | 'evening' | 'night')[]
}

export type SessionRecord = {
  id: string
  /** ISO 文字列 */
  endedAt: string
  durationSec: number
  programId: string
  moodBefore?: number
  moodAfter?: number
  note?: string
}

export type Settings = {
  name: string
  dailyGoalMin: number
  freeMinutes: number
  bell: boolean
  voice: boolean
  soundId: string
  volume: number
}

export type Track = {
  id: string
  title: string
  file: string
  loopStart?: number
  loopEnd?: number
}

export type AppData = {
  version: 1
  records: SessionRecord[]
  settings: Settings
  /** 獲得済みバッジ ID と獲得日時 */
  badges: Record<string, string>
}
