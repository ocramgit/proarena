"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, MessageSquare, Zap, UserX, Trophy } from "lucide-react";

/**
 * FASE 30: REPORT MODAL
 * Sistema de reports para jogadores tóxicos/cheaters
 */

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: Id<"users">;
  targetName: string;
  matchId: Id<"matches">;
}

type ReportReason = "TOXIC" | "CHEATING" | "AFK" | "GRIEFING" | "SMURFING";

const REPORT_REASONS: { value: ReportReason; label: string; icon: React.ReactNode; description: string }[] = [
  {
    value: "TOXIC",
    label: "Comportamento Tóxico",
    icon: <MessageSquare className="w-5 h-5" />,
    description: "Insultos, spam, linguagem ofensiva",
  },
  {
    value: "CHEATING",
    label: "Cheating/Hacking",
    icon: <AlertTriangle className="w-5 h-5" />,
    description: "Uso de cheats, wallhack, aimbot",
  },
  {
    value: "AFK",
    label: "AFK/Abandono",
    icon: <UserX className="w-5 h-5" />,
    description: "Jogador ausente ou abandonou a partida",
  },
  {
    value: "GRIEFING",
    label: "Griefing",
    icon: <Zap className="w-5 h-5" />,
    description: "Sabotagem intencional, teamkill",
  },
  {
    value: "SMURFING",
    label: "Smurfing",
    icon: <Trophy className="w-5 h-5" />,
    description: "Conta secundária para jogar em rank baixo",
  },
];

export function ReportModal({ isOpen, onClose, targetId, targetName, matchId }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submitReport = useMutation(api.trust.submitReport);

  const handleSubmit = async () => {
    if (!selectedReason) {
      setError("Seleciona um motivo");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await submitReport({
        reportedId: targetId,
        matchId,
        reason: selectedReason,
        comment: comment.trim() || undefined,
      });

      setSuccess(true);
      setTimeout(() => {
        onClose();
        // Reset state
        setSelectedReason(null);
        setComment("");
        setSuccess(false);
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Erro ao enviar report");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedReason(null);
      setComment("");
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">Reportar Jogador</DialogTitle>
          <DialogDescription className="text-zinc-400">
            A reportar: <span className="text-orange-500 font-bold">{targetName}</span>
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-green-500 mb-2">Report Enviado!</h3>
            <p className="text-zinc-400">A nossa equipa irá analisar o caso.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Reason Selection */}
            <div>
              <label className="text-sm font-medium text-zinc-300 mb-3 block">
                Motivo do Report
              </label>
              <div className="grid grid-cols-1 gap-2">
                {REPORT_REASONS.map((reason) => (
                  <button
                    key={reason.value}
                    onClick={() => setSelectedReason(reason.value)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      selectedReason === reason.value
                        ? "border-orange-500 bg-orange-500/10"
                        : "border-zinc-800 bg-zinc-800/50 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`${selectedReason === reason.value ? "text-orange-500" : "text-zinc-400"}`}>
                        {reason.icon}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-zinc-100">{reason.label}</div>
                        <div className="text-sm text-zinc-400 mt-1">{reason.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Comment */}
            <div>
              <label className="text-sm font-medium text-zinc-300 mb-2 block">
                Comentário Adicional (Opcional)
              </label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Descreve o que aconteceu..."
                className="bg-zinc-800 border-zinc-700 text-zinc-100 min-h-[100px]"
                maxLength={500}
              />
              <div className="text-xs text-zinc-500 mt-1">{comment.length}/500</div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={handleClose}
                variant="outline"
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1 bg-orange-600 hover:bg-orange-500"
                disabled={isSubmitting || !selectedReason}
              >
                {isSubmitting ? "A enviar..." : "Enviar Report"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
