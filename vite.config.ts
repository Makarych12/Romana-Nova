import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icon.svg", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "ROMÂNA NOVA — Академия румынского языка",
        short_name: "ROMÂNA NOVA",
        description:
          "Румынский язык с нуля. Уроки и практика с сохранением прогресса.",
        lang: "ru",
        theme_color: "#07152F",
        background_color: "#07152F",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,jpg,webp,woff2}"],
        globIgnores: ["data/**", "audio/**", "photos/**"],
        additionalManifestEntries: [
          { url: "/photos/water.jpg", revision: "original-1" },
          { url: "/photos/bread.jpg", revision: "original-1" },
          { url: "/photos/book.jpg", revision: "original-1" },
          { url: "/photos/coffee.jpg", revision: "original-1" },
        ],
        runtimeCaching: [
          {
            urlPattern: /\/audio\/.*\.mp3$/,
            handler: "CacheFirst",
            options: {
              cacheName: "romana-audio-v1",
              rangeRequests: true,
              cacheableResponse: { statuses: [200] },
              expiration: { maxEntries: 1500, maxAgeSeconds: 7776000 },
            },
          },
          {
            urlPattern: /\/photos\//,
            handler: "CacheFirst",
            options: {
              cacheName: "romana-photos-v1",
              cacheableResponse: { statuses: [200] },
              expiration: { maxEntries: 300, maxAgeSeconds: 7776000 },
            },
          },
          {
            urlPattern: /\/data\/vocabulary-[a-f0-9]+\.json$/,
            handler: "CacheFirst",
            options: {
              cacheName: "romana-vocabulary-v1",
              cacheableResponse: { statuses: [200] },
              expiration: { maxEntries: 3, maxAgeSeconds: 31536000 },
            },
          },
        ],
        maximumFileSizeToCacheInBytes: 3000000,
      },
    }),
  ],
});
