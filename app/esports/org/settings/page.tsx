"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { 
  ChevronLeft,
  Loader2,
  AlertCircle,
  CheckCircle,
  Save,
  Image,
  Users,
  UserPlus,
  Trash2,
  Crown,
  Shield
} from "lucide-react";

/**
 * FASE 54: ORGANIZATION SETTINGS PAGE
 */

export default function OrgSettingsPage() {
  const router = useRouter();
  const myOrg = useQuery(api.organizations.getMyOrganization);
  const canManage = useQuery(api.organizations.canManage, 
    myOrg?._id ? { orgId: myOrg._id as Id<"organizations"> } : "skip"
  );
  const orgMembers = useQuery(api.orgMembers.getOrgMembers,
    myOrg?._id ? { orgId: myOrg._id as Id<"organizations"> } : "skip"
  );
  const updateOrg = useMutation(api.organizations.updateOrganization);
  const invitePlayer = useMutation(api.organizations.invitePlayer);
  const removeMember = useMutation(api.organizations.removeMember);
  const updateMemberRole = useMutation(api.organizations.updateMemberRole);

  const [formData, setFormData] = useState({
    name: "",
    tag: "",
    description: "",
    logoUrl: "",
    bannerUrl: "",
    twitterUrl: "",
    discordUrl: "",
  });
  const [inviteData, setInviteData] = useState({ steamId: "", role: "PLAYER" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"general" | "roster" | "socials">("general");

  // Load org data
  useEffect(() => {
    if (myOrg) {
      setFormData({
        name: myOrg.name || "",
        tag: myOrg.tag || "",
        description: myOrg.description || "",
        logoUrl: myOrg.logoUrl || "",
        bannerUrl: myOrg.bannerUrl || "",
        twitterUrl: myOrg.twitterUrl || "",
        discordUrl: myOrg.discordUrl || "",
      });
    }
  }, [myOrg]);

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

  // Not authorized to manage
  if (canManage === false) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Acesso Negado</h2>
        <p className="text-zinc-400">Não tens permissão para gerir esta organização.</p>
      </div>
    );
  }

  // Loading
  if (myOrg === undefined || canManage === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  const org = myOrg;
  const orgId = org._id as Id<"organizations">;

  const handleSaveGeneral = async () => {
    setError(null);
    setSuccess(null);

    if (!formData.name.trim()) {
      setError("Nome é obrigatório");
      return;
    }

    setIsLoading(true);
    try {
      await updateOrg({
        orgId,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        logoUrl: formData.logoUrl.trim() || undefined,
        bannerUrl: formData.bannerUrl.trim() || undefined,
      });
      setSuccess("Organização atualizada com sucesso!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async () => {
    setError(null);
    setSuccess(null);
    setError("Funcionalidade temporariamente indisponível. Use a página de membros para convidar.");
  };

  const handleRemoveMember = async (memberId: Id<"org_members">) => {
    if (!confirm("Tens a certeza que queres remover este membro?")) return;
    try {
      await removeMember({ memberId });
      setSuccess("Membro removido");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateRole = async (memberId: Id<"org_members">, newRole: string) => {
    try {
      await updateMemberRole({ memberId, role: newRole as any });
      setSuccess("Role atualizado");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      OWNER: "bg-yellow-500/20 text-yellow-400",
      MANAGER: "bg-purple-500/20 text-purple-400",
      CAPTAIN: "bg-blue-500/20 text-blue-400",
      PLAYER: "bg-green-500/20 text-green-400",
      COACH: "bg-orange-500/20 text-orange-400",
      ANALYST: "bg-cyan-500/20 text-cyan-400",
      BENCH: "bg-zinc-500/20 text-zinc-400",
    };
    return colors[role] || colors.PLAYER;
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-white">Definições da Organização</h1>
          <p className="text-zinc-400">[{org.tag}] {org.name}</p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-400">{error}</p>
        </div>
      )}
      {success && (
        <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          <p className="text-green-400">{success}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-zinc-800">
        {[
          { id: "general", label: "Geral", icon: Shield },
          { id: "roster", label: "Roster", icon: Users },
          { id: "socials", label: "Redes Sociais", icon: Image },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
              activeTab === tab.id
                ? "text-orange-500 border-orange-500"
                : "text-zinc-400 border-transparent hover:text-white"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* General Tab */}
      {activeTab === "general" && (
        <div className="space-y-6 p-6 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-zinc-300 mb-2">Nome</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Tag</label>
              <input
                type="text"
                value={formData.tag}
                disabled
                className="w-full px-4 py-3 rounded-lg bg-zinc-800/50 border border-zinc-700 text-zinc-500 cursor-not-allowed"
              />
              <p className="text-xs text-zinc-600 mt-1">Tag não pode ser alterada</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Descrição</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:border-orange-500 resize-none"
              rows={4}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">URL do Logo</label>
            <input
              type="url"
              value={formData.logoUrl}
              onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
              placeholder="https://..."
              className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
            />
            {formData.logoUrl && (
              <div className="mt-2 w-20 h-20 rounded-lg overflow-hidden bg-zinc-800">
                <img src={formData.logoUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">URL do Banner</label>
            <input
              type="url"
              value={formData.bannerUrl}
              onChange={(e) => setFormData({ ...formData, bannerUrl: e.target.value })}
              placeholder="https://..."
              className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
            />
            {formData.bannerUrl && (
              <div className="mt-2 h-24 rounded-lg overflow-hidden bg-zinc-800">
                <img src={formData.bannerUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          <button
            onClick={handleSaveGeneral}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-400 disabled:opacity-50 transition-colors"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar Alterações
          </button>
        </div>
      )}

      {/* Roster Tab */}
      {activeTab === "roster" && (
        <div className="space-y-6">
          {/* Invite Form */}
          <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-orange-500" />
              Convidar Jogador
            </h3>
            <div className="flex gap-4">
              <input
                type="text"
                value={inviteData.steamId}
                onChange={(e) => setInviteData({ ...inviteData, steamId: e.target.value })}
                placeholder="Steam ID do jogador"
                className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
              />
              <select
                value={inviteData.role}
                onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}
                className="px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:border-orange-500"
              >
                <option value="PLAYER">Player</option>
                <option value="CAPTAIN">Captain</option>
                <option value="COACH">Coach</option>
                <option value="ANALYST">Analyst</option>
                <option value="BENCH">Bench</option>
              </select>
              <button
                onClick={handleInvite}
                disabled={isLoading}
                className="px-4 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-400 disabled:opacity-50 transition-colors"
              >
                Convidar
              </button>
            </div>
          </div>

          {/* Current Roster */}
          <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
            <h3 className="font-bold text-white mb-4">Roster Atual</h3>
            <div className="space-y-3">
              {orgMembers?.map((member: any) => (
                <div key={member._id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50">
                  <div className="flex items-center gap-3">
                    <img
                      src={member.user?.steamAvatar || "/default-avatar.png"}
                      alt=""
                      className="w-10 h-10 rounded-lg"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{member.user?.nickname}</span>
                        {member.role === "OWNER" && <Crown className="w-4 h-4 text-yellow-500" />}
                      </div>
                      <span className="text-xs text-zinc-500">{member.user?.steamName}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {member.role !== "OWNER" ? (
                      <>
                        <select
                          value={member.role}
                          onChange={(e) => handleUpdateRole(member._id, e.target.value)}
                          className={`px-2 py-1 rounded text-xs font-medium ${getRoleBadge(member.role)} border-0 focus:outline-none`}
                        >
                          <option value="PLAYER">Player</option>
                          <option value="CAPTAIN">Captain</option>
                          <option value="COACH">Coach</option>
                          <option value="ANALYST">Analyst</option>
                          <option value="BENCH">Bench</option>
                          <option value="MANAGER">Manager</option>
                        </select>
                        <button
                          onClick={() => handleRemoveMember(member._id)}
                          className="p-1.5 rounded text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleBadge("OWNER")}`}>
                        OWNER
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Socials Tab */}
      {activeTab === "socials" && (
        <div className="space-y-6 p-6 rounded-xl bg-zinc-900 border border-zinc-800">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Twitter / X</label>
            <input
              type="url"
              value={formData.twitterUrl}
              onChange={(e) => setFormData({ ...formData, twitterUrl: e.target.value })}
              placeholder="https://twitter.com/..."
              className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Discord</label>
            <input
              type="url"
              value={formData.discordUrl}
              onChange={(e) => setFormData({ ...formData, discordUrl: e.target.value })}
              placeholder="https://discord.gg/..."
              className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
            />
          </div>

          <button
            onClick={handleSaveGeneral}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-400 disabled:opacity-50 transition-colors"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar
          </button>
        </div>
      )}
    </div>
  );
}
