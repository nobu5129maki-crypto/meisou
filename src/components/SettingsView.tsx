import { useRef, useState } from 'react'
import type { AppData, Settings, Track } from '../types'
import { BUILTIN_SOUNDS, audio } from '../lib/audio'
import { speak, speechSupported, stopSpeaking } from '../lib/speech'
import { exportJson, importJson } from '../lib/storage'
import { InstallHint } from './InstallHint'

type Props = {
  data: AppData
  tracks: Track[]
  tracksError: string | null
  onChange: (s: Settings) => void
  onImport: (d: AppData) => void
  onReset: () => void
}

export function SettingsView({ data, tracks, tracksError, onChange, onImport, onReset }: Props) {
  const s = data.settings
  const [previewing, setPreviewing] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    onChange({ ...s, [key]: value })
  }

  async function preview(id: string) {
    audio.unlock()
    if (previewing && id === s.soundId) {
      audio.stop(0.8)
      setPreviewing(false)
      return
    }
    set('soundId', id)
    setPreviewing(true)
    try {
      await audio.start(id, tracks, s.volume)
    } catch (e) {
      setMsg((e as Error).message)
      setPreviewing(false)
    }
  }

  function doExport() {
    const blob = new Blob([exportJson(data)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `meisou-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function doImport(file: File) {
    const text = await file.text()
    const parsed = importJson(text)
    if (!parsed) {
      setMsg('読み込めませんでした。バックアップ JSON を選んでください。')
      return
    }
    onImport(parsed)
    setMsg(`${parsed.records.length} 件の記録を読み込みました。`)
  }

  return (
    <div className="screen settings">
      <h1>設定</h1>
      <InstallHint compact />

      <section className="card">
        <h3>あなた</h3>
        <label className="field">
          <span>呼び名</span>
          <input className="input" value={s.name} placeholder="例: なお" onChange={(e) => set('name', e.target.value)} />
        </label>
        <label className="field">
          <span>
            1日の目標 <b>{s.dailyGoalMin}分</b>
          </span>
          <input type="range" min={1} max={60} value={s.dailyGoalMin} onChange={(e) => set('dailyGoalMin', Number(e.target.value))} />
          <div className="hint">続けるコツは低めに設定すること。3〜5分から始めて、慣れたら伸ばしましょう。</div>
        </label>
        <label className="field">
          <span>
            フリータイマーの初期値 <b>{s.freeMinutes}分</b>
          </span>
          <input type="range" min={1} max={60} value={s.freeMinutes} onChange={(e) => set('freeMinutes', Number(e.target.value))} />
        </label>
      </section>

      <section className="card">
        <h3>音</h3>
        <label className="switch">
          <input type="checkbox" checked={s.bell} onChange={(e) => set('bell', e.target.checked)} />
          <span>開始・終了のベル</span>
          <button
            className="chip"
            onClick={(e) => {
              e.preventDefault()
              audio.unlock()
              audio.bell()
            }}
          >
            試す
          </button>
        </label>
        <label className="switch">
          <input type="checkbox" checked={s.voice} disabled={!speechSupported()} onChange={(e) => set('voice', e.target.checked)} />
          <span>ガイドを音声で読み上げる{!speechSupported() && '（このブラウザは非対応）'}</span>
          {speechSupported() && (
            <button
              className="chip"
              onClick={(e) => {
                e.preventDefault()
                stopSpeaking()
                speak('ゆっくり吸って、ゆっくり吐きます。')
              }}
            >
              試す
            </button>
          )}
        </label>
        <label className="field">
          <span>
            環境音の音量 <b>{Math.round(s.volume * 100)}%</b>
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={s.volume}
            onChange={(e) => {
              set('volume', Number(e.target.value))
              audio.setVolume(Number(e.target.value))
            }}
          />
        </label>
        <div className="field">
          <span>環境音（タップで試聴）</span>
          <div className="chips">
            {BUILTIN_SOUNDS.map((b) => (
              <button key={b.id} className={'chip' + (b.id === s.soundId ? ' on' : '')} onClick={() => preview(b.id)} title={b.desc}>
                {b.emoji} {b.title}
              </button>
            ))}
            {tracks.map((t) => (
              <button
                key={t.id}
                className={'chip' + (`track:${t.id}` === s.soundId ? ' on' : '')}
                onClick={() => preview(`track:${t.id}`)}
              >
                🎧 {t.title}
              </button>
            ))}
          </div>
          {previewing && (
            <button
              className="btn ghost small"
              onClick={() => {
                audio.stop(0.8)
                setPreviewing(false)
              }}
            >
              試聴を止める
            </button>
          )}
        </div>
      </section>

      <section className="card">
        <h3>自分の音楽を追加する（Suno など）</h3>
        {tracksError && <div className="notice warn">{tracksError}</div>}
        <ol className="steps">
          <li>
            MP3 を <code>public/audio/</code> に置く（例: <code>public/audio/forest.mp3</code>）
          </li>
          <li>
            <code>public/audio/tracks.json</code> の <code>tracks</code> に追記:
            <pre>{`{ "id": "forest", "title": "森の朝", "file": "/audio/forest.mp3",
  "loopStart": 8, "loopEnd": 172, "crossfade": 6, "gain": 0.8 }`}</pre>
          </li>
          <li>再読み込みすると、環境音の一覧に「🎧 森の朝」が現れます</li>
        </ol>
        <div className="hint">
          loopStart / loopEnd（秒）でイントロ・アウトロを避け、crossfade（秒）で曲末と曲頭を重ねてつなぎ目を消します。gain は曲ごとの音量補正。
          現在 {tracks.length} 曲を読み込み中{tracks.length > 0 && `: ${tracks.map((t) => t.title).join('、')}`}。
        </div>
      </section>

      <section className="card">
        <h3>データ</h3>
        <div className="row-btns">
          <button className="btn ghost" onClick={doExport}>
            バックアップを保存
          </button>
          <button className="btn ghost" onClick={() => fileRef.current?.click()}>
            バックアップを読み込む
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void doImport(f)
              e.target.value = ''
            }}
          />
        </div>
        <div className="hint">記録はこの端末のブラウザに保存されます。機種変更や別ブラウザで使う前にバックアップしてください。</div>
        <button
          className="btn danger small"
          onClick={() => {
            if (confirm('すべての記録と設定を消します。よろしいですか？')) onReset()
          }}
        >
          すべてリセット
        </button>
      </section>

      {msg && (
        <div className="notice" onClick={() => setMsg(null)}>
          {msg}
        </div>
      )}
    </div>
  )
}
