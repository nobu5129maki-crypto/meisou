import type { SessionRecord } from '../types'
import { PROGRAMS } from '../data/programs'

export function dayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

/** 日ごとの合計秒 */
export function secondsByDay(records: SessionRecord[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const r of records) {
    const k = dayKey(new Date(r.endedAt))
    map.set(k, (map.get(k) ?? 0) + r.durationSec)
  }
  return map
}

/** 今日を含む連続日数。今日まだやっていなければ昨日までを数える */
export function currentStreak(records: SessionRecord[], today = new Date()): number {
  const days = secondsByDay(records)
  let cursor = new Date(today)
  if (!days.has(dayKey(cursor))) cursor = addDays(cursor, -1)
  let streak = 0
  while (days.has(dayKey(cursor))) {
    streak++
    cursor = addDays(cursor, -1)
  }
  return streak
}

export function bestStreak(records: SessionRecord[]): number {
  const keys = [...secondsByDay(records).keys()].sort()
  let best = 0
  let run = 0
  let prev: Date | null = null
  for (const k of keys) {
    const d = new Date(k + 'T00:00:00')
    if (prev && dayKey(addDays(prev, 1)) === k) run++
    else run = 1
    best = Math.max(best, run)
    prev = d
  }
  return best
}

export function todaySeconds(records: SessionRecord[], today = new Date()): number {
  return secondsByDay(records).get(dayKey(today)) ?? 0
}

export function totalSeconds(records: SessionRecord[]): number {
  return records.reduce((a, r) => a + r.durationSec, 0)
}

export function formatMinutes(sec: number): string {
  const m = Math.round(sec / 60)
  if (m < 60) return `${m}分`
  const h = Math.floor(m / 60)
  const rest = m % 60
  return rest ? `${h}時間${rest}分` : `${h}時間`
}

export function formatClock(sec: number): string {
  const s = Math.max(0, Math.ceil(sec))
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

/* ---------- レベル ---------- */

export const LEVELS: { minMinutes: number; title: string; emoji: string }[] = [
  { minMinutes: 0, title: 'はじめの一歩', emoji: '🌱' },
  { minMinutes: 30, title: '芽吹き', emoji: '🌿' },
  { minMinutes: 120, title: '小川', emoji: '💧' },
  { minMinutes: 300, title: '静かな湖', emoji: '🏞️' },
  { minMinutes: 600, title: '深い森', emoji: '🌲' },
  { minMinutes: 1200, title: '山', emoji: '⛰️' },
  { minMinutes: 3000, title: '澄んだ空', emoji: '🌌' },
  { minMinutes: 6000, title: '達人', emoji: '🪷' },
]

export function levelInfo(totalSec: number) {
  const minutes = totalSec / 60
  let idx = 0
  for (let i = 0; i < LEVELS.length; i++) if (minutes >= LEVELS[i].minMinutes) idx = i
  const cur = LEVELS[idx]
  const next = LEVELS[idx + 1]
  const progress = next
    ? (minutes - cur.minMinutes) / (next.minMinutes - cur.minMinutes)
    : 1
  return { level: idx + 1, ...cur, next, progress: Math.min(1, Math.max(0, progress)) }
}

/* ---------- バッジ ---------- */

export type Badge = {
  id: string
  title: string
  desc: string
  emoji: string
  check: (records: SessionRecord[]) => boolean
}

export const BADGES: Badge[] = [
  { id: 'first', title: 'はじめの一座', desc: '初めての瞑想を完了', emoji: '🌱', check: (r) => r.length >= 1 },
  { id: 'streak3', title: '三日坊主を超えた', desc: '3日連続', emoji: '🔥', check: (r) => currentStreak(r) >= 3 || bestStreak(r) >= 3 },
  { id: 'streak7', title: '一週間の静けさ', desc: '7日連続', emoji: '🌈', check: (r) => bestStreak(r) >= 7 },
  { id: 'streak30', title: '習慣になった', desc: '30日連続', emoji: '🏔️', check: (r) => bestStreak(r) >= 30 },
  { id: 'streak100', title: '百日行', desc: '100日連続', emoji: '🪷', check: (r) => bestStreak(r) >= 100 },
  { id: 'min60', title: '1時間の積み重ね', desc: '合計60分', emoji: '⏳', check: (r) => totalSeconds(r) >= 3600 },
  { id: 'min600', title: '10時間の旅', desc: '合計10時間', emoji: '🧭', check: (r) => totalSeconds(r) >= 36000 },
  { id: 'sessions10', title: '十座', desc: '10回完了', emoji: '🔟', check: (r) => r.length >= 10 },
  { id: 'sessions50', title: '五十座', desc: '50回完了', emoji: '🎖️', check: (r) => r.length >= 50 },
  { id: 'early', title: '朝の人', desc: '朝6時前に瞑想', emoji: '🌄', check: (r) => r.some((x) => new Date(x.endedAt).getHours() < 6) },
  { id: 'night', title: '夜の静寂', desc: '22時以降に瞑想', emoji: '🌙', check: (r) => r.some((x) => new Date(x.endedAt).getHours() >= 22) },
  { id: 'long', title: 'じっくり', desc: '10分以上の1回', emoji: '🧘', check: (r) => r.some((x) => x.durationSec >= 600) },
  {
    id: 'explorer',
    title: '探検家',
    desc: '全プログラムを体験',
    emoji: '🗺️',
    check: (r) => PROGRAMS.every((p) => r.some((x) => x.programId === p.id)),
  },
  {
    id: 'mood',
    title: '気分が晴れた',
    desc: '瞑想後の気分が2段階以上アップ',
    emoji: '☀️',
    check: (r) => r.some((x) => x.moodBefore != null && x.moodAfter != null && x.moodAfter - x.moodBefore >= 2),
  },
]

export function moodDelta(records: SessionRecord[]): { avg: number; count: number } {
  const both = records.filter((r) => r.moodBefore != null && r.moodAfter != null)
  if (!both.length) return { avg: 0, count: 0 }
  const sum = both.reduce((a, r) => a + ((r.moodAfter ?? 0) - (r.moodBefore ?? 0)), 0)
  return { avg: sum / both.length, count: both.length }
}

export function timeOfDay(d = new Date()): 'morning' | 'day' | 'evening' | 'night' {
  const h = d.getHours()
  if (h >= 5 && h < 11) return 'morning'
  if (h >= 11 && h < 17) return 'day'
  if (h >= 17 && h < 21) return 'evening'
  return 'night'
}

export function greeting(d = new Date()): string {
  switch (timeOfDay(d)) {
    case 'morning':
      return 'おはようございます'
    case 'day':
      return 'こんにちは'
    case 'evening':
      return 'こんばんは'
    default:
      return 'おつかれさまです'
  }
}
