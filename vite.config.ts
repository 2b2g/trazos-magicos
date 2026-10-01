import { defineConfig } from "vite";
import legacy from "@vitejs/plugin-legacy";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [
    legacy({
      // Chromium 37 (Android 5 WebView) needs ES5 + core-js polyfills.
      targets: ["chrome >= 37", "android >= 5", "safari >= 9"],
      additionalLegacyPolyfills: ["regenerator-runtime/runtime"],
      modernPolyfills: false,
    }),
  ],
  resolve: {
    alias: {
      "@engine": fileURLToPath(new URL("./src/engine", import.meta.url)),
      "@content": fileURLToPath(new URL("./src/content", import.meta.url)),
      "@screens": fileURLToPath(new URL("./src/screens", import.meta.url)),
      "@services": fileURLToPath(new URL("./src/services", import.meta.url)),
      "@util": fileURLToPath(new URL("./src/util", import.meta.url)),
    },
  },
  build: {
    cssTarget: "chrome37",
    outDir: "dist",
    assetsInlineLimit: 64 * 1024,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
});
