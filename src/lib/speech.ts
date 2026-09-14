/** ブラウザの音声合成でガイドを読み上げる（ファイル不要） */

let jaVoice: SpeechSynthesisVoice | null = null

function pickVoice() {
  if (typeof speechSynthesis === 'undefined') return null
  if (jaVoice) return jaVoice
  const voices = speechSynthesis.getVoices()
  const ja = voices.filter((v) => v.lang.startsWith('ja'))
  // 自然めな音声を優先
  const preferred = ja.find((v) => /Google|Kyoko|O-ren|Nanami|Ayumi|Haruka/i.test(v.name)) ?? ja[0]
  jaVoice = preferred ?? null
  return jaVoice
}

if (typeof speechSynthesis !== 'undefined') {
  speechSynthesis.addEventListener?.('voiceschanged', () => {
    jaVoice = null
    pickVoice()
  })
}

export function speechSupported() {
  return typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined'
}

export function speak(text: string) {
  if (!speechSupported()) return
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'ja-JP'
  const v = pickVoice()
  if (v) u.voice = v
  u.rate = 0.88
  u.pitch = 1
  u.volume = 0.9
  speechSynthesis.speak(u)
}

export function stopSpeaking() {
  if (!speechSupported()) return
  speechSynthesis.cancel()
}
