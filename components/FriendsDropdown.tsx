"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Users, MessageCircle, UserPlus, Check, XCircle, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { useState } from "react"
import { toast } from "sonner"

/**
 * FASE 38: FRIENDS DROPDOWN
 * Dropdown flutuante do botão de amigos no header
 */

interface FriendsDropdownProps {
  children: React.ReactNode
  onOpenChat?: (userId: any, nickname: string | undefined, steamAvatar: string | undefined) => void
}

export function FriendsDropdown({ children, onOpenChat }: FriendsDropdownProps) {
  const friends = useQuery(api.friendsNew.getFriends)
  const pendingRequests = useQuery(api.friendsNew.getPendingRequests)
  const acceptRequest = useMutation(api.friendsNew.acceptFriendRequest)
  const rejectRequest = useMutation(api.friendsNew.removeFriendship)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleAccept = async (friendshipId: string) => {
    setLoadingId(friendshipId + "_accept")
    try {
      await acceptRequest({ friendshipId: friendshipId as any })
      toast.success("Pedido aceite!")
    } catch (e) {
      toast.error("Erro ao aceitar pedido")
    } finally {
      setLoadingId(null)
    }
  }

  const handleReject = async (friendshipId: string) => {
    setLoadingId(friendshipId + "_reject")
    try {
      await rejectRequest({ friendshipId: friendshipId as any })
      toast.success("Pedido recusado")
    } catch (e) {
      toast.error("Erro ao recusar pedido")
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 bg-zinc-900 border-zinc-800 p-0">
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-500" />
            <h3 className="font-bold text-white">Amigos</h3>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
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
                        onClick={() => handleAccept(request.friendshipId)}
                        disabled={loadingId !== null}
                        className="p-1 hover:bg-green-600 rounded transition-colors disabled:opacity-50"
                        title="Aceitar"
                      >
                        {loadingId === request.friendshipId + "_accept" ? (
                          <Loader2 className="w-4 h-4 text-green-500 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4 text-green-500" />
                        )}
                      </button>
                      <button
                        onClick={() => handleReject(request.friendshipId)}
                        disabled={loadingId !== null}
                        className="p-1 hover:bg-red-600 rounded transition-colors disabled:opacity-50"
                        title="Recusar"
                      >
                        {loadingId === request.friendshipId + "_reject" ? (
                          <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
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
                    onClick={() => onOpenChat?.(friend.userId, friend.nickname, friend.steamAvatar)}
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
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
