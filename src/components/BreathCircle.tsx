import type { BreathPhase } from '../types'

type Props = {
  phases: BreathPhase[]
  /** 経過秒 */
  elapsed: number
  color: string
}

export function breathState(phases: BreathPhase[], elapsed: number) {
  const cycle = phases.reduce((a, p) => a + p.seconds, 0)
  const t = ((elapsed % cycle) + cycle) % cycle
  let acc = 0
  for (const p of phases) {
    if (t < acc + p.seconds) {
      const within = t - acc
      return { phase: p, progress: within / p.seconds, remaining: p.seconds - within, cycle }
    }
    acc += p.seconds
  }
  const last = phases[phases.length - 1]
  return { phase: last, progress: 1, remaining: 0, cycle }
}

export function BreathCircle({ phases, elapsed, color }: Props) {
  const { phase, progress, remaining } = breathState(phases, elapsed)
  const min = 0.55
  let scale = min
  if (phase.kind === 'in') scale = min + (1 - min) * ease(progress)
  else if (phase.kind === 'hold') scale = 1
  else if (phase.kind === 'out') scale = 1 - (1 - min) * ease(progress)
  else scale = min

  return (
    <div className="breath-wrap">
      <div className="breath-halo" style={{ transform: `scale(${scale * 1.25})`, background: color }} />
      <div className="breath-circle" style={{ transform: `scale(${scale})`, background: color }}>
        <div className="breath-label">{phase.label}</div>
        <div className="breath-count">{Math.ceil(remaining)}</div>
      </div>
    </div>
  )
}

function ease(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}
