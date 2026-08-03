import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/** GitHub Pages: VITE_BASE=/lianchang-os/ ；阿里云自定义域 os.v2way.com: VITE_BASE=/ */
const base = process.env.VITE_BASE ?? '/'

export default defineConfig({
  plugins: [react()],
  base,
})
