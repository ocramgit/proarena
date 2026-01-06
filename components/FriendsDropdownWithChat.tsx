"use client"

import { useChat } from "@/contexts/ChatContext"
import { FriendsDropdown } from "./FriendsDropdown"

/**
 * Wrapper for FriendsDropdown that uses ChatContext
 * Only use this inside ChatProvider
 */
export function FriendsDropdownWithChat({ children }: { children: React.ReactNode }) {
  const { openChat } = useChat()
  
  return (
    <FriendsDropdown onOpenChat={openChat}>
      {children}
    </FriendsDropdown>
  )
}
