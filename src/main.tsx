import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

// StrictMode は開発時にエフェクトを二重実行し、ベルが二度鳴るため使わない
createRoot(document.getElementById('root')!).render(<App />)
