"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sidebar } from "@/components/layout/sidebar";
import {
  Plus,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation } from "convex/react";
import { toast } from "sonner";

const CATEGORY_LABELS = {
  BILLING: "💳 Pagamento",
  BUG: "🐛 Bug/Erro",
  REPORT: "🚩 Denúncia",
  OTHER: "❓ Outro",
};

const STATUS_CONFIG = {
  OPEN: { label: "Aberto", color: "text-orange-500", icon: AlertCircle },
  IN_PROGRESS: { label: "Em Progresso", color: "text-blue-500", icon: Clock },
  CLOSED: { label: "Fechado", color: "text-green-500", icon: CheckCircle2 },
};

export default function SupportPage() {
  const router = useRouter();
  const tickets = useQuery(api.tickets.getMyTickets);
  const createTicket = useMutation(api.tickets.createTicket);

  const [showNewTicketDialog, setShowNewTicketDialog] = useState(false);
  const [category, setCategory] = useState<"BILLING" | "BUG" | "REPORT" | "OTHER">("OTHER");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateTicket = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error("Preenche todos os campos");
      return;
    }

    setIsSubmitting(true);
    try {
      const ticketId = await createTicket({
        category,
        subject: subject.trim(),
        initialMessage: message.trim(),
      });

      toast.success("Ticket criado com sucesso!");
      setShowNewTicketDialog(false);
      setSubject("");
      setMessage("");
      setCategory("OTHER");

      // Redirect to ticket detail
      router.push(`/support/${ticketId}`);
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar ticket");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (timestamp: number | bigint) => {
    const date = new Date(Number(timestamp));
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `Há ${days} dia${days > 1 ? "s" : ""}`;
    if (hours > 0) return `Há ${hours} hora${hours > 1 ? "s" : ""}`;
    return "Agora mesmo";
  };

  if (tickets === undefined) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <Sidebar />
      <div className="flex-1 ml-64 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-white mb-2">Central de Suporte</h1>
            <p className="text-zinc-400">Gere os teus tickets e obtém ajuda da equipa</p>
          </div>
          <Button
            onClick={() => setShowNewTicketDialog(true)}
            className="bg-orange-600 hover:bg-orange-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Ticket
          </Button>
        </div>

        {/* Tickets List */}
        {tickets.length === 0 ? (
          <Card className="bg-zinc-900/50 border-zinc-800 p-12 text-center">
            <MessageSquare className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-zinc-100 mb-2">Nenhum ticket ainda</h3>
            <p className="text-zinc-400 mb-6">
              Cria o teu primeiro ticket para obteres ajuda da nossa equipa
            </p>
            <Button
              onClick={() => setShowNewTicketDialog(true)}
              className="bg-orange-600 hover:bg-orange-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Ticket
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => {
              const StatusIcon = STATUS_CONFIG[ticket.status].icon;
              return (
                <Card
                  key={ticket._id}
                  onClick={() => router.push(`/support/${ticket._id}`)}
                  className="bg-zinc-900/50 border-zinc-800 p-6 hover:border-orange-600/50 transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{CATEGORY_LABELS[ticket.category].split(" ")[0]}</span>
                        <h3 className="text-lg font-bold text-zinc-100">{ticket.subject}</h3>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-zinc-400">
                        <span>{CATEGORY_LABELS[ticket.category]}</span>
                        <span>•</span>
                        <span>{formatDate(ticket.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {ticket.priority === "URGENT" && (
                        <div className="px-3 py-1 bg-red-500/10 border border-red-500/30 rounded-full">
                          <span className="text-xs font-bold text-red-500 uppercase">Urgente</span>
                        </div>
                      )}
                      {ticket.priority === "HIGH" && (
                        <div className="px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-full">
                          <span className="text-xs font-bold text-yellow-500 uppercase">Alta</span>
                        </div>
                      )}
                      <div className={`flex items-center gap-2 ${STATUS_CONFIG[ticket.status].color}`}>
                        <StatusIcon className="w-5 h-5" />
                        <span className="font-bold">{STATUS_CONFIG[ticket.status].label}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* New Ticket Dialog */}
      <Dialog open={showNewTicketDialog} onOpenChange={setShowNewTicketDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Criar Novo Ticket</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Descreve o teu problema ou questão. A nossa equipa responderá em breve.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-zinc-300 mb-2 block">
                Categoria
              </label>
              <Select value={category} onValueChange={(val: any) => setCategory(val)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key} className="text-zinc-100">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-300 mb-2 block">
                Assunto
              </label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Resumo do problema..."
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
                maxLength={100}
              />
              <div className="text-xs text-zinc-500 mt-1">{subject.length}/100</div>
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-300 mb-2 block">
                Descrição
              </label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Descreve o problema em detalhe..."
                className="bg-zinc-800 border-zinc-700 text-zinc-100 min-h-[150px]"
                maxLength={1000}
              />
              <div className="text-xs text-zinc-500 mt-1">{message.length}/1000</div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => setShowNewTicketDialog(false)}
                variant="outline"
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateTicket}
                className="flex-1 bg-orange-600 hover:bg-orange-500"
                disabled={isSubmitting || !subject.trim() || !message.trim()}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    A criar...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Ticket
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
