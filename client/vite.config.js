import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
    base: './',
    plugins: [react()],
    server: {
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:5000',
                changeOrigin: true,
                secure: false,
            },
            '/auth': {
                target: 'http://127.0.0.1:5000',
                changeOrigin: true,
                secure: false,
            }
        }
    }
})
