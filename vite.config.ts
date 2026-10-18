import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { localRomanianTts } from "./scripts/local-tts-plugin.mjs";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const proxy = { "/api/tts": { target: env.ROMANA_TTS_ORIGIN || "http://127.0.0.1:8792", changeOrigin: true } };
  return {
  server: { proxy },
  preview: { proxy },
  plugins: [
    react(),
    tailwindcss(),
    ...(mode === "test" ? [] : [localRomanianTts(env)]),
    VitePWA({
      registerType: "prompt",
      injectRegister: false,
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
        clientsClaim: true,
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
            urlPattern: /\/audio\/lookup\/[a-f0-9]+\/[a-f0-9]{2}\.json$/,
            handler: "CacheFirst",
            options: { cacheName: "romana-audio-lookup-v1", expiration: { maxEntries: 32 }, cacheableResponse: { statuses: [200] } },
          },
          {
            urlPattern: /\/audio\/.*\.mp3$/,
            handler: "CacheFirst",
            options: {
              cacheName: "romana-audio-v2",
              rangeRequests: true,
              cacheableResponse: { statuses: [200], headers: { "content-type": "audio/mpeg" } },
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
  };
});
