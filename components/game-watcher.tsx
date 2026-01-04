"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "convex/react"
import { api } from "../convex/_generated/api"

export function GameWatcher() {
  const router = useRouter()
  const activeMatch = useQuery(api.matches.getMyActiveMatch)

  useEffect(() => {
    if (activeMatch) {
      router.push(`/lobby/${activeMatch._id}`)
    }
  }, [activeMatch, router])

  return null
}
