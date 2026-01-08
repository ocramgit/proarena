"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/layout/sidebar";
import { 
  User,
  Loader2,
  Shield,
  Trophy,
  Coins,
  Settings,
  Copy,
  Check,
  Swords,
  MessageSquare,
  Send,
  Trash2,
  Monitor,
  Mouse,
  Keyboard,
  Headphones,
  Target,
  Star,
  Crown,
  BadgeCheck,
  Flag,
  ExternalLink,
  ChevronRight
} from "lucide-react";

/**
 * FASE 54: PROFILE 3.0 - THE DEFINITIVE IDENTITY
 * Bento Grid layout with @handle routing
 */

// Theme color mappings
const THEME_COLORS: Record<string, { primary: string; glow: string; bg: string }> = {
  amber: { primary: "text-amber-500", glow: "shadow-amber-500/50", bg: "from-amber-500/20" },
  purple: { primary: "text-purple-500", glow: "shadow-purple-500/50", bg: "from-purple-500/20" },
  cyan: { primary: "text-cyan-500", glow: "shadow-cyan-500/50", bg: "from-cyan-500/20" },
  red: { primary: "text-red-500", glow: "shadow-red-500/50", bg: "from-red-500/20" },
  green: { primary: "text-green-500", glow: "shadow-green-500/50", bg: "from-green-500/20" },
  blue: { primary: "text-blue-500", glow: "shadow-blue-500/50", bg: "from-blue-500/20" },
};

