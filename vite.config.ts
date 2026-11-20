import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // ドメイン直下でも /meisou/ でも同じファイルで動く
  base: './',
})
