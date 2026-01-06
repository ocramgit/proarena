"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sidebar } from "@/components/layout/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  X,
  AlertTriangle,
  Phone,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";

const CATEGORY_LABELS = {
  BILLING: "💳 Pagamento",
  BUG: "🐛 Bug/Erro",
  REPORT: "🚩 Denúncia",
  OTHER: "❓ Outro",
};

const PRIORITY_CONFIG = {
  LOW: { label: "Baixa", color: "text-zinc-500" },
  HIGH: { label: "Alta", color: "text-yellow-500" },
  URGENT: { label: "Urgente", color: "text-red-500" },
};

export default function AdminTicketsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"open" | "in_progress" | "closed" | "sos">("open");

  const openTickets = useQuery(api.tickets.getAllTickets, { status: "OPEN" });
  const inProgressTickets = useQuery(api.tickets.getAllTickets, { status: "IN_PROGRESS" });
  const closedTickets = useQuery(api.tickets.getAllTickets, { status: "CLOSED" });
  const sosAlerts = useQuery(api.tickets.getPendingAlerts);

  const closeTicket = useMutation(api.tickets.closeTicket);
  const resolveAlert = useMutation(api.tickets.resolveAlert);

  const handleCloseTicket = async (ticketId: Id<"tickets">) => {
    try {
      await closeTicket({ ticketId });
      toast.success("Ticket fechado!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao fechar ticket");
    }
  };

  const handleResolveAlert = async (alertId: Id<"lobby_alerts">) => {
    try {
      await resolveAlert({ alertId });
      toast.success("Alerta resolvido!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao resolver alerta");
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `Há ${days} dia${days > 1 ? "s" : ""}`;
    if (hours > 0) return `Há ${hours} hora${hours > 1 ? "s" : ""}`;
    return "Agora mesmo";
  };

  const renderTicketsList = (tickets: any[] | undefined, showCloseButton = false) => {
    if (tickets === undefined) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      );
    }

    if (tickets.length === 0) {
      return (
        <Card className="bg-zinc-900/50 border-zinc-800 p-12 text-center">
          <MessageSquare className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-400">Nenhum ticket nesta categoria</p>
        </Card>
      );
    }

    return (
      <div className="space-y-3">
        {tickets.map((ticket) => (
          <Card
            key={ticket._id}
            className="bg-zinc-900/50 border-zinc-800 p-4 hover:border-orange-600/50 transition-all"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xl">{CATEGORY_LABELS[ticket.category].split(" ")[0]}</span>
                  <h3 className="text-lg font-bold text-zinc-100 truncate">{ticket.subject}</h3>
                  {ticket.priority !== "LOW" && (
                    <div className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                      ticket.priority === "URGENT" 
                        ? "bg-red-500/10 text-red-500" 
                        : "bg-yellow-500/10 text-yellow-500"
                    }`}>
                      {PRIORITY_CONFIG[ticket.priority].label}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-zinc-400">
                  <span>👤 {ticket.userName}</span>
                  <span>•</span>
                  <span>{CATEGORY_LABELS[ticket.category]}</span>
                  <span>•</span>
                  <span>💬 {ticket.messageCount} mensagens</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <div className="text-xs text-zinc-500">
                      {new Date(Number(ticket.createdAt)).toLocaleString("pt-PT")}
                    </div>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => router.push(`/support/${ticket._id}`)}
                  size="sm"
                  variant="outline"
                  className="border-orange-600 text-orange-600 hover:bg-orange-600/10"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir
                </Button>
                {showCloseButton && (
                  <Button
                    onClick={() => handleCloseTicket(ticket._id)}
                    size="sm"
                    className="bg-green-600 hover:bg-green-500"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Fechar
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  const renderSOSAlerts = () => {
    if (sosAlerts === undefined) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      );
    }

    if (sosAlerts.length === 0) {
      return (
        <Card className="bg-zinc-900/50 border-zinc-800 p-12 text-center">
          <Phone className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-400">Nenhum alerta SOS pendente</p>
        </Card>
      );
    }

    return (
      <div className="space-y-3">
        {sosAlerts.map((alert) => (
          <Card
            key={alert._id}
            className="bg-red-500/10 border-red-500/30 p-4 animate-pulse"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                  <h3 className="text-lg font-bold text-red-500 uppercase">SOS - Admin Chamado!</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="text-zinc-100">
                    <span className="font-bold">Motivo:</span> {alert.reason}
                  </p>
                  <div className="flex items-center gap-4 text-zinc-400">
                    <span className="flex items-center gap-1">
                      <div className="text-xs text-zinc-500">
                        {new Date(Number(alert.createdAt)).toLocaleString("pt-PT")}
                      </div>
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => router.push(`/lobby/${alert.matchId}`)}
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-500"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Ir para Lobby
                </Button>
                <Button
                  onClick={() => handleResolveAlert(alert._id)}
                  size="sm"
                  className="bg-green-600 hover:bg-green-500"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Resolver
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  const openCount = openTickets?.length || 0;
  const inProgressCount = inProgressTickets?.length || 0;
  const sosCount = sosAlerts?.length || 0;

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <Sidebar />
      <div className="flex-1 ml-64 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-white mb-2">Gestão de Tickets</h1>
          <p className="text-zinc-400">Central de suporte e alertas SOS</p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
          <TabsList className="bg-zinc-900/50 border border-zinc-800 mb-6">
            <TabsTrigger value="open" className="relative">
              Abertos
              {openCount > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-orange-600 text-white text-xs font-bold rounded-full">
                  {openCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="in_progress" className="relative">
              Em Progresso
              {inProgressCount > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">
                  {inProgressCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="closed">
              Fechados
            </TabsTrigger>
            <TabsTrigger value="sos" className="relative">
              🚨 SOS (Lobby)
              {sosCount > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded-full animate-pulse">
                  {sosCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="open">
            {renderTicketsList(openTickets, true)}
          </TabsContent>

          <TabsContent value="in_progress">
            {renderTicketsList(inProgressTickets, true)}
          </TabsContent>

          <TabsContent value="closed">
            {renderTicketsList(closedTickets, false)}
          </TabsContent>

          <TabsContent value="sos">
            {renderSOSAlerts()}
          </TabsContent>
        </Tabs>
      </div>
      </div>
    </div>
  )
}
