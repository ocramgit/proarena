"use client"

import React, { createContext, useContext, useState, ReactNode } from "react"
import { Id } from "@/convex/_generated/dataModel"

interface ChatWindow {
  userId: Id<"users">
  nickname: string | undefined
  steamAvatar: string | undefined
  isMinimized: boolean
}

interface ChatContextType {
  openChats: ChatWindow[]
  openChat: (userId: Id<"users">, nickname: string | undefined, steamAvatar: string | undefined) => void
  closeChat: (userId: Id<"users">) => void
  minimizeChat: (userId: Id<"users">) => void
  maximizeChat: (userId: Id<"users">) => void
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [openChats, setOpenChats] = useState<ChatWindow[]>([])

  const openChat = (userId: Id<"users">, nickname: string | undefined, steamAvatar: string | undefined) => {
    setOpenChats((prev) => {
      // Check if chat is already open
      const existing = prev.find((chat) => chat.userId === userId)
      if (existing) {
        // If minimized, maximize it
        return prev.map((chat) =>
          chat.userId === userId ? { ...chat, isMinimized: false } : chat
        )
      }

      // Add new chat (max 3 chats open)
      const newChat: ChatWindow = {
        userId,
        nickname,
        steamAvatar,
        isMinimized: false,
      }

      if (prev.length >= 3) {
        // Remove oldest chat
        return [...prev.slice(1), newChat]
      }

      return [...prev, newChat]
    })
  }

  const closeChat = (userId: Id<"users">) => {
    setOpenChats((prev) => prev.filter((chat) => chat.userId !== userId))
  }

  const minimizeChat = (userId: Id<"users">) => {
    setOpenChats((prev) =>
      prev.map((chat) =>
        chat.userId === userId ? { ...chat, isMinimized: true } : chat
      )
    )
  }

  const maximizeChat = (userId: Id<"users">) => {
    setOpenChats((prev) =>
      prev.map((chat) =>
        chat.userId === userId ? { ...chat, isMinimized: false } : chat
      )
    )
  }

  return (
    <ChatContext.Provider
      value={{
        openChats,
        openChat,
        closeChat,
        minimizeChat,
        maximizeChat,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error("useChat must be used within ChatProvider")
  }
  return context
}
