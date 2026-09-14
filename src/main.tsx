import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* オフライン登録失敗は無視 */
    })
  })
}

// StrictMode は開発時にエフェクトを二重実行し、ベルが二度鳴るため使わない
createRoot(document.getElementById('root')!).render(<App />)
