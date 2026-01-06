"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { ThumbsUp, Flag } from "lucide-react";
import { ReportModal } from "./ReportModal";

/**
 * FASE 30: PLAYER FEEDBACK COMPONENT
 * Botões de elogiar/reportar no resultado da partida
 */

interface PlayerFeedbackProps {
  playerId: Id<"users">;
  playerName: string;
  matchId: Id<"matches">;
}

export function PlayerFeedback({ playerId, playerName, matchId }: PlayerFeedbackProps) {
  const [showReportModal, setShowReportModal] = useState(false);
  const [commended, setCommended] = useState(false);
  const [reported, setReported] = useState(false);

  const commendPlayer = useMutation(api.trust.commendPlayer);

  const handleCommend = async () => {
    try {
      await commendPlayer({
        targetId: playerId,
        matchId,
      });
      setCommended(true);
    } catch (error: any) {
      console.error("Error commending player:", error);
    }
  };

  const handleReportSuccess = () => {
    setReported(true);
    setShowReportModal(false);
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          onClick={handleCommend}
          disabled={commended}
          variant="outline"
          size="sm"
          className={`${
            commended
              ? "bg-green-500/20 border-green-500/50 text-green-500"
              : "hover:bg-green-500/10 hover:border-green-500/50"
          }`}
        >
          <ThumbsUp className="w-4 h-4 mr-1" />
          {commended ? "Elogiado" : "Elogiar"}
        </Button>

        <Button
          onClick={() => setShowReportModal(true)}
          disabled={reported}
          variant="outline"
          size="sm"
          className={`${
            reported
              ? "bg-red-500/20 border-red-500/50 text-red-500"
              : "hover:bg-red-500/10 hover:border-red-500/50"
          }`}
        >
          <Flag className="w-4 h-4 mr-1" />
          {reported ? "Reportado" : "Reportar"}
        </Button>
      </div>

      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        targetId={playerId}
        targetName={playerName}
        matchId={matchId}
      />
    </>
  );
}
