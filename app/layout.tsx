import type React from "react"
import type { Metadata } from "next"
import { Inter, Cairo } from "next/font/google"
import { GenerationProvider } from "@/contexts/generation-context"
import { FolderProvider } from "@/contexts/folder-context"
import { SettingsProvider } from "@/contexts/settings-context"
import { I18nProvider } from "@/contexts/i18n-context"
import { DndProvider } from "@/contexts/dnd-context"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-latin",
  display: "swap",
})
const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-arabic",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
})

export const metadata: Metadata = {
  title: "Folders",
  description: "Local-first folder management for Windows and macOS.",
  icons: {
    icon: [
      { url: "/icons/folder1.png", sizes: "100x100", type: "image/png" },
      { url: "/icons/folder2.png", sizes: "200x200", type: "image/png" },
      { url: "/icons/folder3.png", sizes: "300x300", type: "image/png" },
      { url: "/icons/folder4.png", sizes: "400x400", type: "image/png" },
    ],
    shortcut: "/icons/folder2.png",
    apple: [
      { url: "/icons/folder3.png", sizes: "300x300", type: "image/png" },
      { url: "/icons/folder4.png", sizes: "400x400", type: "image/png" },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${cairo.variable}`}>
      <body className={`font-sans antialiased`} suppressHydrationWarning>
        <SettingsProvider>
          <I18nProvider>
            <GenerationProvider>
              <DndProvider>
                <FolderProvider>{children}</FolderProvider>
              </DndProvider>
            </GenerationProvider>
          </I18nProvider>
        </SettingsProvider>
      </body>
    </html>
  )
}
