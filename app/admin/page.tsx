"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Shield, Users, Activity, FileText, Ban, Edit, AlertTriangle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Id } from "@/convex/_generated/dataModel";

export default function AdminDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState<Id<"users"> | null>(null);
  const [newElo, setNewElo] = useState("");
  const [eloMode, setEloMode] = useState<"1v1" | "5v5">("1v1");

  const isAdmin = useQuery(api.admin.isAdmin);
  const users = useQuery(api.admin.getAllUsers, { search: searchTerm });
  const liveMatches = useQuery(api.admin.getLiveMatches);
  const systemLogs = useQuery(api.admin.getSystemLogs, { limit: 50 });

  const toggleBan = useMutation(api.admin.toggleUserBan);
  const adjustElo = useMutation(api.admin.adjustUserElo);
  const forceCancelMatch = useMutation(api.admin.forceCancelMatch);

  // Redirect if not admin
  if (isAdmin === false) {
    return (
      <div className="h-screen w-full bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-zinc-100 mb-2">Acesso Negado</h1>
          <p className="text-zinc-400">Apenas administradores podem aceder a esta página.</p>
        </div>
      </div>
    );
  }

  if (isAdmin === undefined || !users || !liveMatches || !systemLogs) {
    return (
      <div className="h-screen w-full bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-100 text-xl">A carregar painel de admin...</div>
      </div>
    );
  }

  const handleBanUser = async (userId: Id<"users">) => {
    if (confirm("Tens a certeza que queres banir/desbanir este utilizador?")) {
      await toggleBan({ userId });
    }
  };

  const handleAdjustElo = async () => {
    if (!editingUser || !newElo) return;
    
    const eloValue = parseFloat(newElo);
    if (isNaN(eloValue) || eloValue < 0 || eloValue > 5000) {
      alert("ELO inválido. Deve estar entre 0 e 5000.");
      return;
    }

    await adjustElo({
      userId: editingUser,
      mode: eloMode,
      newElo: eloValue,
    });

    setEditingUser(null);
    setNewElo("");
  };

  const handleForceCancelMatch = async (matchId: Id<"matches">) => {
    if (confirm("⚠️ ATENÇÃO: Isto vai cancelar a partida imediatamente. Tens a certeza?")) {
      await forceCancelMatch({ matchId });
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-orange-500" />
          <h1 className="text-4xl font-black text-zinc-100 uppercase">God Mode</h1>
        </div>
        <p className="text-zinc-400">Painel de Administração - Controlo Total</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="bg-zinc-900 border border-zinc-800 mb-6">
          <TabsTrigger value="users" className="data-[state=active]:bg-orange-600">
            <Users className="w-4 h-4 mr-2" />
            Utilizadores
          </TabsTrigger>
          <TabsTrigger value="games" className="data-[state=active]:bg-orange-600">
            <Activity className="w-4 h-4 mr-2" />
            Jogos Ativos
          </TabsTrigger>
          <TabsTrigger value="logs" className="data-[state=active]:bg-orange-600">
            <FileText className="w-4 h-4 mr-2" />
            Logs do Sistema
          </TabsTrigger>
        </TabsList>

        {/* USERS TAB */}
        <TabsContent value="users">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <Input
                  placeholder="Pesquisar por Clerk ID ou Steam ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-zinc-800 border-zinc-700 text-zinc-100"
                />
              </div>
            </div>

            {/* Users Table */}
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800">
                  <TableHead className="text-zinc-400">Clerk ID</TableHead>
                  <TableHead className="text-zinc-400">Steam ID</TableHead>
                  <TableHead className="text-zinc-400">ELO 1v1</TableHead>
                  <TableHead className="text-zinc-400">ELO 5v5</TableHead>
                  <TableHead className="text-zinc-400">Status</TableHead>
                  <TableHead className="text-zinc-400">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user._id} className="border-zinc-800">
                    <TableCell className="text-zinc-100 font-mono text-sm">
                      {user.clerkId.substring(0, 20)}...
                    </TableCell>
                    <TableCell className="text-zinc-400 font-mono text-sm">
                      {user.steamId}
                    </TableCell>
                    <TableCell className="text-orange-500 font-bold">
                      {user.elo_1v1.toFixed(0)}
                    </TableCell>
                    <TableCell className="text-orange-500 font-bold">
                      {user.elo_5v5.toFixed(0)}
                    </TableCell>
                    <TableCell>
                      {user.isBanned ? (
                        <span className="text-red-500 font-bold">BANIDO</span>
                      ) : (
                        <span className="text-green-500 font-bold">ATIVO</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingUser(user._id)}
                          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={user.isBanned ? "default" : "destructive"}
                          onClick={() => handleBanUser(user._id)}
                        >
                          <Ban className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* LIVE GAMES TAB */}
        <TabsContent value="games">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-zinc-100 mb-4">
              Partidas Ativas ({liveMatches.length})
            </h2>

            {liveMatches.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">
                Nenhuma partida ativa no momento.
              </div>
            ) : (
              <div className="space-y-4">
                {liveMatches.map((match) => (
                  <div
                    key={match._id}
                    className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-sm text-zinc-500 uppercase font-bold">
                          {match.mode} • {match.state}
                        </div>
                        <div className="text-lg font-bold text-zinc-100">
                          {match.selectedMap || "Mapa não selecionado"}
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleForceCancelMatch(match._id)}
                        className="bg-red-600 hover:bg-red-500"
                      >
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        FORÇAR CANCELAMENTO
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-zinc-500 mb-2">TEAM A</div>
                        {match.teamAPlayers.map((p: any) => (
                          <div key={p._id} className="text-sm text-zinc-300">
                            {p.clerkId.substring(0, 15)}
                          </div>
                        ))}
                      </div>
                      <div>
                        <div className="text-xs text-zinc-500 mb-2">TEAM B</div>
                        {match.teamBPlayers.map((p: any) => (
                          <div key={p._id} className="text-sm text-zinc-300">
                            {p.clerkId.substring(0, 15)}
                          </div>
                        ))}
                      </div>
                    </div>

                    {match.serverIp && (
                      <div className="mt-3 pt-3 border-t border-zinc-700">
                        <div className="text-xs text-zinc-500">SERVER IP</div>
                        <div className="text-sm font-mono text-orange-500">
                          {match.serverIp}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* LOGS TAB */}
        <TabsContent value="logs">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-zinc-100 mb-4">
              Logs do Sistema (Últimos 50)
            </h2>

            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800">
                  <TableHead className="text-zinc-400">Timestamp</TableHead>
                  <TableHead className="text-zinc-400">Tipo</TableHead>
                  <TableHead className="text-zinc-400">Estado</TableHead>
                  <TableHead className="text-zinc-400">Modo</TableHead>
                  <TableHead className="text-zinc-400">Mapa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {systemLogs.map((log) => (
                  <TableRow key={log._id} className="border-zinc-800">
                    <TableCell className="text-zinc-400 font-mono text-sm">
                      {new Date(log.timestamp).toLocaleString("pt-PT")}
                    </TableCell>
                    <TableCell className="text-zinc-100">{log.type}</TableCell>
                    <TableCell>
                      <span
                        className={`font-bold ${
                          log.state === "FINISHED"
                            ? "text-green-500"
                            : log.state === "CANCELLED"
                            ? "text-red-500"
                            : "text-orange-500"
                        }`}
                      >
                        {log.state}
                      </span>
                    </TableCell>
                    <TableCell className="text-zinc-300">{log.mode}</TableCell>
                    <TableCell className="text-zinc-300">{log.map || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit ELO Dialog */}
      <Dialog open={editingUser !== null} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Ajustar ELO Manualmente</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Altera o ELO do utilizador. Esta ação é irreversível.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Modo</label>
              <div className="flex gap-2">
                <Button
                  variant={eloMode === "1v1" ? "default" : "outline"}
                  onClick={() => setEloMode("1v1")}
                  className={eloMode === "1v1" ? "bg-orange-600" : ""}
                >
                  1v1
                </Button>
                <Button
                  variant={eloMode === "5v5" ? "default" : "outline"}
                  onClick={() => setEloMode("5v5")}
                  className={eloMode === "5v5" ? "bg-orange-600" : ""}
                >
                  5v5
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Novo ELO</label>
              <Input
                type="number"
                placeholder="1000"
                value={newElo}
                onChange={(e) => setNewElo(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancelar
            </Button>
            <Button onClick={handleAdjustElo} className="bg-orange-600 hover:bg-orange-500">
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
