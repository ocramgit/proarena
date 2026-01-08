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
  GripVertical,
  Settings,
  Crown,
  Shield,
  Gamepad2,
  UserMinus
} from "lucide-react";

/**
 * FASE 55: ORG ROSTER MANAGEMENT WITH DIVISIONS
 * Drag & Drop interface for managing player divisions
 */

export default function OrgRosterPage() {
  const router = useRouter();
  const myOrg = useQuery(api.organizations.getMyOrganization);
  const rosterData = useQuery(api.orgManagement.getRosterByDivision, 
    myOrg?._id ? { orgId: myOrg._id as Id<"organizations"> } : "skip"
  );
  const divisions = useQuery(api.orgManagement.getDivisions,
    myOrg?._id ? { orgId: myOrg._id as Id<"organizations"> } : "skip"
  );
  
  const createDivision = useMutation(api.orgManagement.createDivision);
  const assignMember = useMutation(api.orgManagement.assignMemberToDivision);
  const removeMemberFromDiv = useMutation(api.orgManagement.removeMemberFromDivision);

  const [draggedMember, setDraggedMember] = useState<any>(null);
  const [dragOverDivision, setDragOverDivision] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDivision, setNewDivision] = useState({
    name: "",
    type: "CUSTOM" as any,
    canAccessStratbook: true,
    canAccessMainCalendar: true,
  });

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
  if (myOrg === undefined || rosterData === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  const org = myOrg;
  const orgId = org._id as Id<"organizations">;

  const handleDragStart = (member: any, fromDivision: string) => {
    setDraggedMember({ ...member, fromDivision });
  };

  const handleDragOver = (e: React.DragEvent, divisionId: string) => {
    e.preventDefault();
    setDragOverDivision(divisionId);
  };

  const handleDragLeave = () => {
    setDragOverDivision(null);
  };

  const handleDrop = async (e: React.DragEvent, toDivisionId: string) => {
    e.preventDefault();
    setDragOverDivision(null);

    if (!draggedMember) return;

    const fromDivision = draggedMember.fromDivision;
    
    if (fromDivision === toDivisionId) return;

    try {
      // Remove from old division if not unassigned
      if (fromDivision !== "unassigned") {
        await removeMemberFromDiv({
          memberId: draggedMember._id,
          divisionId: fromDivision as Id<"org_divisions">,
        });
      }

      // Add to new division if not unassigned
      if (toDivisionId !== "unassigned") {
        await assignMember({
          orgId,
          memberId: draggedMember._id,
          divisionId: toDivisionId as Id<"org_divisions">,
          isPrimary: true,
        });
      }
    } catch (err) {
      console.error("Failed to move member:", err);
    }

    setDraggedMember(null);
  };

  const handleCreateDivision = async () => {
    if (!newDivision.name.trim()) return;

    try {
      await createDivision({
        orgId,
        name: newDivision.name,
        type: newDivision.type,
        canAccessStratbook: newDivision.canAccessStratbook,
        canAccessMainCalendar: newDivision.canAccessMainCalendar,
      });
      setShowCreateModal(false);
      setNewDivision({
        name: "",
        type: "CUSTOM",
        canAccessStratbook: true,
        canAccessMainCalendar: true,
      });
    } catch (err) {
      console.error("Failed to create division:", err);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "OWNER": return <Crown className="w-3 h-3 text-yellow-500" />;
      case "MANAGER": return <Shield className="w-3 h-3 text-purple-500" />;
      case "CAPTAIN": return <Shield className="w-3 h-3 text-blue-500" />;
      default: return <Gamepad2 className="w-3 h-3 text-zinc-500" />;
    }
  };

  const getDivisionColor = (type: string) => {
    switch (type) {
      case "MAIN": return "border-orange-500/50 bg-orange-500/5";
      case "ACADEMY": return "border-blue-500/50 bg-blue-500/5";
      case "STREAMERS": return "border-purple-500/50 bg-purple-500/5";
      case "CONTENT": return "border-pink-500/50 bg-pink-500/5";
      case "STAFF": return "border-green-500/50 bg-green-500/5";
      default: return "border-zinc-700 bg-zinc-900/50";
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
              Gestão de Roster
            </h1>
            <p className="text-zinc-400">[{org.tag}] {org.name} - Arrasta jogadores entre divisões</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-400 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Divisão
        </button>
      </div>

      {/* Divisions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Unassigned */}
        <div
          className={`rounded-xl border-2 border-dashed p-4 min-h-[200px] transition-colors ${
            dragOverDivision === "unassigned" 
              ? "border-orange-500 bg-orange-500/10" 
              : "border-zinc-700 bg-zinc-900/30"
          }`}
          onDragOver={(e) => handleDragOver(e, "unassigned")}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, "unassigned")}
        >
          <h3 className="font-bold text-zinc-500 mb-3 flex items-center gap-2">
            <UserMinus className="w-4 h-4" />
            Sem Divisão
            <span className="text-xs bg-zinc-800 px-2 py-0.5 rounded-full">
              {rosterData?.roster?.unassigned?.length || 0}
            </span>
          </h3>
          <div className="space-y-2">
            {rosterData?.roster?.unassigned?.map((member: any) => (
              <div
                key={member._id}
                draggable
                onDragStart={() => handleDragStart(member, "unassigned")}
                className="flex items-center gap-3 p-2 rounded-lg bg-zinc-800 cursor-grab active:cursor-grabbing hover:bg-zinc-700 transition-colors"
              >
                <GripVertical className="w-4 h-4 text-zinc-600" />
                <img
                  src={member.user?.steamAvatar || "/default-avatar.png"}
                  alt=""
                  className="w-8 h-8 rounded-lg"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {member.user?.nickname || member.user?.steamName}
                  </p>
                  <div className="flex items-center gap-1">
                    {getRoleIcon(member.role)}
                    <span className="text-xs text-zinc-500">{member.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Divisions */}
        {rosterData?.divisions?.map((division: any) => (
          <div
            key={division._id}
            className={`rounded-xl border-2 p-4 min-h-[200px] transition-colors ${
              dragOverDivision === division._id 
                ? "border-orange-500 bg-orange-500/10" 
                : getDivisionColor(division.type)
            }`}
            onDragOver={(e) => handleDragOver(e, division._id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, division._id)}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-white flex items-center gap-2">
                {division.name}
                <span className="text-xs bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-400">
                  {rosterData?.roster?.[division._id]?.length || 0}
                </span>
              </h3>
              <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-500">
                {division.type}
              </span>
            </div>
            <div className="space-y-2">
              {rosterData?.roster?.[division._id]?.map((member: any) => (
                <div
                  key={member._id}
                  draggable
                  onDragStart={() => handleDragStart(member, division._id)}
                  className="flex items-center gap-3 p-2 rounded-lg bg-zinc-800/80 cursor-grab active:cursor-grabbing hover:bg-zinc-700 transition-colors"
                >
                  <GripVertical className="w-4 h-4 text-zinc-600" />
                  <img
                    src={member.user?.steamAvatar || "/default-avatar.png"}
                    alt=""
                    className="w-8 h-8 rounded-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {member.user?.nickname || member.user?.steamName}
                    </p>
                    <div className="flex items-center gap-1">
                      {getRoleIcon(member.role)}
                      <span className="text-xs text-zinc-500">{member.role}</span>
                      {member.gameRole && (
                        <span className="text-xs text-zinc-600">• {member.gameRole}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {(!rosterData?.roster?.[division._id] || rosterData?.roster?.[division._id].length === 0) && (
                <p className="text-zinc-600 text-sm text-center py-4">
                  Arrasta jogadores aqui
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Division Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Criar Divisão</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Nome</label>
                <input
                  type="text"
                  value={newDivision.name}
                  onChange={(e) => setNewDivision({ ...newDivision, name: e.target.value })}
                  placeholder="Ex: Main Roster"
                  className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Tipo</label>
                <select
                  value={newDivision.type}
                  onChange={(e) => setNewDivision({ ...newDivision, type: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="MAIN">Main Roster</option>
                  <option value="ACADEMY">Academy</option>
                  <option value="STREAMERS">Streamers</option>
                  <option value="CONTENT">Content Creators</option>
                  <option value="STAFF">Staff</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={newDivision.canAccessStratbook}
                    onChange={(e) => setNewDivision({ ...newDivision, canAccessStratbook: e.target.checked })}
                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-orange-500"
                  />
                  <span className="text-sm text-zinc-300">Acesso ao Stratbook</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={newDivision.canAccessMainCalendar}
                    onChange={(e) => setNewDivision({ ...newDivision, canAccessMainCalendar: e.target.checked })}
                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-orange-500"
                  />
                  <span className="text-sm text-zinc-300">Acesso ao Calendário Principal</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2 rounded-lg bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateDivision}
                className="flex-1 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-400 transition-colors"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
