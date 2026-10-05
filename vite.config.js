import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// base './' giúp app chạy được cả ở domain gốc (Vercel, Cloudflare Pages)
// lẫn thư mục con (GitHub Pages: username.github.io/shuru-tracker/).
const PREVIEW = process.env.PREVIEW === '1';

export default defineConfig({
  base: './',
  build: { outDir: 'docs', emptyOutDir: true, chunkSizeWarningLimit: 900 },
  plugins: [
    react(),
    tailwindcss(),
    !PREVIEW && VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Shuru Workout & PFC Tracker',
        short_name: 'Shuru',
        description: 'Lịch tập 6 ngày, nhật ký PFC và cân nặng — chạy 100% offline trên máy.',
        lang: 'vi',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0e0e10',
        theme_color: '#0e0e10',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
});
