"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sidebar } from "@/components/layout/sidebar";
import {
  ArrowLeft,
  Send,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  User,
  Shield,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

const STATUS_CONFIG = {
  OPEN: { label: "Aberto", color: "bg-orange-500/10 text-orange-500 border-orange-500/30", icon: AlertCircle },
  IN_PROGRESS: { label: "Em Progresso", color: "bg-blue-500/10 text-blue-500 border-blue-500/30", icon: Clock },
  CLOSED: { label: "Fechado", color: "bg-green-500/10 text-green-500 border-green-500/30", icon: CheckCircle2 },
};

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params.id as Id<"tickets">;

  const ticket = useQuery(api.tickets.getTicket, { ticketId });
  const sendMessage = useMutation(api.tickets.sendTicketMessage);

  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket?.messages?.length]);

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    setIsSending(true);
    try {
      await sendMessage({
        ticketId,
        content: message.trim(),
      });
      setMessage("");
      toast.success("Mensagem enviada!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar mensagem");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (ticket === undefined) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-zinc-100 mb-2">Ticket não encontrado</h2>
          <Button onClick={() => router.push("/support")} variant="outline">
            Voltar ao Suporte
          </Button>
        </div>
      </div>
    );
  }

  const StatusIcon = STATUS_CONFIG[ticket.status].icon;
  const isClosed = ticket.status === "CLOSED";

  return (
    <div className="flex h-screen bg-zinc-950">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col">
        {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => router.push("/support")}
              variant="ghost"
              size="sm"
              className="text-zinc-400 hover:text-zinc-100"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-xl font-black text-white">{ticket.subject}</h1>
              <p className="text-sm text-zinc-400">Ticket #{ticket._id.slice(-8)}</p>
            </div>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${STATUS_CONFIG[ticket.status].color}`}>
            <StatusIcon className="w-4 h-4" />
            <span className="font-bold text-sm">{STATUS_CONFIG[ticket.status].label}</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-4">
          {ticket.messages.map((msg, index) => {
            const isAdmin = msg.isAdminReply;
            const isFirst = index === 0;

            return (
              <div
                key={msg._id}
                className={`flex ${isAdmin ? "justify-start" : "justify-end"}`}
              >
                <div className={`max-w-2xl ${isAdmin ? "mr-auto" : "ml-auto"}`}>
                  {/* Sender Info */}
                  <div className={`flex items-center gap-2 mb-2 ${isAdmin ? "" : "justify-end"}`}>
                    <div className={`flex items-center gap-2 ${isAdmin ? "" : "flex-row-reverse"}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isAdmin ? "bg-orange-600" : "bg-zinc-700"
                      }`}>
                        {isAdmin ? (
                          <Shield className="w-4 h-4 text-white" />
                        ) : (
                          <User className="w-4 h-4 text-zinc-300" />
                        )}
                      </div>
                      <div className={`${isAdmin ? "text-left" : "text-right"}`}>
                        <div className="text-sm font-bold text-zinc-100">
                          {isAdmin ? "Admin" : msg.senderName}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {new Date(Number(msg.createdAt)).toLocaleString("pt-PT", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Message Content */}
                  <Card
                    className={`p-4 ${
                      isAdmin
                        ? "bg-orange-600/10 border-orange-600/30"
                        : "bg-zinc-800/50 border-zinc-700"
                    }`}
                  >
                    <p className="text-zinc-100 whitespace-pre-wrap">{msg.content}</p>
                  </Card>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      {!isClosed ? (
        <div className="border-t border-zinc-800 bg-zinc-900/50 p-4">
          <div className="max-w-5xl mx-auto flex gap-3">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escreve a tua mensagem..."
              className="flex-1 bg-zinc-800 border-zinc-700 text-zinc-100"
              disabled={isSending}
              maxLength={1000}
            />
            <Button
              onClick={handleSendMessage}
              disabled={isSending || !message.trim()}
              className="bg-orange-600 hover:bg-orange-500"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar
                </>
              )}
            </Button>
          </div>
          <div className="max-w-5xl mx-auto mt-2 text-xs text-zinc-500">
            {message.length}/1000 caracteres
          </div>
        </div>
      ) : (
        <div className="border-t border-zinc-800 bg-zinc-900/50 p-6">
          <div className="max-w-5xl mx-auto text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-zinc-100 mb-2">Ticket Fechado</h3>
            <p className="text-zinc-400">
              Este ticket foi resolvido e fechado. Se precisares de mais ajuda, cria um novo ticket.
            </p>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
