import { useState } from 'react'
import type { Program } from '../types'
import type { Badge } from '../lib/stats'
import { formatMinutes } from '../lib/stats'
import { MoodPicker } from './MoodPicker'

type Props = {
  program: Program
  elapsedSec: number
  moodBefore?: number
  streak: number
  todaySec: number
  goalSec: number
  newBadges: Badge[]
  onSave: (opts: { moodAfter?: number; note?: string }) => void
}

const PRAISES = [
  'おつかれさまでした。',
  'よく座れましたね。',
  'この時間を自分にあげられたこと、それ自体が成果です。',
  '今日も戻ってきましたね。',
  '静かな時間を、ひとつ積み重ねました。',
]

export function Complete({ program, elapsedSec, moodBefore, streak, todaySec, goalSec, newBadges, onSave }: Props) {
  const [mood, setMood] = useState<number | undefined>()
  const [note, setNote] = useState('')
  // 再描画で文言が変わらないよう初回に一度だけ選ぶ
  const [praise] = useState(() => PRAISES[Math.floor(Math.random() * PRAISES.length)])
  const goalMet = todaySec >= goalSec
  const delta = mood != null && moodBefore != null ? mood - moodBefore : null

  return (
    <div className="screen complete" style={{ ['--accent' as string]: program.color }}>
      <div className="complete-hero">
        <div className="complete-check">✓</div>
        <h1>{praise}</h1>
        <p className="muted">
          {program.emoji} {program.title} ・ {formatMinutes(elapsedSec)}
        </p>
      </div>

      <div className="stat-row">
        <div className="stat">
          <div className="stat-num">🔥 {streak}</div>
          <div className="stat-label">日連続</div>
        </div>
        <div className="stat">
          <div className="stat-num">{formatMinutes(todaySec)}</div>
          <div className="stat-label">今日の合計</div>
        </div>
        <div className="stat">
          <div className="stat-num">{goalMet ? '達成 🎉' : `あと${formatMinutes(goalSec - todaySec)}`}</div>
          <div className="stat-label">今日の目標</div>
        </div>
      </div>

      {newBadges.length > 0 && (
        <section className="card badges-new">
          <h3>新しいバッジ</h3>
          {newBadges.map((b) => (
            <div key={b.id} className="badge-row">
              <span className="badge-emoji">{b.emoji}</span>
              <div>
                <div className="badge-title">{b.title}</div>
                <div className="hint">{b.desc}</div>
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="card">
        <h3>いまの気分は？</h3>
        <MoodPicker value={mood} onChange={setMood} />
        {delta != null && (
          <p className="hint">
            {delta > 0 ? `前より ${delta} 段階、軽くなりました ☀️` : delta === 0 ? '変わらず。それも大切な観察です。' : '少し重く感じる日もあります。気づけたことが練習です。'}
          </p>
        )}
      </section>

      <section className="card">
        <h3>ひとことメモ（任意）</h3>
        <textarea
          className="input"
          rows={2}
          placeholder="気づいたこと、体の感じ、なんでも"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </section>

      <div className="sticky-actions">
        <button className="btn primary big full" onClick={() => onSave({ moodAfter: mood, note: note.trim() || undefined })}>
          記録して戻る
        </button>
      </div>
    </div>
  )
}
