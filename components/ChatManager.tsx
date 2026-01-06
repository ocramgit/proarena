"use client"

import { useChat } from "@/contexts/ChatContext"
import { ChatWindow } from "./ChatWindow"

/**
 * FASE 38: CHAT MANAGER
 * Gere todas as janelas de chat abertas
 */

export function ChatManager() {
  const { openChats } = useChat()

  return (
    <>
      {openChats.map((chat, index) => (
        <ChatWindow
          key={chat.userId}
          userId={chat.userId}
          nickname={chat.nickname}
          steamAvatar={chat.steamAvatar}
          isMinimized={chat.isMinimized}
          index={index}
        />
      ))}
    </>
  )
}
