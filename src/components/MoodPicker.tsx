export const MOODS = [
  { value: 1, emoji: '😞', label: 'つらい' },
  { value: 2, emoji: '😕', label: 'もやもや' },
  { value: 3, emoji: '😐', label: 'ふつう' },
  { value: 4, emoji: '🙂', label: 'おだやか' },
  { value: 5, emoji: '😌', label: 'すっきり' },
]

export function moodEmoji(v?: number) {
  return MOODS.find((m) => m.value === v)?.emoji ?? '・'
}

type Props = {
  value?: number
  onChange: (v: number) => void
}

export function MoodPicker({ value, onChange }: Props) {
  return (
    <div className="mood-picker" role="radiogroup">
      {MOODS.map((m) => (
        <button
          key={m.value}
          type="button"
          role="radio"
          aria-checked={value === m.value}
          className={'mood' + (value === m.value ? ' selected' : '')}
          onClick={() => onChange(m.value)}
        >
          <span className="mood-emoji">{m.emoji}</span>
          <span className="mood-label">{m.label}</span>
        </button>
      ))}
    </div>
  )
}
