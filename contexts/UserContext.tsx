"use client"

import { createContext, useContext, ReactNode } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

/**
 * FASE 41: USER CONTEXT
 * Single source of truth for current user data
 * Prevents duplicate API calls across components
 */

interface UserContextType {
  currentUser: any | undefined | null
  isLoading: boolean
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const currentUser = useQuery(api.users.getCurrentUser)

  return (
    <UserContext.Provider
      value={{
        currentUser,
        isLoading: currentUser === undefined,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

export function useCurrentUser() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error("useCurrentUser must be used within UserProvider")
  }
  return context
}
