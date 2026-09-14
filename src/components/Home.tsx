import type { AppData, Program } from '../types'
import { PROGRAMS } from '../data/programs'
import { quoteOfTheDay } from '../data/quotes'
import { currentStreak, formatMinutes, greeting, levelInfo, timeOfDay, todaySeconds, totalSeconds } from '../lib/stats'
import { ProgressRing } from './ProgressRing'

type Props = {
  data: AppData
  onSelect: (p: Program) => void
}

export function Home({ data, onSelect }: Props) {
  const { records, settings } = data
  const streak = currentStreak(records)
  const today = todaySeconds(records)
  const goal = settings.dailyGoalMin * 60
  const total = totalSeconds(records)
  const lv = levelInfo(total)
  const tod = timeOfDay()
  const doneToday = today >= goal

  const recommended =
    PROGRAMS.find((p) => p.bestFor?.includes(tod) && p.category === 'guided' && !records.some((r) => r.programId === p.id && sameDay(r.endedAt))) ??
    PROGRAMS.find((p) => p.bestFor?.includes(tod)) ??
    PROGRAMS[0]

  const guided = PROGRAMS.filter((p) => p.category === 'guided')
  const breath = PROGRAMS.filter((p) => p.category === 'breath')
  const free = PROGRAMS.filter((p) => p.category === 'free')

  return (
    <div className="screen home">
      <header className="home-head">
        <div>
          <div className="muted">{greeting()}{settings.name ? `、${settings.name}さん` : ''}</div>
          <h1>{doneToday ? '今日の目標、達成しました' : streak > 0 ? `${streak}日連続で続いています` : '今日、はじめてみましょう'}</h1>
        </div>
        <div className="streak-pill" title="連続日数">
          🔥 {streak}
        </div>
      </header>

      <section className="card today">
        <ProgressRing progress={goal ? today / goal : 0} size={112} stroke={9} color={doneToday ? '#7fd1b9' : 'var(--accent)'}>
          <div className="ring-big">{Math.round(today / 60)}</div>
          <div className="ring-small">/ {settings.dailyGoalMin}分</div>
        </ProgressRing>
        <div className="today-text">
          <div className="today-title">今日の瞑想</div>
          <div className="muted">
            {doneToday
              ? 'もう一回座ると、明日がさらに楽になります。'
              : today > 0
                ? `あと${formatMinutes(goal - today)}で目標達成です。`
                : `目標は${settings.dailyGoalMin}分。短くていいので、まず座りましょう。`}
          </div>
          <div className="level-line">
            <span>
              Lv.{lv.level} {lv.emoji} {lv.title}
            </span>
            <div className="level-bar">
              <div style={{ width: `${lv.progress * 100}%` }} />
            </div>
            {lv.next && <span className="hint">次まで {formatMinutes(lv.next.minMinutes * 60 - total)}</span>}
          </div>
        </div>
      </section>

      <section className="card quote">
        <div className="quote-label">達人からのひとこと</div>
        <p>{quoteOfTheDay()}</p>
      </section>

      <section>
        <h2 className="section-title">いまのおすすめ</h2>
        <ProgramCard program={recommended} onSelect={onSelect} featured />
      </section>

      <section>
        <h2 className="section-title">ガイド付き瞑想</h2>
        <div className="program-grid">
          {guided.map((p) => (
            <ProgramCard key={p.id} program={p} onSelect={onSelect} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="section-title">呼吸法</h2>
        <div className="program-grid">
          {breath.map((p) => (
            <ProgramCard key={p.id} program={p} onSelect={onSelect} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="section-title">自由に座る</h2>
        <div className="program-grid">
          {free.map((p) => (
            <ProgramCard key={p.id} program={p} onSelect={onSelect} />
          ))}
        </div>
      </section>
    </div>
  )
}

function sameDay(iso: string) {
  const d = new Date(iso)
  const n = new Date()
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate()
}

function ProgramCard({ program, onSelect, featured }: { program: Program; onSelect: (p: Program) => void; featured?: boolean }) {
  return (
    <button
      className={'program-card' + (featured ? ' featured' : '')}
      style={{ ['--accent' as string]: program.color }}
      onClick={() => onSelect(program)}
    >
      <div className="program-emoji">{program.emoji}</div>
      <div className="program-body">
        <div className="program-title">{program.title}</div>
        <div className="program-sub">{program.subtitle}</div>
        {featured && <div className="program-desc">{program.description}</div>}
      </div>
      <div className="program-min">{program.category === 'free' ? '自由' : `${Math.round(program.durationSec / 60)}分`}</div>
    </button>
  )
}
