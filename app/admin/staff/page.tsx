"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { Sidebar } from "@/components/layout/sidebar";
import { 
  Shield,
  UserPlus,
  Loader2,
  AlertCircle,
  Trash2,
  CheckCircle,
  PenSquare,
  Headphones,
  Trophy,
  Crown
} from "lucide-react";

/**
 * FASE 55: STAFF MANAGEMENT PAGE
 * Admin-only page for managing staff roles (ADMIN, SUPPORT, ORGANIZER, REDATOR)
 */

export default function StaffManagementPage() {
  const isAdmin = useQuery(api.staffManagement.checkIsAdmin);
  const staffMembers = useQuery(api.staffManagement.getAllStaff);
  const addStaff = useMutation(api.staffManagement.addStaffMember);
  const updateRole = useMutation(api.staffManagement.updateStaffRole);
  const removeStaff = useMutation(api.staffManagement.removeStaffMember);

  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"ADMIN" | "SUPPORT" | "ORGANIZER" | "REDATOR">("REDATOR");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Not authorized
  if (isAdmin === false) {
    return (
      <div className="flex h-screen bg-zinc-950">
        <Sidebar />
        <div className="flex-1 ml-64 pt-14 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">403 - Acesso Negado</h1>
            <p className="text-zinc-400">Apenas ADMIN pode aceder a esta página.</p>
          </div>
        </div>
      </div>
    );
  }

  // Loading
  if (isAdmin === undefined) {
    return (
      <div className="flex h-screen bg-zinc-950">
        <Sidebar />
        <div className="flex-1 ml-64 pt-14 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      </div>
    );
  }

  const handleAddStaff = async () => {
    setError(null);
    setSuccess(null);

    if (!newEmail.trim()) {
      setError("Email é obrigatório");
      return;
    }

    setIsAdding(true);
    try {
      await addStaff({ email: newEmail.trim(), role: newRole });
      setSuccess(`Staff adicionado: ${newEmail} como ${newRole}`);
      setNewEmail("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = async (staffId: Id<"staff_members">) => {
    if (!confirm("Tens a certeza que queres remover este staff member?")) return;
    try {
      await removeStaff({ staffId });
      setSuccess("Staff removido com sucesso");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRoleChange = async (staffId: Id<"staff_members">, role: "ADMIN" | "SUPPORT" | "ORGANIZER" | "REDATOR") => {
    try {
      await updateRole({ staffId, role });
      setSuccess("Role atualizado");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "ADMIN": return <Crown className="w-4 h-4" />;
      case "SUPPORT": return <Headphones className="w-4 h-4" />;
      case "ORGANIZER": return <Trophy className="w-4 h-4" />;
      case "REDATOR": return <PenSquare className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "ADMIN": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "SUPPORT": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "ORGANIZER": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "REDATOR": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      default: return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
    }
  };

  return (
    <div className="flex h-screen bg-zinc-950">
      <Sidebar />
      <div className="flex-1 ml-64 pt-14 overflow-y-auto">
        <div className="p-8 max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Gestão de Staff</h1>
              <p className="text-zinc-400">Gerir roles e permissões da equipa</p>
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

          {/* Add Staff Form */}
          <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800 mb-8">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-orange-500" />
              Adicionar Staff Member
            </h2>
            <div className="flex gap-4">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Email do utilizador"
                className="flex-1 px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
              />
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as any)}
                className="px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:border-orange-500"
              >
                <option value="REDATOR">Redator (News Writer)</option>
                <option value="ORGANIZER">Organizer (Tournaments)</option>
                <option value="SUPPORT">Support (Tickets)</option>
                <option value="ADMIN">Admin (Full Access)</option>
              </select>
              <button
                onClick={handleAddStaff}
                disabled={isAdding}
                className="px-6 py-2.5 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-400 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Adicionar
              </button>
            </div>

            {/* Role Descriptions */}
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-lg bg-zinc-800/50">
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border ${getRoleColor("REDATOR")} mb-2`}>
                  <PenSquare className="w-3 h-3" />
                  REDATOR
                </span>
                <p className="text-zinc-500">Pode criar e publicar notícias no Esports Hub.</p>
              </div>
              <div className="p-3 rounded-lg bg-zinc-800/50">
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border ${getRoleColor("ORGANIZER")} mb-2`}>
                  <Trophy className="w-3 h-3" />
                  ORGANIZER
                </span>
                <p className="text-zinc-500">Pode criar e gerir torneios na plataforma.</p>
              </div>
              <div className="p-3 rounded-lg bg-zinc-800/50">
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border ${getRoleColor("SUPPORT")} mb-2`}>
                  <Headphones className="w-3 h-3" />
                  SUPPORT
                </span>
                <p className="text-zinc-500">Pode responder a tickets de suporte.</p>
              </div>
              <div className="p-3 rounded-lg bg-zinc-800/50">
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border ${getRoleColor("ADMIN")} mb-2`}>
                  <Crown className="w-3 h-3" />
                  ADMIN
                </span>
                <p className="text-zinc-500">Acesso total. Pode gerir staff e todas as áreas.</p>
              </div>
            </div>
          </div>

          {/* Staff List */}
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
            <div className="p-4 border-b border-zinc-800">
              <h2 className="font-bold text-white">Staff Members ({staffMembers?.length || 0})</h2>
            </div>

            {staffMembers && staffMembers.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="text-sm text-zinc-500 border-b border-zinc-800">
                    <th className="text-left p-4 font-medium">Email</th>
                    <th className="text-left p-4 font-medium">Role</th>
                    <th className="text-left p-4 font-medium">Adicionado por</th>
                    <th className="text-left p-4 font-medium">Data</th>
                    <th className="text-right p-4 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {staffMembers.map((staff: any) => (
                    <tr key={staff._id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {staff.user?.steamAvatar && (
                            <img src={staff.user.steamAvatar} alt="" className="w-8 h-8 rounded-full" />
                          )}
                          <div>
                            <p className="text-white font-medium">{staff.email}</p>
                            {staff.user?.nickname && (
                              <p className="text-xs text-zinc-500">{staff.user.nickname}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <select
                          value={staff.role}
                          onChange={(e) => handleRoleChange(staff._id, e.target.value as any)}
                          className={`px-2.5 py-1 rounded border text-sm font-medium ${getRoleColor(staff.role)} bg-transparent focus:outline-none cursor-pointer`}
                        >
                          <option value="REDATOR" className="bg-zinc-900">Redator</option>
                          <option value="ORGANIZER" className="bg-zinc-900">Organizer</option>
                          <option value="SUPPORT" className="bg-zinc-900">Support</option>
                          <option value="ADMIN" className="bg-zinc-900">Admin</option>
                        </select>
                      </td>
                      <td className="p-4 text-zinc-400">{staff.addedBy}</td>
                      <td className="p-4 text-zinc-500 text-sm">
                        {new Date(staff.addedAt).toLocaleDateString("pt-PT")}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleRemove(staff._id)}
                          className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center">
                <Shield className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-500">Nenhum staff member registado</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
