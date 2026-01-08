"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { 
  Users,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Plus,
  Link as LinkIcon,
  Copy,
  Check,
  Trash2,
  Search,
  UserPlus,
  Crown,
  Shield,
  Gamepad2,
  Clock,
  GraduationCap,
  Target,
  BarChart3,
  X,
  ChevronDown
} from "lucide-react";

/**
 * FASE 56: ADVANCED MEMBER MANAGEMENT
 * Invite links + Direct invites + Role management
 */

const ROLE_INFO: Record<string, { icon: any; color: string; label: string; desc: string }> = {
  OWNER: { icon: Crown, color: "text-yellow-500 bg-yellow-500/20", label: "Owner", desc: "Acesso total + Finanças" },
  MANAGER: { icon: Shield, color: "text-purple-500 bg-purple-500/20", label: "Manager", desc: "Roster + Praccs" },
  COACH: { icon: GraduationCap, color: "text-blue-500 bg-blue-500/20", label: "Coach", desc: "Stratbook + Spectator" },
  CAPTAIN: { icon: Target, color: "text-green-500 bg-green-500/20", label: "Captain", desc: "Map Vetos" },
  PLAYER: { icon: Gamepad2, color: "text-zinc-400 bg-zinc-500/20", label: "Player", desc: "Membro base" },
  ANALYST: { icon: BarChart3, color: "text-cyan-500 bg-cyan-500/20", label: "Analyst", desc: "Stats + Demos" },
  BENCH: { icon: Users, color: "text-zinc-600 bg-zinc-700/20", label: "Bench", desc: "Inativo" },
  STAND_IN: { icon: Clock, color: "text-orange-500 bg-orange-500/20", label: "Stand-in", desc: "Temporário" },
};