// Country flag emoji mapping
const FLAGS: Record<string, string> = {
  PT: "🇵🇹", BR: "🇧🇷", US: "🇺🇸", UK: "🇬🇧", DE: "🇩🇪", FR: "🇫🇷", ES: "🇪🇸",
  IT: "🇮🇹", NL: "🇳🇱", PL: "🇵🇱", RU: "🇷🇺", UA: "🇺🇦", SE: "🇸🇪", DK: "🇩🇰",
  NO: "🇳🇴", FI: "🇫🇮", TR: "🇹🇷", AR: "🇦🇷", CL: "🇨🇱", MX: "🇲🇽", CA: "🇨🇦",
};

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const handle = params.handle as string;

  const profile = useQuery(api.profile.getProfileByHandle, { handle });
  const wagerStats = useQuery(api.profile.getWagerStats, 
    profile?._id ? { userId: profile._id } : "skip"
  );
  const guestbook = useQuery(api.profile.getGuestbook, 
    profile?._id ? { profileUserId: profile._id, limit: 10 } : "skip"
  );
  const isOwn = useQuery(api.profile.isOwnProfile, 
    profile?._id ? { profileUserId: profile._id } : "skip"
  );
  const mySkillStats = useQuery(api.profile.getMySkillStats);

  const postComment = useMutation(api.profile.postGuestbookComment);
  const deleteComment = useMutation(api.profile.deleteGuestbookComment);

  const [newComment, setNewComment] = useState("");
  const [copiedCrosshair, setCopiedCrosshair] = useState(false);
  const [showCompare, setShowCompare] = useState(false);

  // Loading
  if (profile === undefined) {
    return (
      <div className="flex h-screen bg-zinc-950">
        <Sidebar />
        <div className="flex-1 ml-64 pt-14 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      </div>
    );
  }

  // 404 - User not found
  if (profile === null) {
    return (
      <div className="flex h-screen bg-zinc-950">
        <Sidebar />
        <div className="flex-1 ml-64 pt-14 flex items-center justify-center">
          <div className="text-center">
            <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-6">
              <User className="w-12 h-12 text-zinc-600" />
            </div>
            <h1 className="text-3xl font-black text-white mb-2">Este guerreiro não existe</h1>
            <p className="text-zinc-400 mb-6">O perfil @{handle} não foi encontrado.</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-500 text-white font-bold hover:bg-orange-400 transition-colors"
            >
              Voltar ao Início
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const theme = THEME_COLORS[profile.themeColor] || THEME_COLORS.amber;

  const handleCopyCrosshair = () => {
    if (profile.crosshairCode) {
      navigator.clipboard.writeText(profile.crosshairCode);
      setCopiedCrosshair(true);
      setTimeout(() => setCopiedCrosshair(false), 2000);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim()) return;
    try {
      await postComment({ profileUserId: profile._id, content: newComment.trim() });
      setNewComment("");
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="flex h-screen bg-zinc-950">
      <Sidebar />
      <div className="flex-1 ml-64 pt-14 overflow-y-auto">
        {/* Hero Banner with Parallax Effect */}
        <div className="relative h-48 md:h-64 overflow-hidden">
          {profile.profileBannerUrl ? (
            <div 
              className="absolute inset-0 bg-cover bg-center transform scale-105"
              style={{ backgroundImage: `url(${profile.profileBannerUrl})` }}
            />
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-br ${theme.bg} to-zinc-900`} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent" />
        </div>

        <div className="px-8 -mt-20 pb-8 max-w-7xl mx-auto relative">
          {/* BENTO GRID LAYOUT */}
          <div className="grid grid-cols-12 gap-4">
            
            {/* ============================================ */}
            {/* BLOCO 1: HERO CARD (spans 8 cols) */}
            {/* ============================================ */}
            <div className="col-span-12 lg:col-span-8 rounded-2xl bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 p-6">
              <div className="flex items-start gap-6">
                {/* Avatar with ELO Ring */}
                <div className="relative">
                  <div className={`absolute -inset-1.5 rounded-full bg-gradient-to-br ${theme.bg} to-transparent blur-sm opacity-75`} />
                  <div className={`relative w-28 h-28 rounded-full p-1 bg-gradient-to-br from-zinc-700 to-zinc-900`}
                    style={{ 
                      boxShadow: `0 0 20px ${profile.eloTier.color}40`,
                      borderColor: profile.eloTier.color 
                    }}
                  >
                    <img
                      src={profile.steamAvatar || "/default-avatar.png"}
                      alt=""
                      className="w-full h-full rounded-full object-cover"
                    />
                  </div>
                  {/* ELO Tier Badge */}
                  <div 
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-black"
                    style={{ backgroundColor: profile.eloTier.color + "30", color: profile.eloTier.color }}
                  >
                    {profile.eloTier.icon} {profile.eloTier.name}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-3xl font-black text-white">{profile.nickname || profile.steamName}</h1>
                    {profile.isVerified && <BadgeCheck className="w-6 h-6 text-blue-500" />}
                    {profile.isPremium && <Crown className="w-6 h-6 text-yellow-500" />}
                    {profile.role === "ADMIN" && <Shield className="w-5 h-5 text-red-500" />}
                    {profile.country && FLAGS[profile.country] && (
                      <span className="text-2xl">{FLAGS[profile.country]}</span>
                    )}
                  </div>
                  
                  <p className={`text-lg ${theme.primary} font-medium mt-1`}>@{profile.nickname}</p>
                  
                  {profile.bio && (
                    <p className="text-zinc-400 mt-2 max-w-lg">{profile.bio}</p>
                  )}

                  {/* Badges */}
                  {profile.badges && profile.badges.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {profile.badges.map((badge: any) => (
                        <span
                          key={badge._id}
                          className="px-2 py-1 rounded-lg bg-zinc-800 text-xs font-medium text-zinc-300"
                          title={badge.description}
                        >
                          {badge.icon} {badge.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Org Badge */}
                  {profile.org && (
                    <Link
                      href={`/esports/org`}
                      className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
                    >
                      {profile.org.logoUrl && (
                        <img src={profile.org.logoUrl} alt="" className="w-5 h-5 rounded" />
                      )}
                      <span className="text-white font-medium">[{profile.org.tag}]</span>
                      <span className="text-zinc-400 text-sm">{profile.orgRole}</span>
                    </Link>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  {!isOwn && (
                    <Link
                      href={`/wagers?challenge=${profile._id}`}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold hover:from-amber-400 hover:to-orange-400 transition-all shadow-lg ${theme.glow}`}
                    >
                      <Swords className="w-4 h-4" />
                      Desafiar 1v1
                    </Link>
                  )}
                  {isOwn && (
                    <Link
                      href="/profile/settings"
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Editar Perfil
                    </Link>
                  )}
                  <a
                    href={profile.steamProfileUrl}
                    target="_blank"
                    rel="noopener"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Steam
                  </a>
                </div>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-zinc-800">
                <div className="text-center">
                  <p className="text-2xl font-black text-white">{profile.elo_5v5}</p>
                  <p className="text-xs text-zinc-500">ELO 5v5</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-white">{profile.elo_1v1}</p>
                  <p className="text-xs text-zinc-500">ELO 1v1</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-white">{profile.matchesPlayed}</p>
                  <p className="text-xs text-zinc-500">Partidas</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-white">{profile.steamHours || "—"}</p>
                  <p className="text-xs text-zinc-500">Horas CS</p>
                </div>
              </div>
            </div>

            {/* ============================================ */}
            {/* BLOCO 2: SKILL HEXAGON (spans 4 cols) */}
            {/* ============================================ */}
            <div className="col-span-12 lg:col-span-4 rounded-2xl bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Target className={`w-5 h-5 ${theme.primary}`} />
                  Skill Rating
                </h3>
                {!isOwn && mySkillStats && (
                  <button
                    onClick={() => setShowCompare(!showCompare)}
                    className="text-xs text-zinc-400 hover:text-white transition-colors"
                  >
                    {showCompare ? "Esconder" : "Comparar comigo"}
                  </button>
                )}
              </div>

              {/* Radar Chart Placeholder */}
              <div className="relative aspect-square">
                <svg viewBox="0 0 200 200" className="w-full h-full">
                  {/* Background hexagon */}
                  <polygon
                    points="100,20 175,55 175,125 100,180 25,125 25,55"
                    fill="none"
                    stroke="rgb(63,63,70)"
                    strokeWidth="1"
                  />
                  <polygon
                    points="100,50 150,72 150,108 100,150 50,108 50,72"
                    fill="none"
                    stroke="rgb(63,63,70)"
                    strokeWidth="1"
                  />
                  <polygon
                    points="100,80 125,90 125,110 100,120 75,110 75,90"
                    fill="none"
                    stroke="rgb(63,63,70)"
                    strokeWidth="1"
                  />

                  {/* Skill polygon */}
                  {profile.skillStats && (
                    <polygon
                      points={calculateHexagonPoints(profile.skillStats)}
                      fill={profile.eloTier.color + "30"}
                      stroke={profile.eloTier.color}
                      strokeWidth="2"
                    />
                  )}

                  {/* Compare polygon */}
                  {showCompare && mySkillStats && (
                    <polygon
                      points={calculateHexagonPoints(mySkillStats)}
                      fill="rgba(251,191,36,0.2)"
                      stroke="rgb(251,191,36)"
                      strokeWidth="2"
                      strokeDasharray="4"
                    />
                  )}

                  {/* Labels */}
                  <text x="100" y="12" textAnchor="middle" className="fill-zinc-400 text-[10px]">AIM</text>
                  <text x="185" y="60" textAnchor="start" className="fill-zinc-400 text-[10px]">IMPACT</text>
                  <text x="185" y="140" textAnchor="start" className="fill-zinc-400 text-[10px]">SURVIVAL</text>
                  <text x="100" y="195" textAnchor="middle" className="fill-zinc-400 text-[10px]">UTILITY</text>
                  <text x="15" y="140" textAnchor="end" className="fill-zinc-400 text-[10px]">CLUTCH</text>
                  <text x="15" y="60" textAnchor="end" className="fill-zinc-400 text-[10px]">KAST</text>
                </svg>
              </div>

              {/* Stats List */}
              {profile.skillStats && (
                <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                  <div className="flex justify-between px-2 py-1 rounded bg-zinc-800/50">
                    <span className="text-zinc-500">HS%</span>
                    <span className="text-white font-medium">{profile.skillStats.headshotPercentage?.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between px-2 py-1 rounded bg-zinc-800/50">
                    <span className="text-zinc-500">K/D</span>
                    <span className="text-white font-medium">{profile.skillStats.kd?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between px-2 py-1 rounded bg-zinc-800/50">
                    <span className="text-zinc-500">ADR</span>
                    <span className="text-white font-medium">{profile.skillStats.adr?.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between px-2 py-1 rounded bg-zinc-800/50">
                    <span className="text-zinc-500">Clutches</span>
                    <span className="text-white font-medium">{profile.skillStats.clutchesWon || 0}</span>
                  </div>
                </div>
              )}

              {!profile.skillStats && (
                <div className="text-center py-8">
                  <p className="text-zinc-500 text-sm">Sem dados suficientes</p>
                </div>
              )}
            </div>

            {/* ============================================ */}
            {/* BLOCO 3: TROPHY SHOWCASE (spans 4 cols) */}
            {/* ============================================ */}
            <div className="col-span-12 md:col-span-6 lg:col-span-4 rounded-2xl bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 p-6">
              <h3 className="font-bold text-white flex items-center gap-2 mb-4">
                <Trophy className={`w-5 h-5 ${theme.primary}`} />
                Sala de Troféus
              </h3>

              {profile.tournamentWins && profile.tournamentWins.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {profile.tournamentWins.slice(0, 6).map((trophy: any) => (
                    <div
                      key={trophy._id}
                      className="aspect-square rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-600/10 border border-yellow-500/30 flex flex-col items-center justify-center p-2 group cursor-pointer hover:scale-105 transition-transform"
                      title={`${trophy.name} - ${new Date(Number(trophy.finishedAt)).toLocaleDateString("pt-PT")}`}
                    >
                      <Trophy className="w-8 h-8 text-yellow-500 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] text-yellow-500/70 mt-1 text-center truncate w-full">
                        {trophy.name?.slice(0, 15)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Trophy className="w-12 h-12 text-zinc-700 mx-auto mb-2" />
                  <p className="text-zinc-500 text-sm">Sem troféus ainda</p>
                </div>
              )}
            </div>

            {/* ============================================ */}
            {/* BLOCO 4: HIGH ROLLER (Wager Stats) (spans 4 cols) */}
            {/* ============================================ */}
            <div className="col-span-12 md:col-span-6 lg:col-span-4 rounded-2xl bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 p-6">
              <h3 className="font-bold text-white flex items-center gap-2 mb-4">
                <Coins className={`w-5 h-5 ${theme.primary}`} />
                High Roller
              </h3>

              {wagerStats ? (
                <>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-3 rounded-xl bg-zinc-800/50">
                      <p className="text-xs text-zinc-500">Total Ganho</p>
                      <p className="text-xl font-black text-green-500">+{wagerStats.totalWon} Ⓢ</p>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-800/50">
                      <p className="text-xs text-zinc-500">Maior Pot</p>
                      <p className="text-xl font-black text-yellow-500">{wagerStats.biggestPot} Ⓢ</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm mb-3">
                    <span className="text-zinc-400">Win Rate</span>
                    <span className="font-bold text-white">{wagerStats.winRate}%</span>
                  </div>

                  {/* Mini Chart */}
                  <div className="flex items-end gap-1 h-12">
                    {wagerStats.recentResults.map((r: any, i: number) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-t ${r.won ? "bg-green-500" : "bg-red-500"}`}
                        style={{ height: `${Math.min(100, Math.abs(r.amount) / 10 + 20)}%` }}
                        title={`${r.won ? "+" : ""}${r.amount} Ⓢ`}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-zinc-600 text-center mt-1">Últimos 10 jogos</p>
                </>
              ) : (
                <div className="text-center py-8">
                  <Coins className="w-12 h-12 text-zinc-700 mx-auto mb-2" />
                  <p className="text-zinc-500 text-sm">Sem wagers</p>
                </div>
              )}
            </div>

            {/* ============================================ */}
            {/* BLOCO 5: SETUP & PERIPHERALS (spans 4 cols) */}
            {/* ============================================ */}
            <div className="col-span-12 lg:col-span-4 rounded-2xl bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 p-6">
              <h3 className="font-bold text-white flex items-center gap-2 mb-4">
                <Settings className={`w-5 h-5 ${theme.primary}`} />
                Setup
              </h3>

              <div className="space-y-3">
                {/* Crosshair */}
                {profile.crosshairCode && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/50">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-zinc-500" />
                      <span className="text-zinc-400 text-sm">Mira</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-zinc-300 bg-zinc-700 px-2 py-1 rounded max-w-[120px] truncate">
                        {profile.crosshairCode}
                      </code>
                      <button
                        onClick={handleCopyCrosshair}
                        className="p-1 rounded text-zinc-400 hover:text-white transition-colors"
                      >
                        {copiedCrosshair ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Resolution */}
                {profile.resolution && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/50">
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-zinc-500" />
                      <span className="text-zinc-400 text-sm">Resolução</span>
                    </div>
                    <span className="text-white text-sm">{profile.resolution} {profile.aspectRatio && `(${profile.aspectRatio})`}</span>
                  </div>
                )}

                {/* Sensitivity */}
                {(profile.mouseDpi || profile.sensitivity) && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/50">
                    <div className="flex items-center gap-2">
                      <Mouse className="w-4 h-4 text-zinc-500" />
                      <span className="text-zinc-400 text-sm">Sens</span>
                    </div>
                    <span className="text-white text-sm">
                      {profile.mouseDpi && `${profile.mouseDpi} DPI`}
                      {profile.mouseDpi && profile.sensitivity && " / "}
                      {profile.sensitivity && `${profile.sensitivity} in-game`}
                    </span>
                  </div>
                )}

                {/* Peripherals */}
                {profile.mouseModel && (
                  <div className="flex items-center justify-between p-2 rounded-lg">
                    <span className="text-zinc-500 text-xs">Mouse</span>
                    <span className="text-zinc-300 text-xs">{profile.mouseModel}</span>
                  </div>
                )}
                {profile.keyboardModel && (
                  <div className="flex items-center justify-between p-2 rounded-lg">
                    <span className="text-zinc-500 text-xs">Keyboard</span>
                    <span className="text-zinc-300 text-xs">{profile.keyboardModel}</span>
                  </div>
                )}
                {profile.monitorModel && (
                  <div className="flex items-center justify-between p-2 rounded-lg">
                    <span className="text-zinc-500 text-xs">Monitor</span>
                    <span className="text-zinc-300 text-xs">{profile.monitorModel}</span>
                  </div>
                )}

                {!profile.crosshairCode && !profile.resolution && !profile.mouseDpi && (
                  <div className="text-center py-4">
                    <p className="text-zinc-500 text-sm">Setup não configurado</p>
                  </div>
                )}
              </div>
            </div>

            {/* ============================================ */}
            {/* BLOCO 6: GUESTBOOK (WALL) (spans 8 cols) */}
            {/* ============================================ */}
            <div className="col-span-12 lg:col-span-8 rounded-2xl bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 p-6">
              <h3 className="font-bold text-white flex items-center gap-2 mb-4">
                <MessageSquare className={`w-5 h-5 ${theme.primary}`} />
                O Muro
              </h3>

              {/* Post Comment */}
              {!isOwn && (
                <div className="flex gap-3 mb-4">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Deixa um comentário..."
                    maxLength={200}
                    className="flex-1 px-4 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                  />
                  <button
                    onClick={handlePostComment}
                    disabled={!newComment.trim()}
                    className="px-4 py-2 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Comments */}
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {guestbook && guestbook.length > 0 ? (
                  guestbook.map((comment: any) => (
                    <div key={comment._id} className="flex items-start gap-3 p-3 rounded-xl bg-zinc-800/50">
                      <img
                        src={comment.author?.steamAvatar || "/default-avatar.png"}
                        alt=""
                        className="w-8 h-8 rounded-lg"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/profile/@${comment.author?.nickname}`}
                            className="font-medium text-white hover:text-orange-400 transition-colors"
                          >
                            {comment.author?.nickname}
                          </Link>
                          <span className="text-xs text-zinc-600">
                            {new Date(Number(comment.createdAt)).toLocaleDateString("pt-PT")}
                          </span>
                        </div>
                        <p className="text-zinc-300 text-sm mt-1">{comment.content}</p>
                      </div>
                      {isOwn && (
                        <button
                          onClick={() => deleteComment({ commentId: comment._id })}
                          className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 text-zinc-700 mx-auto mb-2" />
                    <p className="text-zinc-500 text-sm">Sem comentários ainda</p>
                    {!isOwn && <p className="text-zinc-600 text-xs mt-1">Sê o primeiro a deixar uma mensagem!</p>}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Calculate hexagon points for radar chart
 */
function calculateHexagonPoints(stats: any): string {
  const centerX = 100;
  const centerY = 100;
  const maxRadius = 80;

  // Normalize scores (0-100) and calculate points
  const scores = [
    (stats.aimScore || 50) / 100,
    (stats.impactScore || 50) / 100,
    (stats.survivalScore || 50) / 100,
    (stats.utilityScore || 50) / 100,
    (stats.clutchScore || 50) / 100,
    (stats.kastScore || 50) / 100,
  ];

  const points = scores.map((score, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const radius = maxRadius * Math.max(0.2, score);
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    return `${x},${y}`;
  });

  return points.join(" ");
}
