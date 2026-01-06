"use client"

import { SignedIn, SignedOut } from "@clerk/nextjs"
import { LandingPage } from "@/components/landing-page"
import { Dashboard } from "@/components/dashboard"
import { MatchmakingBar } from "@/components/MatchmakingBar"
import { MatchReadyModal } from "@/components/MatchReadyModal"
import { NicknameSetupModal } from "@/components/NicknameSetupModal"
import { useStoreUserEffect } from "@/hooks/use-store-user-effect"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Suspense } from "react"

function HomePageContent() {
  useStoreUserEffect()
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentUser = useQuery(api.users.getCurrentUser)
  const [showNicknameModal, setShowNicknameModal] = useState(false)

  // Redirect to onboarding if user doesn't have Steam linked
  useEffect(() => {
    if (currentUser && !currentUser.steamId) {
      router.push("/onboarding")
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
        <Dashboard />
        <MatchmakingBar />
        <MatchReadyModal />
        <NicknameSetupModal
          isOpen={showNicknameModal}
          onComplete={handleNicknameComplete}
          suggestedNickname={currentUser?.steamName?.replace(/\s+/g, "_").substring(0, 20)}
        />
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
