import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@auth": path.resolve(__dirname, "./src/components/auth"),
      "@files": path.resolve(__dirname, "./src/components/files"),
      "@layout": path.resolve(__dirname, "./src/components/layout"),
      "@misc": path.resolve(__dirname, "./src/components/misc"),
      "@errors": path.resolve(__dirname, "./src/components/errors"),
      "@ui": path.resolve(__dirname, "./src/components/ui"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react-router-dom")) return "vendor-router"
          if (id.includes("node_modules/i18next") || id.includes("node_modules/react-i18next"))
            return "vendor-i18n"
          if (id.includes("node_modules/@radix-ui")) return "vendor-ui"
          if (
            id.includes("node_modules/react-day-picker") ||
            id.includes("node_modules/date-fns")
          )
            return "vendor-calendar"
        },
      },
    },
  },
})
