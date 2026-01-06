import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ConvexClientProvider } from "@/components/providers/convex-client-provider"
import { GameWatcher } from "@/components/game-watcher"
import { AppHeader } from "@/components/AppHeader"
import { Toaster } from "sonner"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "ProArena - Plataforma Competitiva CS2",
  description: "Matchmaking competitivo para Counter-Strike 2",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt">
      <body className={inter.className}>
        <ConvexClientProvider>
          <GameWatcher />
          <AppHeader />
          {children}
          <Toaster position="top-right" richColors />
        </ConvexClientProvider>
      </body>
    </html>
  )
}
