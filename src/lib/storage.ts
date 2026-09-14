import { useEffect, useState } from 'react'
import type { AppData, Settings } from '../types'

const KEY = 'meisou.v1'

export const DEFAULT_SETTINGS: Settings = {
  name: '',
  dailyGoalMin: 5,
  freeMinutes: 10,
  bell: true,
  voice: false,
  soundId: 'track:seijaku2',
  volume: 0.5,
}

export function emptyData(): AppData {
  return { version: 1, records: [], settings: { ...DEFAULT_SETTINGS }, badges: {} }
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyData()
    const parsed = JSON.parse(raw) as Partial<AppData>
    return {
      version: 1,
      records: Array.isArray(parsed.records) ? parsed.records : [],
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
      badges: parsed.badges ?? {},
    }
  } catch {
    return emptyData()
  }
}

export function saveData(data: AppData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    /* 容量不足などは無視 */
  }
}

export function useAppData() {
  const [data, setData] = useState<AppData>(loadData)
  useEffect(() => {
    saveData(data)
  }, [data])
  return [data, setData] as const
}

export function exportJson(data: AppData): string {
  return JSON.stringify(data, null, 2)
}

export function importJson(text: string): AppData | null {
  try {
    const parsed = JSON.parse(text) as Partial<AppData>
    if (!parsed || !Array.isArray(parsed.records)) return null
    return {
      version: 1,
      records: parsed.records,
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
      badges: parsed.badges ?? {},
    }
  } catch {
    return null
  }
}
