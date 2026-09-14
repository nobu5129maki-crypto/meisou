import type { ReactNode } from 'react'

type Props = {
  /** 0〜1 */
  progress: number
  size?: number
  stroke?: number
  color?: string
  track?: string
  children?: ReactNode
  className?: string
}

export function ProgressRing({
  progress,
  size = 120,
  stroke = 8,
  color = 'var(--accent)',
  track = 'rgba(255,255,255,0.08)',
  children,
  className,
}: Props) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const p = Math.min(1, Math.max(0, progress))
  return (
    <div className={'ring ' + (className ?? '')} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.4s linear' }}
        />
      </svg>
      <div className="ring-content">{children}</div>
    </div>
  )
}
