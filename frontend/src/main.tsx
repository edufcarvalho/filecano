import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import "@/i18n/config"
import { App } from "./App.tsx"
import { ThemeProvider } from "@ui/theme-provider.tsx"
import { TooltipProvider } from "@ui/tooltip"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <TooltipProvider>
        <App />
      </TooltipProvider>
    </ThemeProvider>
  </StrictMode>
)
