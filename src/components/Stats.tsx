import type { AppData } from '../types'
import { getProgram } from '../data/programs'
import {
  BADGES,
  addDays,
  bestStreak,
  currentStreak,
  dayKey,
  formatMinutes,
  moodDelta,
  secondsByDay,
  totalSeconds,
} from '../lib/stats'
import { moodEmoji } from './MoodPicker'

type Props = {
  data: AppData
  onDelete: (id: string) => void
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

export function Stats({ data, onDelete }: Props) {
  const { records, badges } = data
  const byDay = secondsByDay(records)
  const streak = currentStreak(records)
  const best = bestStreak(records)
  const total = totalSeconds(records)
  const mood = moodDelta(records)

  // ヒートマップ: 直近 12 週（今日を含む週の土曜まで）
  const today = new Date()
  const end = addDays(today, 6 - today.getDay())
  const start = addDays(end, -(12 * 7 - 1))
  const cells: { key: string; sec: number; future: boolean }[] = []
  for (let i = 0; i < 12 * 7; i++) {
    const d = addDays(start, i)
    const key = dayKey(d)
    cells.push({ key, sec: byDay.get(key) ?? 0, future: d > today })
  }
  const maxSec = Math.max(60, ...cells.map((c) => c.sec))

  // 直近 7 日の棒グラフ
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(today, i - 6)
    return { d, sec: byDay.get(dayKey(d)) ?? 0 }
  })
  const weekMax = Math.max(data.settings.dailyGoalMin * 60, ...week.map((w) => w.sec))

  const recent = [...records].sort((a, b) => b.endedAt.localeCompare(a.endedAt)).slice(0, 12)

  return (
    <div className="screen stats">
      <h1>記録</h1>

      <div className="stat-row">
        <div className="stat">
          <div className="stat-num">🔥 {streak}</div>
          <div className="stat-label">連続日数</div>
        </div>
        <div className="stat">
          <div className="stat-num">{best}</div>
          <div className="stat-label">最長連続</div>
        </div>
        <div className="stat">
          <div className="stat-num">{formatMinutes(total)}</div>
          <div className="stat-label">合計</div>
        </div>
        <div className="stat">
          <div className="stat-num">{records.length}</div>
          <div className="stat-label">回数</div>
        </div>
      </div>

      <section className="card">
        <h3>この1週間</h3>
        <div className="bars">
          {week.map(({ d, sec }) => {
            const met = sec >= data.settings.dailyGoalMin * 60
            return (
              <div key={dayKey(d)} className="bar-col">
                <div className="bar-val">{sec ? Math.round(sec / 60) : ''}</div>
                <div className="bar-track">
                  <div className={'bar' + (met ? ' met' : '')} style={{ height: `${Math.max(sec ? 6 : 0, (sec / weekMax) * 100)}%` }} />
                </div>
                <div className="bar-label">{WEEKDAYS[d.getDay()]}</div>
              </div>
            )
          })}
        </div>
        <div className="hint">数字は分。緑は目標達成日。</div>
      </section>

      <section className="card">
        <h3>12週間の足あと</h3>
        <div className="heatmap">
          {cells.map((c) => (
            <div
              key={c.key}
              className={'cell' + (c.future ? ' future' : '') + (c.key === dayKey(today) ? ' today' : '')}
              style={{ opacity: c.sec ? 0.35 + 0.65 * Math.min(1, c.sec / maxSec) : undefined }}
              title={`${c.key} ${c.sec ? formatMinutes(c.sec) : '—'}`}
            />
          ))}
        </div>
      </section>

      {mood.count > 0 && (
        <section className="card">
          <h3>気分の変化</h3>
          <div className="mood-delta">
            <span className="big">{mood.avg > 0 ? '+' : ''}{mood.avg.toFixed(1)}</span>
            <span className="muted">段階（{mood.count}回の平均）</span>
          </div>
          <div className="hint">
            {mood.avg >= 1
              ? '瞑想のあと、はっきり気分が軽くなっています。'
              : mood.avg > 0
                ? '少しずつ、良い方向に動いています。'
                : '数字が動かなくても、観察できていること自体が練習です。'}
          </div>
        </section>
      )}

      <section className="card">
        <h3>
          バッジ <span className="muted small">{Object.keys(badges).length} / {BADGES.length}</span>
        </h3>
        <div className="badge-grid">
          {BADGES.map((b) => {
            const got = badges[b.id]
            return (
              <div key={b.id} className={'badge' + (got ? ' got' : '')} title={got ? `獲得: ${new Date(got).toLocaleDateString('ja-JP')}` : b.desc}>
                <div className="badge-emoji">{got ? b.emoji : '🔒'}</div>
                <div className="badge-title">{b.title}</div>
                <div className="hint">{b.desc}</div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="card">
        <h3>最近の記録</h3>
        {recent.length === 0 && <p className="muted">まだ記録がありません。最初の一回を待っています。</p>}
        <ul className="records">
          {recent.map((r) => {
            const p = getProgram(r.programId)
            const d = new Date(r.endedAt)
            return (
              <li key={r.id}>
                <span className="rec-emoji">{p.emoji}</span>
                <div className="rec-body">
                  <div className="rec-title">
                    {p.title} <span className="muted">{formatMinutes(r.durationSec)}</span>
                  </div>
                  <div className="hint">
                    {d.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' })}{' '}
                    {d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                    {(r.moodBefore || r.moodAfter) && (
                      <>
                        {' ・ '}
                        {moodEmoji(r.moodBefore)} → {moodEmoji(r.moodAfter)}
                      </>
                    )}
                  </div>
                  {r.note && <div className="rec-note">{r.note}</div>}
                </div>
                <button className="icon-btn" aria-label="削除" onClick={() => onDelete(r.id)}>
                  ×
                </button>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
