"use client"

import { SignedIn, SignedOut } from "@clerk/nextjs"
import { LandingPage } from "@/components/landing-page"
import { Dashboard } from "@/components/dashboard"
import { MatchmakingBar } from "@/components/MatchmakingBar"
import { MatchReadyModal } from "@/components/MatchReadyModal"
import { NicknameSetupModal } from "@/components/NicknameSetupModal"
import { ChatManager } from "@/components/ChatManager"
import { ChatProvider } from "@/contexts/ChatContext"
import { useStoreUserEffect } from "@/hooks/use-store-user-effect"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Suspense } from "react"

function DashboardWithSocial() {
  return (
    <ChatProvider>
      <Dashboard />
      <MatchmakingBar />
      <MatchReadyModal />
      <ChatManager />
    </ChatProvider>
  )
}

function HomePageContent() {
  useStoreUserEffect()
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentUser = useQuery(api.users.getCurrentUser)
  const [showNicknameModal, setShowNicknameModal] = useState(false)

  // Redirect to onboarding if user doesn't have Steam linked
  useEffect(() => {
    if (currentUser === undefined) return // Still loading
    
    if (currentUser && !currentUser.steamId) {
      console.log("⚠️ User has no steamId, redirecting to onboarding:", currentUser._id)
      router.push("/onboarding")
    } else if (currentUser && currentUser.steamId) {
      console.log("✅ User has steamId:", currentUser.steamId, "nickname:", currentUser.nickname)
    }
  }, [currentUser, router])

  // ALWAYS show nickname modal if user has Steam but no nickname
  useEffect(() => {
    if (currentUser === undefined) return // Still loading
    
    if (currentUser && currentUser.steamId && !currentUser.nickname) {
      setShowNicknameModal(true)
    }
  }, [currentUser])

  const handleNicknameComplete = () => {
    setShowNicknameModal(false)
    router.refresh()
  }

  return (
    <>
      <SignedOut>
        <LandingPage />
      </SignedOut>
      <SignedIn>
        {/* Block everything until nickname is set */}
        {currentUser && currentUser.steamId && !currentUser.nickname ? (
          <div className="min-h-screen bg-zinc-950">
            <NicknameSetupModal
              isOpen={true}
              onComplete={handleNicknameComplete}
              suggestedNickname={currentUser?.steamName?.replace(/\s+/g, "_").substring(0, 20)}
            />
          </div>
        ) : currentUser && currentUser.steamId ? (
          <DashboardWithSocial />
        ) : null}
      </SignedIn>
    </>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center"><div className="text-zinc-400">A carregar...</div></div>}>
      <HomePageContent />
    </Suspense>
  )
}
