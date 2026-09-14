import type { Track } from '../types'

export type BuiltinSound = { id: string; title: string; emoji: string; desc: string }

/** Web Audio で生成する内蔵環境音（ファイル不要） */
export const BUILTIN_SOUNDS: BuiltinSound[] = [
  { id: 'none', title: '無音', emoji: '🔇', desc: 'ベルのみ' },
  { id: 'rain', title: '雨音', emoji: '🌧️', desc: 'しとしと降る雨' },
  { id: 'wind', title: '風', emoji: '🍃', desc: 'ゆるやかに吹く風' },
  { id: 'stream', title: '小川', emoji: '💧', desc: 'さらさら流れる水' },
  { id: 'drone', title: 'ドローン', emoji: '🎵', desc: '低く響く持続音' },
]

type Playing = {
  gain: GainNode
  nodes: AudioNode[]
  sources: (AudioBufferSourceNode | OscillatorNode)[]
  timer?: ReturnType<typeof setInterval>
}

class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private playing: Playing | null = null
  private bufferCache = new Map<string, AudioBuffer>()
  private noiseCache = new Map<string, AudioBuffer>()
  private startToken = 0

  private ensure() {
    if (!this.ctx) {
      this.ctx = new AudioContext()
      this.master = this.ctx.createGain()
      this.master.gain.value = 1
      this.master.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return { ctx: this.ctx, master: this.master! }
  }

  /** ユーザー操作直後に呼び、iOS 等で AudioContext を起こす */
  unlock() {
    this.ensure()
  }

  /** 開始・終了のベル（シンギングボウル風） */
  bell(volume = 0.7) {
    const { ctx, master } = this.ensure()
    const now = ctx.currentTime
    const base = 432
    const partials: [number, number, number][] = [
      // [倍率, 音量, 減衰秒]
      [1, 1, 6],
      [2.41, 0.45, 4.5],
      [3.93, 0.22, 3.2],
      [5.7, 0.1, 2.2],
    ]
    const out = ctx.createGain()
    out.gain.value = volume
    out.connect(master)
    for (const [ratio, amp, decay] of partials) {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = base * ratio
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, now)
      g.gain.linearRampToValueAtTime(amp * 0.35, now + 0.012)
      g.gain.exponentialRampToValueAtTime(0.0008, now + decay)
      osc.connect(g).connect(out)
      osc.start(now)
      osc.stop(now + decay + 0.1)
    }
  }

  private noise(kind: 'white' | 'pink' | 'brown'): AudioBuffer {
    const { ctx } = this.ensure()
    const cached = this.noiseCache.get(kind)
    if (cached) return cached
    const seconds = 6
    const len = ctx.sampleRate * seconds
    const buf = ctx.createBuffer(2, len, ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch)
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
      let last = 0
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1
        if (kind === 'white') {
          data[i] = white * 0.5
        } else if (kind === 'pink') {
          b0 = 0.99886 * b0 + white * 0.0555179
          b1 = 0.99332 * b1 + white * 0.0750759
          b2 = 0.969 * b2 + white * 0.153852
          b3 = 0.8665 * b3 + white * 0.3104856
          b4 = 0.55 * b4 + white * 0.5329522
          b5 = -0.7616 * b5 - white * 0.016898
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
          b6 = white * 0.115926
        } else {
          last = (last + 0.02 * white) / 1.02
          data[i] = last * 3.5
        }
      }
    }
    this.noiseCache.set(kind, buf)
    return buf
  }

  private noiseSource(kind: 'white' | 'pink' | 'brown') {
    const { ctx } = this.ensure()
    const src = ctx.createBufferSource()
    src.buffer = this.noise(kind)
    src.loop = true
    return src
  }

  private lfo(freq: number, depth: number, target: AudioParam) {
    const { ctx } = this.ensure()
    const osc = ctx.createOscillator()
    osc.frequency.value = freq
    const g = ctx.createGain()
    g.gain.value = depth
    osc.connect(g).connect(target)
    osc.start()
    return { osc, g }
  }

  private async trackBuffer(track: Track): Promise<AudioBuffer> {
    const { ctx } = this.ensure()
    const cached = this.bufferCache.get(track.id)
    if (cached) return cached
    const res = await fetch(track.file)
    if (!res.ok) throw new Error(`音源を読み込めません: ${track.file}`)
    const arr = await res.arrayBuffer()
    const buf = await ctx.decodeAudioData(arr)
    this.bufferCache.set(track.id, buf)
    return buf
  }

  /** 環境音を開始。soundId は内蔵 ID か `track:<id>` */
  async start(soundId: string, tracks: Track[], volume: number): Promise<void> {
    this.startToken++
    this.stop(0.6)
    if (soundId === 'none') return
    const { ctx, master } = this.ensure()
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.connect(master)
    const nodes: AudioNode[] = [gain]
    const sources: (AudioBufferSourceNode | OscillatorNode)[] = []
    let timer: ReturnType<typeof setInterval> | undefined

    if (soundId.startsWith('track:')) {
      const id = soundId.slice('track:'.length)
      const track = tracks.find((t) => t.id === id)
      if (!track) {
        // 登録が見つからない場合は内蔵の雨音にフォールバック
        gain.disconnect()
        return this.start('rain', tracks, volume)
      }
      const token = this.startToken
      const buf = await this.trackBuffer(track)
      // 読み込み中に別の音へ切り替えられた場合は破棄
      if (this.playing || token !== this.startToken) {
        gain.disconnect()
        return
      }
      const trackGain = ctx.createGain()
      trackGain.gain.value = track.gain ?? 1
      trackGain.connect(gain)
      nodes.push(trackGain)
      timer = this.scheduleCrossfadeLoop(buf, track, trackGain, sources, nodes)
    } else if (soundId === 'rain') {
      const body = this.noiseSource('pink')
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 3200
      const hp = ctx.createBiquadFilter()
      hp.type = 'highpass'
      hp.frequency.value = 300
      body.connect(hp).connect(lp).connect(gain)
      body.start()
      const drops = this.noiseSource('white')
      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 6500
      bp.Q.value = 0.7
      const dg = ctx.createGain()
      dg.gain.value = 0.12
      drops.connect(bp).connect(dg).connect(gain)
      drops.start()
      const l = this.lfo(0.08, 0.04, dg.gain)
      sources.push(body, drops, l.osc)
      nodes.push(lp, hp, bp, dg, l.g)
    } else if (soundId === 'wind') {
      const src = this.noiseSource('brown')
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 420
      lp.Q.value = 0.8
      src.connect(lp).connect(gain)
      src.start()
      const l1 = this.lfo(0.05, 220, lp.frequency)
      const l2 = this.lfo(0.013, 120, lp.frequency)
      sources.push(src, l1.osc, l2.osc)
      nodes.push(lp, l1.g, l2.g)
    } else if (soundId === 'stream') {
      const hiss = this.noiseSource('white')
      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 1800
      bp.Q.value = 0.9
      const hg = ctx.createGain()
      hg.gain.value = 0.45
      hiss.connect(bp).connect(hg).connect(gain)
      hiss.start()
      const low = this.noiseSource('brown')
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 260
      const lg = ctx.createGain()
      lg.gain.value = 0.7
      low.connect(lp).connect(lg).connect(gain)
      low.start()
      const l1 = this.lfo(0.3, 500, bp.frequency)
      const l2 = this.lfo(0.11, 0.12, hg.gain)
      sources.push(hiss, low, l1.osc, l2.osc)
      nodes.push(bp, hg, lp, lg, l1.g, l2.g)
    } else if (soundId === 'drone') {
      const freqs = [110, 110 * 1.5, 220, 220 * 1.25, 330]
      const amps = [0.5, 0.25, 0.22, 0.12, 0.08]
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 700
      lp.connect(gain)
      freqs.forEach((f, i) => {
        for (const det of [-3, 3]) {
          const osc = ctx.createOscillator()
          osc.type = i === 0 ? 'triangle' : 'sine'
          osc.frequency.value = f
          osc.detune.value = det
          const g = ctx.createGain()
          g.gain.value = amps[i] * 0.5
          osc.connect(g).connect(lp)
          osc.start()
          const l = this.lfo(0.04 + i * 0.013, amps[i] * 0.15, g.gain)
          sources.push(osc, l.osc)
          nodes.push(g, l.g)
        }
      })
      nodes.push(lp)
    } else {
      return
    }

    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 2.5)
    this.playing = { gain, nodes, sources, timer }
  }

  /**
   * 曲をクロスフェードでつなぎながらループ再生する。
   * loopStart〜loopEnd の区間を、終わりの crossfade 秒と次の始まりの crossfade 秒を重ねて再生。
   */
  private scheduleCrossfadeLoop(
    buf: AudioBuffer,
    track: Track,
    out: GainNode,
    sources: (AudioBufferSourceNode | OscillatorNode)[],
    nodes: AudioNode[],
  ) {
    const { ctx } = this.ensure()
    const start = Math.max(0, track.loopStart ?? 0)
    const end = Math.min(buf.duration, track.loopEnd ?? buf.duration)
    const segLen = Math.max(1, end - start)
    const xf = Math.min(track.crossfade ?? 4, segLen / 3)
    let nextAt = ctx.currentTime + 0.05
    let first = true

    const schedule = () => {
      // 常に 8 秒先まで予約しておく
      while (nextAt < ctx.currentTime + 8) {
        const src = ctx.createBufferSource()
        src.buffer = buf
        const g = ctx.createGain()
        const t0 = nextAt
        if (first) {
          g.gain.setValueAtTime(1, t0)
          first = false
        } else {
          g.gain.setValueAtTime(0, t0)
          g.gain.linearRampToValueAtTime(1, t0 + xf)
        }
        g.gain.setValueAtTime(1, t0 + segLen - xf)
        g.gain.linearRampToValueAtTime(0, t0 + segLen)
        src.connect(g).connect(out)
        src.start(t0, start, segLen)
        src.onended = () => {
          src.disconnect()
          g.disconnect()
        }
        sources.push(src)
        nodes.push(g)
        nextAt = t0 + segLen - xf
      }
    }
    schedule()
    return setInterval(schedule, 2000)
  }

  setVolume(volume: number) {
    if (!this.playing || !this.ctx) return
    this.playing.gain.gain.cancelScheduledValues(this.ctx.currentTime)
    this.playing.gain.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + 0.3)
  }

  stop(fadeSec = 2) {
    const p = this.playing
    if (!p || !this.ctx) return
    this.playing = null
    if (p.timer) clearInterval(p.timer)
    const now = this.ctx.currentTime
    p.gain.gain.cancelScheduledValues(now)
    p.gain.gain.setValueAtTime(p.gain.gain.value, now)
    p.gain.gain.linearRampToValueAtTime(0, now + fadeSec)
    setTimeout(() => {
      for (const s of p.sources) {
        try {
          s.stop()
        } catch {
          /* 既に停止 */
        }
        s.disconnect()
      }
      for (const n of p.nodes) n.disconnect()
    }, fadeSec * 1000 + 100)
  }

  isPlaying() {
    return !!this.playing
  }
}

export const audio = new AudioEngine()