export default function OrgMembersPage() {
  const router = useRouter();
  const myOrg = useQuery(api.organizations.getMyOrganization);
  const myPermissions = useQuery(api.orgInvites.getMyPermissions, 
    myOrg?._id ? { orgId: myOrg._id as Id<"organizations"> } : "skip"
  );
  const inviteLinks = useQuery(api.orgInvites.getInviteLinks,
    myOrg?._id ? { orgId: myOrg._id as Id<"organizations"> } : "skip"
  );
  const orgMembers = useQuery(api.orgMembers.getOrgMembers,
    myOrg?._id ? { orgId: myOrg._id as Id<"organizations"> } : "skip"
  );

  const createInviteLink = useMutation(api.orgInvites.createInviteLink);
  const revokeLink = useMutation(api.orgInvites.revokeInviteLink);
  const sendDirectInvite = useMutation(api.orgInvites.sendDirectInvite);
  const updateMemberRole = useMutation(api.orgInvites.updateMemberRole);
  const removeMember = useMutation(api.orgInvites.removeMember);

  const [activeTab, setActiveTab] = useState<"members" | "invites" | "links">("members");
  const [showCreateLink, setShowCreateLink] = useState(false);
  const [showDirectInvite, setShowDirectInvite] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [newLink, setNewLink] = useState({
    expiresIn: "24h" as "30m" | "1h" | "24h" | "7d" | "never",
    maxUses: undefined as number | undefined,
    defaultRole: "PLAYER" as "PLAYER" | "STAND_IN" | "ANALYST",
  });

  const [directInvite, setDirectInvite] = useState({
    role: "PLAYER" as "PLAYER" | "STAND_IN" | "ANALYST" | "COACH",
    message: "",
  });

  const searchResults = useQuery(api.orgInvites.searchUsersForInvite,
    myOrg?._id && searchQuery.length >= 2 
      ? { orgId: myOrg._id as Id<"organizations">, query: searchQuery } 
      : "skip"
  );

  // Not in an org
  if (myOrg === null) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Sem Organização</h2>
        <p className="text-zinc-400">Não fazes parte de nenhuma organização.</p>
      </div>
    );
  }

  // Loading
  if (myOrg === undefined || myPermissions === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  const org = myOrg;
  const orgId = org._id as Id<"organizations">;
  const canInvite = myPermissions?.permissions?.canInviteMembers;
  const canCreateLinks = myPermissions?.permissions?.canCreateInviteLinks;
  const canManageRoster = myPermissions?.permissions?.canManageRoster;

  const handleCreateLink = async () => {
    try {
      const result = await createInviteLink({
        orgId,
        expiresIn: newLink.expiresIn,
        maxUses: newLink.maxUses,
        defaultRole: newLink.defaultRole,
      });
      setShowCreateLink(false);
      setCopiedLink(result.code);
      navigator.clipboard.writeText(`proarena.gg/invite/${result.code}`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCopyLink = (code: string) => {
    navigator.clipboard.writeText(`proarena.gg/invite/${code}`);
    setCopiedLink(code);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleSendInvite = async (userId: Id<"users">) => {
    try {
      await sendDirectInvite({
        orgId,
        userId,
        role: directInvite.role,
        message: directInvite.message || undefined,
      });
      setSearchQuery("");
      setShowDirectInvite(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-3">
              <Users className="w-7 h-7 text-orange-500" />
              Gestão de Membros
            </h1>
            <p className="text-zinc-400">[{org.tag}] {org.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canCreateLinks && (
            <button
              onClick={() => setShowCreateLink(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
            >
              <LinkIcon className="w-4 h-4" />
              Criar Link
            </button>
          )}
          {canInvite && (
            <button
              onClick={() => setShowDirectInvite(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-400 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Convidar
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-zinc-800">
        <button
          onClick={() => setActiveTab("members")}
          className={`px-4 py-3 font-medium transition-colors border-b-2 ${
            activeTab === "members"
              ? "text-orange-500 border-orange-500"
              : "text-zinc-400 border-transparent hover:text-white"
          }`}
        >
          Membros
        </button>
        {canInvite && (
          <>
            <button
              onClick={() => setActiveTab("invites")}
              className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                activeTab === "invites"
                  ? "text-orange-500 border-orange-500"
                  : "text-zinc-400 border-transparent hover:text-white"
              }`}
            >
              Convites Pendentes
            </button>
            <button
              onClick={() => setActiveTab("links")}
              className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                activeTab === "links"
                  ? "text-orange-500 border-orange-500"
                  : "text-zinc-400 border-transparent hover:text-white"
              }`}
            >
              Links ({inviteLinks?.filter((l: any) => l.isValid).length || 0})
            </button>
          </>
        )}
      </div>

      {/* Members Tab */}
      {activeTab === "members" && (
        <div className="space-y-2">
          {orgMembers?.map((member: any) => {
            const roleInfo = ROLE_INFO[member.role] || ROLE_INFO.PLAYER;
            const RoleIcon = roleInfo.icon;
            
            // Role hierarchy for edit permissions
            const roleHierarchy: Record<string, number> = {
              OWNER: 0, MANAGER: 1, COACH: 2, CAPTAIN: 3,
              PLAYER: 4, ANALYST: 5, BENCH: 6, STAND_IN: 7
            };
            const myLevel = roleHierarchy[myPermissions?.role || "PLAYER"] || 99;
            const memberLevel = roleHierarchy[member.role] || 99;
            const canEdit = canManageRoster && member.role !== "OWNER" && myLevel < memberLevel;

            return (
              <div
                key={member._id}
                className="flex items-center gap-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800"
              >
                <img
                  src={member.user?.steamAvatar || "/default-avatar.png"}
                  alt=""
                  className="w-12 h-12 rounded-xl"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white truncate">
                      {member.user?.nickname || member.user?.steamName}
                    </span>
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${roleInfo.color}`}>
                      <RoleIcon className="w-3 h-3" />
                      {roleInfo.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-zinc-500">
                    {member.gameRole && <span>{member.gameRole}</span>}
                    <span>ELO: {member.user?.elo_5v5 || 1000}</span>
                    {member.role === "STAND_IN" && member.expiresAt && (
                      <span className="text-orange-500">
                        Expira: {new Date(member.expiresAt).toLocaleDateString("pt-PT")}
                      </span>
                    )}
                  </div>
                </div>

                {canEdit && (
                  <div className="flex items-center gap-2">
                    <select
                      value={member.role}
                      onChange={(e) => updateMemberRole({ 
                        memberId: member._id, 
                        newRole: e.target.value as any 
                      })}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-white focus:outline-none focus:border-orange-500"
                    >
                      <option value="MANAGER">Manager</option>
                      <option value="COACH">Coach</option>
                      <option value="CAPTAIN">Captain</option>
                      <option value="PLAYER">Player</option>
                      <option value="ANALYST">Analyst</option>
                      <option value="BENCH">Bench</option>
                      <option value="STAND_IN">Stand-in</option>
                    </select>
                    <button
                      onClick={() => {
                        if (confirm(`Remover ${member.user?.nickname} da organização?`)) {
                          removeMember({ memberId: member._id });
                        }
                      }}
                      className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {(!org.roster || org.roster.length === 0) && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500">Sem membros</p>
            </div>
          )}
        </div>
      )}

      {/* Invite Links Tab */}
      {activeTab === "links" && canCreateLinks && (
        <div className="space-y-3">
          {inviteLinks?.map((link: any) => (
            <div
              key={link._id}
              className={`flex items-center justify-between p-4 rounded-xl border ${
                link.isValid 
                  ? "bg-zinc-900 border-zinc-800" 
                  : "bg-zinc-900/50 border-zinc-800/50 opacity-60"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${link.isValid ? "bg-green-500/20" : "bg-zinc-700"}`}>
                  <LinkIcon className={`w-5 h-5 ${link.isValid ? "text-green-500" : "text-zinc-500"}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <code className="text-white font-mono">proarena.gg/invite/{link.code}</code>
                    {!link.isValid && (
                      <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400">
                        Inválido
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-zinc-500 mt-1">
                    <span>Role: {link.defaultRole}</span>
                    <span>Usos: {link.currentUses}{link.maxUses ? `/${link.maxUses}` : ""}</span>
                    {link.expiresAt && (
                      <span>
                        Expira: {new Date(Number(link.expiresAt)).toLocaleString("pt-PT")}
                      </span>
                    )}
                    <span>Por: {link.creatorName}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {link.isValid && (
                  <button
                    onClick={() => handleCopyLink(link.code)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
                  >
                    {copiedLink === link.code ? (
                      <>
                        <Check className="w-4 h-4 text-green-500" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copiar
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={() => revokeLink({ linkId: link._id })}
                  className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {(!inviteLinks || inviteLinks.length === 0) && (
            <div className="text-center py-12">
              <LinkIcon className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500 mb-4">Sem links de convite</p>
              <button
                onClick={() => setShowCreateLink(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-400 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Criar Link
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create Link Modal */}
      {showCreateLink && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-orange-500" />
                Criar Link de Convite
              </h2>
              <button onClick={() => setShowCreateLink(false)} className="p-1 text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Expiração</label>
                <select
                  value={newLink.expiresIn}
                  onChange={(e) => setNewLink({ ...newLink, expiresIn: e.target.value as any })}
                  className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="30m">30 minutos</option>
                  <option value="1h">1 hora</option>
                  <option value="24h">24 horas</option>
                  <option value="7d">7 dias</option>
                  <option value="never">Nunca expira</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Máximo de usos</label>
                <select
                  value={newLink.maxUses || "unlimited"}
                  onChange={(e) => setNewLink({ 
                    ...newLink, 
                    maxUses: e.target.value === "unlimited" ? undefined : Number(e.target.value) 
                  })}
                  className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="1">1 uso</option>
                  <option value="5">5 usos</option>
                  <option value="10">10 usos</option>
                  <option value="25">25 usos</option>
                  <option value="unlimited">Ilimitado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Role padrão</label>
                <select
                  value={newLink.defaultRole}
                  onChange={(e) => setNewLink({ ...newLink, defaultRole: e.target.value as any })}
                  className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="PLAYER">Player</option>
                  <option value="STAND_IN">Stand-in (Temporário)</option>
                  <option value="ANALYST">Analyst</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateLink(false)}
                className="flex-1 py-2 rounded-lg bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateLink}
                className="flex-1 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-400 transition-colors"
              >
                Criar Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Direct Invite Modal */}
      {showDirectInvite && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-orange-500" />
                Convite Direto
              </h2>
              <button onClick={() => setShowDirectInvite(false)} className="p-1 text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Pesquisar por Nickname ou Friend Code
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Digite nickname ou #ABC123"
                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Search Results */}
              {searchResults && searchResults.length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {searchResults.map((user: any) => (
                    <div
                      key={user._id}
                      className="flex items-center justify-between p-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={user.steamAvatar || "/default-avatar.png"}
                          alt=""
                          className="w-10 h-10 rounded-lg"
                        />
                        <div>
                          <p className="font-medium text-white">{user.nickname || user.steamName}</p>
                          <p className="text-xs text-zinc-500">
                            ELO: {user.elo || 1000}
                            {user.friendCode && ` • #${user.friendCode}`}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleSendInvite(user._id)}
                        className="px-3 py-1.5 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-400 transition-colors"
                      >
                        Convidar
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {searchQuery.length >= 2 && searchResults?.length === 0 && (
                <p className="text-center text-zinc-500 py-4">Nenhum jogador encontrado</p>
              )}

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Role</label>
                <select
                  value={directInvite.role}
                  onChange={(e) => setDirectInvite({ ...directInvite, role: e.target.value as any })}
                  className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="PLAYER">Player</option>
                  <option value="STAND_IN">Stand-in</option>
                  <option value="ANALYST">Analyst</option>
                  <option value="COACH">Coach</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Mensagem (opcional)</label>
                <textarea
                  value={directInvite.message}
                  onChange={(e) => setDirectInvite({ ...directInvite, message: e.target.value })}
                  placeholder="Ex: Queremos que te juntes à nossa equipa principal..."
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowDirectInvite(false)}
                className="flex-1 py-2 rounded-lg bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Legend */}
      <div className="mt-8 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
        <h3 className="font-bold text-white mb-3">Hierarquia de Roles</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(ROLE_INFO).map(([key, info]) => {
            const Icon = info.icon;
            return (
              <div key={key} className="flex items-center gap-2 text-sm">
                <div className={`p-1.5 rounded ${info.color}`}>
                  <Icon className="w-3 h-3" />
                </div>
                <div>
                  <span className="text-white font-medium">{info.label}</span>
                  <p className="text-xs text-zinc-500">{info.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
