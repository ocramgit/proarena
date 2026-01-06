"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useChat } from "@/contexts/ChatContext"
import { Users, X, MessageCircle, UserPlus, Check, XCircle } from "lucide-react"
import { useMutation } from "convex/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

/**
 * FASE 38: SOCIAL SIDEBAR
 * Barra lateral direita com lista de amigos e pedidos pendentes
 */

export function SocialSidebar() {
  const { isSidebarOpen, toggleSidebar, openChat } = useChat()
  const friends = useQuery(api.friendsNew.getFriends)
  const pendingRequests = useQuery(api.friendsNew.getPendingRequests)
  const acceptRequest = useMutation(api.friendsNew.acceptFriendRequest)
  const rejectRequest = useMutation(api.friendsNew.removeFriendship)

  if (!isSidebarOpen) {
    return (
      <div className="fixed right-0 top-16 h-[calc(100vh-4rem)] w-16 bg-zinc-900/50 border-l border-zinc-800 flex flex-col items-center py-4 z-40">
        <button
          onClick={toggleSidebar}
          className="p-3 hover:bg-zinc-800 rounded-lg transition-colors"
          title="Abrir Lista de Amigos"
        >
          <Users className="w-5 h-5 text-zinc-400" />
        </button>
        {pendingRequests && pendingRequests.length > 0 && (
          <div className="absolute top-2 right-2 w-3 h-3 bg-orange-500 rounded-full" />
        )}
      </div>
    )
  }

  return (
    <div className="fixed right-0 top-16 h-[calc(100vh-4rem)] w-64 bg-zinc-900/95 backdrop-blur-sm border-l border-zinc-800 flex flex-col z-40">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-orange-500" />
          <h3 className="font-bold text-white">Amigos</h3>
        </div>
        <button
          onClick={toggleSidebar}
          className="p-1 hover:bg-zinc-800 rounded transition-colors"
        >
          <X className="w-4 h-4 text-zinc-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Pending Requests */}
        {pendingRequests && pendingRequests.length > 0 && (
          <div className="p-3 border-b border-zinc-800">
            <h4 className="text-xs font-bold text-zinc-400 uppercase mb-2">
              Pedidos Pendentes ({pendingRequests.length})
            </h4>
            <div className="space-y-2">
              {pendingRequests.map((request) => (
                <div
                  key={request.friendshipId}
                  className="flex items-center gap-2 p-2 bg-zinc-800/50 rounded-lg"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={request.steamAvatar} />
                    <AvatarFallback>{request.nickname?.[0] || "?"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {request.nickname || request.steamName}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => acceptRequest({ friendshipId: request.friendshipId })}
                      className="p-1 hover:bg-green-600 rounded transition-colors"
                      title="Aceitar"
                    >
                      <Check className="w-4 h-4 text-green-500" />
                    </button>
                    <button
                      onClick={() => rejectRequest({ friendshipId: request.friendshipId })}
                      className="p-1 hover:bg-red-600 rounded transition-colors"
                      title="Recusar"
                    >
                      <XCircle className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Friends List */}
        <div className="p-3">
          <h4 className="text-xs font-bold text-zinc-400 uppercase mb-2">
            Online ({friends?.length || 0})
          </h4>
          {friends && friends.length > 0 ? (
            <div className="space-y-1">
              {friends.map((friend) => (
                <button
                  key={friend.userId}
                  onClick={() => openChat(friend.userId, friend.nickname, friend.steamAvatar)}
                  className="w-full flex items-center gap-2 p-2 hover:bg-zinc-800 rounded-lg transition-colors group"
                >
                  <div className="relative">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={friend.steamAvatar} />
                      <AvatarFallback>{friend.nickname?.[0] || "?"}</AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-zinc-900 rounded-full" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-white truncate">
                      {friend.nickname || friend.steamName}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {Math.round(friend.elo_1v1)} ELO
                    </p>
                  </div>
                  <MessageCircle className="w-4 h-4 text-zinc-600 group-hover:text-orange-500 transition-colors" />
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <UserPlus className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-sm text-zinc-500">Sem amigos ainda</p>
              <p className="text-xs text-zinc-600 mt-1">
                Adiciona amigos nos perfis
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
