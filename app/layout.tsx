import type React from "react"
import type { Metadata } from "next"
import { Inter, Geist_Mono, Cairo } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
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
const _geistMono = Geist_Mono({ subsets: ["latin"] })
const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-arabic",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
})

export const metadata: Metadata = {
  title: "Folders | v0 App",
  description: "Dark mode folder management UI with thumbnails. Cards display folder name, file count, and timestamp. Includes new folder CTA and trial button.",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
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
        <Analytics />
      </body>
    </html>
  )
}
