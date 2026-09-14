import { useState } from 'react'
import type { Program, Settings, Track } from '../types'
import { BUILTIN_SOUNDS } from '../lib/audio'
import { MoodPicker } from './MoodPicker'

type Props = {
  program: Program
  settings: Settings
  tracks: Track[]
  onStart: (opts: { moodBefore?: number; durationSec: number; soundId: string }) => void
  onBack: () => void
}

const FREE_MINUTES = [3, 5, 10, 15, 20, 30]

export function Prepare({ program, settings, tracks, onStart, onBack }: Props) {
  const [mood, setMood] = useState<number | undefined>()
  const [minutes, setMinutes] = useState(settings.freeMinutes)
  const [soundId, setSoundId] = useState(settings.soundId)

  const durationSec = program.category === 'free' ? minutes * 60 : program.durationSec

  return (
    <div className="screen prepare" style={{ ['--accent' as string]: program.color }}>
      <button className="back" onClick={onBack} aria-label="戻る">
        ←
      </button>
      <div className="prepare-hero">
        <div className="prepare-emoji">{program.emoji}</div>
        <h1>{program.title}</h1>
        <p className="muted">{program.subtitle} ・ {Math.round(durationSec / 60)}分</p>
      </div>

      <p className="prepare-desc">{program.description}</p>

      {program.breath && (
        <div className="chips readonly">
          {program.breath.map((p, i) => (
            <span key={i} className="chip">
              {p.label} {p.seconds}秒
            </span>
          ))}
        </div>
      )}

      {program.category === 'free' && (
        <section className="card">
          <h3>長さ</h3>
          <div className="chips">
            {FREE_MINUTES.map((m) => (
              <button key={m} className={'chip' + (m === minutes ? ' on' : '')} onClick={() => setMinutes(m)}>
                {m}分
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="card">
        <h3>いまの気分は？</h3>
        <MoodPicker value={mood} onChange={setMood} />
        <p className="hint">終わったあとと比べてみましょう。スキップしてもOK。</p>
      </section>

      <section className="card">
        <h3>環境音</h3>
        <div className="chips">
          {BUILTIN_SOUNDS.map((s) => (
            <button key={s.id} className={'chip' + (s.id === soundId ? ' on' : '')} onClick={() => setSoundId(s.id)}>
              {s.emoji} {s.title}
            </button>
          ))}
          {tracks.map((t) => (
            <button
              key={t.id}
              className={'chip' + (`track:${t.id}` === soundId ? ' on' : '')}
              onClick={() => setSoundId(`track:${t.id}`)}
            >
              🎧 {t.title}
            </button>
          ))}
        </div>
      </section>

      <div className="sticky-actions">
        <button className="btn primary big full" onClick={() => onStart({ moodBefore: mood, durationSec, soundId })}>
          はじめる
        </button>
      </div>
    </div>
  )
}
