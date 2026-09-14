import { useEffect, useMemo, useState } from 'react'
import type { AppData, Program, SessionRecord, Settings, Track } from './types'
import { useAppData, emptyData } from './lib/storage'
import { BADGES, currentStreak, todaySeconds, type Badge } from './lib/stats'
import { Home } from './components/Home'
import { Stats } from './components/Stats'
import { SettingsView } from './components/SettingsView'
import { Prepare } from './components/Prepare'
import { Player } from './components/Player'
import { Complete } from './components/Complete'

type Tab = 'home' | 'stats' | 'settings'

type Flow =
  | null
  | { stage: 'prepare'; program: Program }
  | { stage: 'playing'; program: Program; moodBefore?: number; durationSec: number; soundId: string }
  | { stage: 'complete'; program: Program; moodBefore?: number; elapsedSec: number; pending: SessionRecord; newBadges: Badge[] }

export default function App() {
  const [data, setData] = useAppData()
  const [tab, setTab] = useState<Tab>('home')
  const [flow, setFlow] = useState<Flow>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [tracksError, setTracksError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/audio/tracks.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`tracks.json: ${r.status}`))))
      .then((j: { tracks?: Track[] }) => setTracks(Array.isArray(j.tracks) ? j.tracks.filter((t) => t.id && t.file) : []))
      .catch((e: Error) => setTracksError(`tracks.json を読み込めませんでした（${e.message}）`))
  }, [])

  const settingsForPlay = useMemo<Settings | null>(() => {
    if (flow?.stage !== 'playing') return null
    return { ...data.settings, soundId: flow.soundId }
  }, [flow, data.settings])

  function handleFinish(elapsedSec: number) {
    if (flow?.stage !== 'playing') return
    const pending: SessionRecord = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      endedAt: new Date().toISOString(),
      durationSec: elapsedSec,
      programId: flow.program.id,
      moodBefore: flow.moodBefore,
    }
    const nextRecords = [...data.records, pending]
    const newBadges = BADGES.filter((b) => !data.badges[b.id] && b.check(nextRecords))
    setFlow({ stage: 'complete', program: flow.program, moodBefore: flow.moodBefore, elapsedSec, pending, newBadges })
  }

  function handleSave(opts: { moodAfter?: number; note?: string }) {
    if (flow?.stage !== 'complete') return
    const record: SessionRecord = { ...flow.pending, ...opts }
    const now = new Date().toISOString()
    const badges = { ...data.badges }
    for (const b of flow.newBadges) badges[b.id] = now
    // 気分アップ系バッジは保存時の値で再判定
    const nextRecords = [...data.records, record]
    for (const b of BADGES) if (!badges[b.id] && b.check(nextRecords)) badges[b.id] = now
    setData({ ...data, records: nextRecords, badges })
    setFlow(null)
    setTab('home')
  }

  if (flow?.stage === 'prepare') {
    return (
      <Prepare
        program={flow.program}
        settings={data.settings}
        tracks={tracks}
        onBack={() => setFlow(null)}
        onStart={({ moodBefore, durationSec, soundId }) => {
          // 選んだ環境音・長さは次回の初期値として記憶
          const patch: Partial<Settings> = { soundId }
          if (flow.program.category === 'free') patch.freeMinutes = Math.round(durationSec / 60)
          setData({ ...data, settings: { ...data.settings, ...patch } })
          setFlow({ stage: 'playing', program: flow.program, moodBefore, durationSec, soundId })
        }}
      />
    )
  }

  if (flow?.stage === 'playing' && settingsForPlay) {
    return (
      <Player
        key={flow.program.id}
        program={flow.program}
        durationSec={flow.durationSec}
        settings={settingsForPlay}
        tracks={tracks}
        onFinish={handleFinish}
        onCancel={() => setFlow(null)}
      />
    )
  }

  if (flow?.stage === 'complete') {
    const nextRecords = [...data.records, flow.pending]
    return (
      <Complete
        program={flow.program}
        elapsedSec={flow.elapsedSec}
        moodBefore={flow.moodBefore}
        streak={currentStreak(nextRecords)}
        todaySec={todaySeconds(nextRecords)}
        goalSec={data.settings.dailyGoalMin * 60}
        newBadges={flow.newBadges}
        onSave={handleSave}
      />
    )
  }

  return (
    <div className="app">
      <main>
        {tab === 'home' && <Home data={data} onSelect={(p) => setFlow({ stage: 'prepare', program: p })} />}
        {tab === 'stats' && (
          <Stats data={data} onDelete={(id) => setData({ ...data, records: data.records.filter((r) => r.id !== id) })} />
        )}
        {tab === 'settings' && (
          <SettingsView
            data={data}
            tracks={tracks}
            tracksError={tracksError}
            onChange={(s) => setData({ ...data, settings: s })}
            onImport={(d: AppData) => setData(d)}
            onReset={() => setData(emptyData())}
          />
        )}
      </main>
      <nav className="tabbar">
        <TabButton active={tab === 'home'} onClick={() => setTab('home')} icon="🧘" label="ホーム" />
        <TabButton active={tab === 'stats'} onClick={() => setTab('stats')} icon="📈" label="記録" />
        <TabButton active={tab === 'settings'} onClick={() => setTab('settings')} icon="⚙️" label="設定" />
      </nav>
    </div>
  )
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: string; label: string }) {
  return (
    <button className={'tab' + (active ? ' active' : '')} onClick={onClick}>
      <span className="tab-icon">{icon}</span>
      <span>{label}</span>
    </button>
  )
}
