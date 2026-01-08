"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Users,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  UserPlus
} from "lucide-react";

/**
 * FASE 56: INVITE LINK JOIN PAGE
 * Public page for joining an org via invite link
 */

export default function InviteJoinPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const linkInfo = useQuery(api.orgInvites.getInviteLinkInfo, { code });
  const joinOrg = useMutation(api.orgInvites.joinViaInviteLink);

  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ orgName: string; orgTag: string } | null>(null);

  const handleJoin = async () => {
    setError(null);
    setIsJoining(true);

    try {
      const result = await joinOrg({ code });
      setSuccess({ orgName: result.orgName, orgTag: result.orgTag });
      setTimeout(() => {
        router.push("/esports/org");
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsJoining(false);
    }
  };

  // Loading
  if (linkInfo === undefined) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  // Invalid link
  if (linkInfo === null || !linkInfo.isValid) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-black text-white mb-2">Link Inválido</h1>
          <p className="text-zinc-400 mb-6">
            Este link de convite expirou, foi revogado ou atingiu o limite de utilizações.
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 rounded-lg bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-colors"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  // Success
  if (success) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-black text-white mb-2">Bem-vindo!</h1>
          <p className="text-zinc-400 mb-6">
            Juntaste-te a <strong className="text-white">[{success.orgTag}] {success.orgName}</strong>
          </p>
          <p className="text-sm text-zinc-500">A redirecionar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Org Card */}
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
          {/* Header */}
          <div className="h-24 bg-gradient-to-r from-orange-600/30 to-amber-600/30 flex items-center justify-center">
            {linkInfo.orgLogoUrl ? (
              <img
                src={linkInfo.orgLogoUrl}
                alt=""
                className="w-20 h-20 rounded-xl border-4 border-zinc-900"
              />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center border-4 border-zinc-900">
                <span className="text-2xl font-black text-white">{linkInfo.orgTag}</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-6 text-center">
            <h1 className="text-2xl font-black text-white mb-1">{linkInfo.orgName}</h1>
            <p className="text-zinc-400 mb-6">[{linkInfo.orgTag}]</p>

            <div className="p-4 rounded-xl bg-zinc-800/50 mb-6">
              <p className="text-sm text-zinc-400 mb-2">Foste convidado para te juntar como:</p>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/20 text-orange-400 font-bold">
                <Users className="w-4 h-4" />
                {linkInfo.defaultRole}
              </span>
            </div>

            {linkInfo.expiresAt && (
              <div className="flex items-center justify-center gap-2 text-sm text-zinc-500 mb-6">
                <Clock className="w-4 h-4" />
                Expira: {new Date(linkInfo.expiresAt).toLocaleString("pt-PT")}
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-6">
                {error}
              </div>
            )}

            <button
              onClick={handleJoin}
              disabled={isJoining}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold hover:from-orange-400 hover:to-amber-400 disabled:opacity-50 transition-all"
            >
              {isJoining ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Aceitar Convite
                </>
              )}
            </button>

            <button
              onClick={() => router.push("/")}
              className="w-full mt-3 py-2 text-zinc-400 hover:text-white transition-colors"
            >
              Recusar
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-zinc-600 mt-4">
          Ao aceitar, concordas com os termos de utilização do ProArena
        </p>
      </div>
    </div>
  );
}
