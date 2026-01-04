"use client"

import { useState } from "react"
import { ChatPanel } from "./chat-panel"
import { Id } from "@/convex/_generated/dataModel"

interface LobbyChatProps {
  matchId: Id<"matches">
  userTeam: "A" | "B"
}

export function LobbyChat({ matchId, userTeam }: LobbyChatProps) {
  const [activeTab, setActiveTab] = useState<"all" | "team">("all")

  return (
    <div className="space-y-4">
      {/* Tab Selector */}
      <div className="flex gap-2 border-b border-zinc-800">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2 font-bold transition-colors ${
            activeTab === "all"
              ? "border-b-2 border-purple-600 text-purple-600"
              : "text-zinc-400 hover:text-zinc-100"
          }`}
        >
          Chat Geral
        </button>
        <button
          onClick={() => setActiveTab("team")}
          className={`px-4 py-2 font-bold transition-colors ${
            activeTab === "team"
              ? "border-b-2 border-orange-600 text-orange-600"
              : "text-zinc-400 hover:text-zinc-100"
          }`}
        >
          Chat de Equipa
        </button>
      </div>

      {/* Chat Content */}
      {activeTab === "all" ? (
        <ChatPanel
          channelId={`match_${matchId}`}
          title="Chat Geral"
          isTeamChat={false}
        />
      ) : (
        <ChatPanel
          channelId={`match_${matchId}_team${userTeam}`}
          title={`Chat Team ${userTeam}`}
          isTeamChat={true}
        />
      )}
    </div>
  )
}
