import "@fontsource-variable/inter"
import "@fontsource/cairo/300.css"
import "@fontsource/cairo/400.css"
import "@fontsource/cairo/500.css"
import "@fontsource/cairo/600.css"
import "@fontsource/cairo/700.css"
import "@fontsource/cairo/800.css"
import "./index.css"

import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { SettingsProvider } from "@/contexts/settings-context"
import { I18nProvider } from "@/contexts/i18n-context"
import { GenerationProvider } from "@/contexts/generation-context"
import { DndProvider } from "@/contexts/dnd-context"
import { FolderProvider } from "@/contexts/folder-context"
import { App } from "./App"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SettingsProvider>
      <I18nProvider>
        <GenerationProvider>
          <DndProvider>
            <FolderProvider>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </FolderProvider>
          </DndProvider>
        </GenerationProvider>
      </I18nProvider>
    </SettingsProvider>
  </React.StrictMode>,
)
