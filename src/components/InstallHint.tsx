import { useEffect, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const HIDE_KEY = 'meisou.install.hide'

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isIos() {
  const ua = navigator.userAgent
  const iPhone = /iphone|ipod/i.test(ua)
  const iPad = /ipad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  return iPhone || iPad
}

type Props = { compact?: boolean }

export function InstallHint({ compact }: Props) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(HIDE_KEY) === '1'
    } catch {
      return false
    }
  })
  const [ios, setIos] = useState(false)
  const [standalone, setStandalone] = useState(false)

  useEffect(() => {
    setIos(isIos())
    setStandalone(isStandalone())
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setDeferred(null)
      setStandalone(true)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (standalone) return null
  if (hidden && !compact) return null
  if (!deferred && !ios) {
    if (compact) {
      return (
        <section className="card">
          <h3>スマホに入れる</h3>
          <p className="hint" style={{ marginTop: 0 }}>
            ブラウザのメニューから「ホーム画面に追加」または「アプリをインストール」を選ぶと、アプリアイコンから開けます。
          </p>
        </section>
      )
    }
    return null
  }

  function dismiss() {
    try {
      localStorage.setItem(HIDE_KEY, '1')
    } catch {
      /* ignore */
    }
    setHidden(true)
  }

  async function install() {
    if (!deferred) return
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    if (outcome === 'accepted') setStandalone(true)
    setDeferred(null)
  }

  return (
    <section className="card install-card">
      <div className="install-row">
        <img className="install-icon" src="/icons/icon-192.png" alt="" width={48} height={48} />
        <div className="install-body">
          <div className="today-title">ホーム画面に追加</div>
          {ios ? (
            <p className="hint" style={{ marginTop: 4 }}>
              下部（または上部）の共有ボタンをタップし、「ホーム画面に追加」を選んでください。Safari で開いているときだけ追加できます。
            </p>
          ) : (
            <p className="hint" style={{ marginTop: 4 }}>
              インストールすると、アプリアイコンからすぐに瞑想を始められます。
            </p>
          )}
        </div>
      </div>
      <div className="row-btns" style={{ marginTop: '0.8rem' }}>
        {deferred && (
          <button className="btn primary" onClick={() => void install()}>
            インストール
          </button>
        )}
        <button className="btn ghost" onClick={dismiss}>
          あとで
        </button>
      </div>
    </section>
  )
}
