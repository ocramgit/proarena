"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "convex/react"
import { api } from "../convex/_generated/api"

export function GameWatcher() {
  // DISABLED: Let players navigate freely
  // Players can manually go to their active match from dashboard
  
  const router = useRouter()
  const activeMatch = useQuery(api.matches.getMyActiveMatch)

  // REMOVED: Auto-redirect to lobby
  // useEffect(() => {
  //   if (activeMatch) {
  //     router.push(`/lobby/${activeMatch._id}`)
  //   }
  // }, [activeMatch, router])

  return null
}
