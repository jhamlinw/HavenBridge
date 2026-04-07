import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'https://intex-backend-one-two-b8chggdma6buaee7.francecentral-01.azurewebsites.net',
    },
  },
})
