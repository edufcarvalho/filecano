import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

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
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    globals: true,
  },
})
