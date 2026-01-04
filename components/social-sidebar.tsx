"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Users, UserPlus, X, Crown, LogOut, ChevronRight, ChevronLeft } from "lucide-react"
import { toast } from "sonner"
import { Id } from "@/convex/_generated/dataModel"

export function SocialSidebar() {
  const [isOpen, setIsOpen] = useState(true)
  
  const friends = useQuery(api.social.getMyFriends)
  const party = useQuery(api.party.getMyParty)
  const friendRequests = useQuery(api.social.getFriendRequests)
  
  const createParty = useMutation(api.party.createParty)
  const inviteToParty = useMutation(api.party.inviteToParty)
  const leaveParty = useMutation(api.party.leaveParty)
  const kickFromParty = useMutation(api.party.kickFromParty)
  const acceptFriendRequest = useMutation(api.social.acceptFriendRequest)

  const handleCreateParty = async () => {
    try {
      await createParty({})
      toast.success("Party criada!")
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleInviteToParty = async (userId: Id<"users">) => {
    try {
      await inviteToParty({ userId })
      toast.success("Convite enviado!")
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleLeaveParty = async () => {
    try {
      const result = await leaveParty({})
      if (result.disbanded) {
        toast.success("Party dissolvida")
      } else {
        toast.success("Saíste da party")
      }
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleKick = async (userId: Id<"users">) => {
    try {
      await kickFromParty({ userId })
      toast.success("Jogador removido")
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleAcceptRequest = async (friendshipId: Id<"friendships">) => {
    try {
      await acceptFriendRequest({ friendshipId })
      toast.success("Pedido aceite!")
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-20 right-0 z-40 rounded-l-lg border-l border-t border-b border-zinc-800 bg-zinc-900 p-2 hover:bg-zinc-800 transition-colors"
      >
        {isOpen ? (
          <ChevronRight className="h-5 w-5 text-zinc-400" />
        ) : (
          <ChevronLeft className="h-5 w-5 text-zinc-400" />
        )}
      </button>

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-screen w-80 border-l border-zinc-800 bg-zinc-950 transition-transform duration-300 z-30 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b border-zinc-800 p-4">
            <h2 className="text-lg font-black uppercase text-zinc-100">Social</h2>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-6">
              {/* Friend Requests */}
              {friendRequests && friendRequests.length > 0 && (
                <div>
                  <h3 className="mb-3 text-sm font-bold uppercase text-zinc-400">
                    Pedidos de Amizade ({friendRequests.length})
                  </h3>
                  <div className="space-y-2">
                    {friendRequests.map((req) => (
                      <div
                        key={req._id}
                        className="rounded-lg border border-orange-600/30 bg-orange-600/5 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-orange-600 flex items-center justify-center text-xs font-bold text-white">
                              {req.sender?.displayName.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-zinc-100">
                              {req.sender?.displayName}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleAcceptRequest(req._id)}
                            className="bg-green-600 hover:bg-green-700 h-7 px-2"
                          >
                            Aceitar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Party Section */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase text-zinc-400">
                    Party {party && `(${party.members.length}/5)`}
                  </h3>
                  {!party && (
                    <Button
                      size="sm"
                      onClick={handleCreateParty}
                      className="h-7 bg-purple-600 hover:bg-purple-700"
                    >
                      Criar
                    </Button>
                  )}
                </div>

                {party ? (
                  <div className="space-y-2">
                    {party.members.map((member: any) => (
                      <div
                        key={member._id}
                        className="flex items-center justify-between rounded-lg border border-purple-600/30 bg-purple-600/5 p-3"
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white">
                            {member.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1">
                              <span className={`text-sm font-medium ${member.isPremium ? 'text-yellow-500' : 'text-zinc-100'}`}>
                                {member.displayName}
                              </span>
                              {member.isLeader && (
                                <Crown className="h-3 w-3 text-yellow-500" />
                              )}
                            </div>
                          </div>
                        </div>
                        {party.leaderId === member._id ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleLeaveParty}
                            className="h-7 border-red-600 text-red-600 hover:bg-red-600/20"
                          >
                            <LogOut className="h-3 w-3" />
                          </Button>
                        ) : (
                          party.members.find((m: any) => m.isLeader)?._id && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleKick(member._id)}
                              className="h-7 border-red-600 text-red-600 hover:bg-red-600/20"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500">Não estás numa party</p>
                )}
              </div>

              {/* Friends Section */}
              <div>
                <h3 className="mb-3 text-sm font-bold uppercase text-zinc-400">
                  Amigos Online ({friends?.length || 0})
                </h3>
                {friends && friends.length > 0 ? (
                  <div className="space-y-2">
                    {friends.map((friend: any) => (
                      <div
                        key={friend._id}
                        className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 p-3"
                      >
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <div className="h-8 w-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-white">
                              {friend.displayName.charAt(0).toUpperCase()}
                            </div>
                            <div
                              className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-zinc-900 ${
                                friend.status === "IN_GAME"
                                  ? "bg-blue-500"
                                  : "bg-green-500"
                              }`}
                            />
                          </div>
                          <div>
                            <p className={`text-sm font-medium ${friend.isPremium ? 'text-yellow-500' : 'text-zinc-100'}`}>
                              {friend.displayName}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {friend.status === "IN_GAME" ? "Em Jogo" : "Online"}
                            </p>
                          </div>
                        </div>
                        {party && party.leaderId && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleInviteToParty(friend._id)}
                            className="h-7 border-purple-600 text-purple-600 hover:bg-purple-600/20"
                          >
                            <UserPlus className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500">Nenhum amigo online</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
