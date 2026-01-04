"use client"

import { SignedIn, SignedOut } from "@clerk/nextjs"
import { LandingPage } from "@/components/landing-page"
import { Dashboard } from "@/components/dashboard"
import { useStoreUserEffect } from "@/hooks/use-store-user-effect"

export default function Home() {
  useStoreUserEffect()

  return (
    <>
      <SignedOut>
        <LandingPage />
      </SignedOut>
      <SignedIn>
        <Dashboard />
      </SignedIn>
    </>
  )
}
