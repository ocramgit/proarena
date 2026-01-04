"use client"

import { useState, useEffect, useRef } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, MessageSquare, X } from "lucide-react"
import { toast } from "sonner"

interface ChatPanelProps {
  channelId: string
  title?: string
  isTeamChat?: boolean
}

export function ChatPanel({ channelId, title = "Chat", isTeamChat = false }: ChatPanelProps) {
  const [message, setMessage] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const messages = useQuery(api.social.getMessages, { channelId, limit: 50 })
  const sendMessage = useMutation(api.social.sendMessage)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    try {
      await sendMessage({ channelId, content: message })
      setMessage("")
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-purple-600 px-4 py-3 font-bold text-white shadow-lg hover:bg-purple-700 transition-colors"
      >
        <MessageSquare className="h-5 w-5" />
        {title}
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 rounded-lg border border-zinc-800 bg-zinc-950 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 p-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-purple-500" />
          <h3 className="font-bold text-zinc-100">{title}</h3>
          {isTeamChat && (
            <span className="rounded-full bg-orange-600/20 px-2 py-0.5 text-xs font-bold text-orange-600">
              EQUIPA
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsOpen(false)}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="h-96 overflow-y-auto p-4 space-y-3">
        {messages && messages.length > 0 ? (
          messages.map((msg: any) => (
            <div key={msg._id} className="flex gap-2">
              <div className="h-8 w-8 flex-shrink-0 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white">
                {msg.author.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${msg.author.isPremium ? 'text-yellow-500' : 'text-zinc-100'}`}>
                    {msg.author.displayName}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {new Date(Number(msg.createdAt)).toLocaleTimeString('pt-PT', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-sm text-zinc-300 break-words">{msg.content}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-zinc-500">Nenhuma mensagem ainda</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="border-t border-zinc-800 p-4">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Escreve uma mensagem..."
            maxLength={500}
            className="flex-1 border-zinc-800 bg-zinc-900"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!message.trim()}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  )
}
