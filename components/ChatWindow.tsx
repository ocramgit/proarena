"use client"

import { useState, useRef, useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { useChat } from "@/contexts/ChatContext"
import { X, Minus, Send } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

/**
 * FASE 38: CHAT WINDOW
 * Janela flutuante de chat direto
 */

interface ChatWindowProps {
  userId: Id<"users">
  nickname: string | undefined
  steamAvatar: string | undefined
  isMinimized: boolean
  index: number
}

export function ChatWindow({ userId, nickname, steamAvatar, isMinimized, index }: ChatWindowProps) {
  const { closeChat, minimizeChat, maximizeChat } = useChat()
  const [message, setMessage] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  const conversation = useQuery(api.directMessages.getConversation, { otherUserId: userId })
  const sendMessage = useMutation(api.directMessages.sendMessage)
  const markAsRead = useMutation(api.directMessages.markAsRead)
  const currentUser = useQuery(api.users.getCurrentUser)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current && !isMinimized) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [conversation, isMinimized])

  // Mark messages as read when chat is opened
  useEffect(() => {
    if (!isMinimized && userId) {
      markAsRead({ senderId: userId })
    }
  }, [isMinimized, userId, markAsRead])

  const handleSend = async () => {
    if (!message.trim()) return

    try {
      await sendMessage({
        receiverId: userId,
        content: message,
      })
      setMessage("")
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Position from right (no sidebar, just stack chats)
  const rightOffset = 16 + (index * 320) // 16px margin + 320px per chat

  if (isMinimized) {
    return (
      <div
        className="fixed bottom-0 w-72 bg-zinc-900 border border-zinc-800 rounded-t-lg shadow-xl z-50"
        style={{ right: `${rightOffset}px` }}
      >
        <button
          onClick={() => maximizeChat(userId)}
          className="w-full flex items-center gap-2 p-3 hover:bg-zinc-800 transition-colors"
        >
          <Avatar className="w-8 h-8">
            <AvatarImage src={steamAvatar} />
            <AvatarFallback>{nickname?.[0] || "?"}</AvatarFallback>
          </Avatar>
          <span className="flex-1 text-sm font-medium text-white truncate">
            {nickname || "User"}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              closeChat(userId)
            }}
            className="p-1 hover:bg-zinc-700 rounded transition-colors"
          >
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </button>
      </div>
    )
  }

  return (
    <div
      className="fixed bottom-0 w-72 h-96 bg-zinc-900 border border-zinc-800 rounded-t-lg shadow-xl flex flex-col z-50"
      style={{ right: `${rightOffset}px` }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-zinc-800 bg-zinc-900/95">
        <Avatar className="w-8 h-8">
          <AvatarImage src={steamAvatar} />
          <AvatarFallback>{nickname?.[0] || "?"}</AvatarFallback>
        </Avatar>
        <span className="flex-1 text-sm font-medium text-white truncate">
          {nickname || "User"}
        </span>
        <button
          onClick={() => minimizeChat(userId)}
          className="p-1 hover:bg-zinc-800 rounded transition-colors"
        >
          <Minus className="w-4 h-4 text-zinc-400" />
        </button>
        <button
          onClick={() => closeChat(userId)}
          className="p-1 hover:bg-zinc-800 rounded transition-colors"
        >
          <X className="w-4 h-4 text-zinc-400" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 p-3 overflow-y-auto" ref={scrollRef}>
        <div className="space-y-2">
          {conversation && conversation.length > 0 ? (
            conversation.map((msg) => {
              const isCurrentUser = msg.senderId === currentUser?._id
              return (
                <div
                  key={msg._id}
                  className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-2 ${
                      isCurrentUser
                        ? "bg-orange-600 text-white"
                        : "bg-zinc-800 text-zinc-100"
                    }`}
                  >
                    <p className="text-sm break-words">{msg.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(Number(msg.timestamp)).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-zinc-500">Sem mensagens ainda</p>
              <p className="text-xs text-zinc-600 mt-1">Envia a primeira mensagem!</p>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="p-3 border-t border-zinc-800">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Escreve uma mensagem..."
            className="flex-1 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
            maxLength={500}
          />
          <Button
            onClick={handleSend}
            disabled={!message.trim()}
            size="icon"
            className="bg-orange-600 hover:bg-orange-500"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
