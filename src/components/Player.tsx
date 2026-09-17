import { useEffect, useRef, useState } from 'react'
import type { Program, Settings, Track } from '../types'
import { audio } from '../lib/audio'
import { speak, stopSpeaking } from '../lib/speech'
import { formatClock } from '../lib/stats'
import { ProgressRing } from './ProgressRing'
import { BreathCircle, breathState } from './BreathCircle'

type Props = {
  program: Program
  durationSec: number
  settings: Settings
  tracks: Track[]
  onFinish: (elapsedSec: number) => void
  onCancel: () => void
}

export function Player({ program, durationSec, settings, tracks, onFinish, onCancel }: Props) {
  const [elapsed, setElapsed] = useState(0)
  const [paused, setPaused] = useState(false)
  const [audioError, setAudioError] = useState<string | null>(null)
  const startRef = useRef<number>(performance.now())
  const accRef = useRef<number>(0) // 一時停止前までの累積 ms
  const finishedRef = useRef(false)
  const lastCueRef = useRef(-1)
  const lastPhaseRef = useRef<string>('')
  const wakeRef = useRef<{ release: () => Promise<void> } | null>(null)

  // 開始処理
  useEffect(() => {
    audio.unlock()
    if (settings.bell) audio.bell()
    audio.start(settings.soundId, tracks, settings.volume).catch((e: Error) => setAudioError(e.message))
    ;(async () => {
      try {
        const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }
        wakeRef.current = (await nav.wakeLock?.request('screen')) ?? null
      } catch {
        /* 非対応 */
      }
    })()
    return () => {
      audio.stop(2)
      stopSpeaking()
      wakeRef.current?.release().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // タイマー
  useEffect(() => {
    if (paused) return
    startRef.current = performance.now()
    const id = setInterval(() => {
      const ms = accRef.current + (performance.now() - startRef.current)
      const sec = ms / 1000
      if (sec >= durationSec) {
        setElapsed(durationSec)
        if (!finishedRef.current) {
          finishedRef.current = true
          clearInterval(id)
          if (settings.bell) audio.bell()
          stopSpeaking()
          setTimeout(() => onFinish(durationSec), 1200)
        }
        return
      }
      setElapsed(sec)
    }, 100)
    return () => {
      clearInterval(id)
      accRef.current += performance.now() - startRef.current
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, durationSec])

  // ガイド文（cue）
  const cues = program.cues ?? []
  let cueIdx = -1
  for (let i = 0; i < cues.length; i++) if (cues[i].at <= elapsed) cueIdx = i
  useEffect(() => {
    if (cueIdx !== lastCueRef.current && cueIdx >= 0) {
      lastCueRef.current = cueIdx
      if (settings.voice && !paused) speak(cues[cueIdx].text)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cueIdx])

  // 呼吸法の音声
  useEffect(() => {
    if (!program.breath) return
    const { phase } = breathState(program.breath, elapsed)
    if (phase.kind !== lastPhaseRef.current) {
      lastPhaseRef.current = phase.kind
      if (settings.voice && !paused) speak(phase.label)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed])

  const remaining = durationSec - elapsed
  const progress = elapsed / durationSec

  function togglePause() {
    if (!paused) stopSpeaking()
    setPaused((p) => !p)
  }

  function endNow() {
    // 自然終了の直後に押された場合は二重処理しない
    if (finishedRef.current) return
    finishedRef.current = true
    stopSpeaking()
    const ms = accRef.current + (paused ? 0 : performance.now() - startRef.current)
    const sec = Math.floor(ms / 1000)
    if (sec >= 30) {
      if (settings.bell) audio.bell()
      onFinish(sec)
    } else {
      onCancel()
    }
  }

  return (
    <div className="player" style={{ ['--accent' as string]: program.color }}>
      <div className="player-top">
        <div className="player-title">
          <span className="emoji">{program.emoji}</span> {program.title}
        </div>
        <div className="player-sub">{paused ? '一時停止中' : program.subtitle}</div>
      </div>

      <div className="player-center">
        {program.breath ? (
          <BreathCircle phases={program.breath} elapsed={elapsed} color={program.color} />
        ) : (
          <ProgressRing progress={progress} size={240} stroke={10} color={program.color}>
            <div className="player-clock">{formatClock(remaining)}</div>
            <div className="player-clock-sub">残り</div>
          </ProgressRing>
        )}
      </div>

      <div className="player-cue" key={cueIdx}>
        {program.breath
          ? `残り ${formatClock(remaining)}`
          : cueIdx >= 0
            ? cues[cueIdx].text
            : program.category === 'free'
              ? 'ただ、呼吸とともに座ります。'
              : '始めましょう。'}
      </div>

      {audioError && <div className="notice warn">{audioError}（内蔵音に切り替えるか、設定でファイルを確認してください）</div>}

      <div className="player-actions">
        <button className="btn ghost" onClick={endNow}>
          終了する
        </button>
        <button className="btn primary big" onClick={togglePause}>
          {paused ? '再開' : '一時停止'}
        </button>
      </div>
    </div>
  )
}
