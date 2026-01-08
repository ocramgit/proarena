"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/layout/sidebar";
import { toast } from "sonner";
import { 
  Trophy, Target, UserPlus, Settings, Crosshair, MessageCircle, 
  Coins, Copy, Check, Send, Trash2, Volume2, VolumeX, X, ChevronRight,
  Swords, ExternalLink, Crown, BadgeCheck, User, Loader2, Zap, Flame,
  Shield, Brain, Eye, Ghost, Monitor, Mouse, Keyboard, Headphones, Info, Share2
} from "lucide-react";

/**
 * FASE 54: PROFILE 4.0 - "THE OPERATOR"
 * Game-Native Experience - Full Immersion Dashboard
 * Dossiê de Agente Classificado
 */

// ═══════════════════════════════════════════════════════════════════
// PLAYER DNA ARCHETYPES
// ═══════════════════════════════════════════════════════════════════
const ARCHETYPES = {
  ENTRY: { 
    name: "THE ENTRY", 
    icon: "🦅", 
    color: "#EF4444", 
    glow: "shadow-red-500/50",
    desc: "First blood hunter. Opens sites with aggression.",
    gradient: "from-red-600 to-orange-500"
  },
  ANCHOR: { 
    name: "THE ANCHOR", 
    icon: "🛡️", 
    color: "#3B82F6", 
    glow: "shadow-blue-500/50",
    desc: "Site defender. Holds angles with precision.",
    gradient: "from-blue-600 to-cyan-500"
  },
  IGL: { 
    name: "THE BRAIN", 
    icon: "🧠", 
    color: "#A855F7", 
    glow: "shadow-purple-500/50",
    desc: "Strategic mastermind. Controls the tempo.",
    gradient: "from-purple-600 to-pink-500"
  },
  CLUTCH: { 
    name: "THE CLUTCH", 
    icon: "👻", 
    color: "#10B981", 
    glow: "shadow-emerald-500/50",
    desc: "Ice in the veins. Wins impossible rounds.",
    gradient: "from-emerald-600 to-teal-500"
  },
  SNIPER: { 
    name: "THE AWP", 
    icon: "🎯", 
    color: "#F59E0B", 
    glow: "shadow-amber-500/50",
    desc: "One shot, one kill. Controls long angles.",
    gradient: "from-amber-600 to-yellow-500"
  },
};

// ═══════════════════════════════════════════════════════════════════
// PROFILE EVOLUTION TIERS
// ═══════════════════════════════════════════════════════════════════
function getProfileTier(level: number) {
  if (level >= 100) return {
    name: "GODLIKE",
    class: "tier-godlike",
    borderColor: "border-yellow-500",
    glowColor: "shadow-yellow-500/30",
    bgEffect: "bg-gradient-to-br from-yellow-900/20 via-amber-900/10 to-orange-900/20",
    particleColor: "#FFD700",
    scanlines: true,
  };
  if (level >= 50) return {
    name: "ELITE",
    class: "tier-elite",
    borderColor: "border-cyan-500",
    glowColor: "shadow-cyan-500/20",
    bgEffect: "bg-gradient-to-br from-cyan-900/20 via-blue-900/10 to-purple-900/20",
    particleColor: "#06B6D4",
    scanlines: false,
  };
  if (level >= 25) return {
    name: "VETERAN",
    class: "tier-veteran",
    borderColor: "border-zinc-500",
    glowColor: "shadow-zinc-500/10",
    bgEffect: "bg-gradient-to-br from-zinc-900/40 via-zinc-800/20 to-zinc-900/40",
    particleColor: "#71717A",
    scanlines: false,
  };
  return {
    name: "ROOKIE",
    class: "tier-rookie",
    borderColor: "border-zinc-700",
    glowColor: "",
    bgEffect: "bg-zinc-950",
    particleColor: "#3F3F46",
    scanlines: false,
  };
}

// ═══════════════════════════════════════════════════════════════════
// ELO LEVEL SYSTEM (Faceit-style 1-20)
// ═══════════════════════════════════════════════════════════════════
function getEloLevel(elo: number): { level: number; color: string; bg: string; border: string } {
  // Faceit-style: ELO maps to levels 1-20
  // 0-500 = 1, 501-650 = 2, 651-800 = 3... up to 2500+ = 20
  const thresholds = [
    { min: 2500, level: 20, color: "#FF4500", bg: "bg-orange-600/30", border: "border-orange-500" },
    { min: 2350, level: 19, color: "#FF5722", bg: "bg-orange-500/25", border: "border-orange-500" },
    { min: 2200, level: 18, color: "#FF6B35", bg: "bg-orange-500/20", border: "border-orange-400" },
    { min: 2050, level: 17, color: "#FF7043", bg: "bg-red-500/20", border: "border-red-400" },
    { min: 1900, level: 16, color: "#EF5350", bg: "bg-red-500/20", border: "border-red-400" },
    { min: 1750, level: 15, color: "#EC407A", bg: "bg-pink-500/20", border: "border-pink-400" },
    { min: 1600, level: 14, color: "#AB47BC", bg: "bg-purple-500/20", border: "border-purple-400" },
    { min: 1475, level: 13, color: "#7E57C2", bg: "bg-violet-500/20", border: "border-violet-400" },
    { min: 1350, level: 12, color: "#5C6BC0", bg: "bg-indigo-500/20", border: "border-indigo-400" },
    { min: 1225, level: 11, color: "#42A5F5", bg: "bg-blue-500/20", border: "border-blue-400" },
    { min: 1100, level: 10, color: "#29B6F6", bg: "bg-sky-500/20", border: "border-sky-400" },
    { min: 1000, level: 9, color: "#26C6DA", bg: "bg-cyan-500/20", border: "border-cyan-400" },
    { min: 900, level: 8, color: "#26A69A", bg: "bg-teal-500/20", border: "border-teal-400" },
    { min: 800, level: 7, color: "#66BB6A", bg: "bg-green-500/20", border: "border-green-400" },
    { min: 700, level: 6, color: "#9CCC65", bg: "bg-lime-500/20", border: "border-lime-400" },
    { min: 600, level: 5, color: "#D4E157", bg: "bg-yellow-500/20", border: "border-yellow-400" },
    { min: 500, level: 4, color: "#FFEE58", bg: "bg-yellow-400/20", border: "border-yellow-300" },
    { min: 400, level: 3, color: "#BDBDBD", bg: "bg-zinc-500/20", border: "border-zinc-400" },
    { min: 250, level: 2, color: "#9E9E9E", bg: "bg-zinc-600/20", border: "border-zinc-500" },
    { min: 0, level: 1, color: "#757575", bg: "bg-zinc-700/20", border: "border-zinc-600" },
  ];
  
  for (const t of thresholds) {
    if (elo >= t.min) return t;
  }
  return thresholds[thresholds.length - 1];
}

// ═══════════════════════════════════════════════════════════════════
// S-TIER RANKING SYSTEM (RPG Style)
// ═══════════════════════════════════════════════════════════════════
function getStatRank(value: number, max: number = 100): { rank: string; color: string } {
  const percentage = (value / max) * 100;
  if (percentage >= 95) return { rank: "S+", color: "text-yellow-400" };
  if (percentage >= 85) return { rank: "S", color: "text-yellow-500" };
  if (percentage >= 75) return { rank: "A+", color: "text-orange-400" };
  if (percentage >= 65) return { rank: "A", color: "text-orange-500" };
  if (percentage >= 55) return { rank: "B+", color: "text-green-400" };
  if (percentage >= 45) return { rank: "B", color: "text-green-500" };
  if (percentage >= 35) return { rank: "C+", color: "text-blue-400" };
  if (percentage >= 25) return { rank: "C", color: "text-blue-500" };
  if (percentage >= 15) return { rank: "D", color: "text-zinc-400" };
  return { rank: "F", color: "text-zinc-600" };
}

// Calculate OVR (Overall Rating 0-99)
function calculateOVR(stats: any): number {
  if (!stats) return 50;
  const kd = Math.min(stats.kd || 1, 3) / 3 * 100;
  const hs = stats.hsPercentage || 30;
  const wr = stats.winRate || 50;
  const adr = Math.min(stats.adr || 70, 150) / 150 * 100;
  return Math.round((kd * 0.3 + hs * 0.2 + wr * 0.3 + adr * 0.2));
}

// Calculate market value in Soberanas
function calculateMarketValue(ovr: number, level: number, matches: number): number {
  const base = ovr * 100;
  const levelBonus = level * 50;
  const experienceBonus = Math.min(matches, 500) * 2;
  return base + levelBonus + experienceBonus;
}

// Determine player archetype from stats
function determineArchetype(stats: any): keyof typeof ARCHETYPES {
  if (!stats) return "ANCHOR";
  // Simple heuristic - in real app would use actual game data
  if (stats.hsPercentage > 55) return "SNIPER";
  if (stats.kd > 1.3 && stats.adr > 85) return "ENTRY";
  if (stats.winRate > 55 && stats.kd < 1.1) return "IGL";
  if (stats.clutchRate > 30) return "CLUTCH";
  return "ANCHOR";
}

export default function ProfilePage() {
  const params = useParams();
  const rawUsername = params.username as string;
  
  // Decode %40nickname -> @nickname, then remove @
  const decodedUsername = decodeURIComponent(rawUsername);
  const identifier = decodedUsername.startsWith("@") ? decodedUsername.slice(1) : decodedUsername;

  const currentUser = useQuery(api.users.getCurrentUser);
  
  // Check if identifier looks like a clerkId (starts with "user_")
  const isClerkId = identifier.startsWith("user_");
  
  // Try to get user by clerkId first if it looks like one, otherwise try nickname
  const profileUserByClerkId = useQuery(
    api.users.getUserByClerkId,
    isClerkId ? { clerkId: identifier } : "skip"
  );
  
  const profileUserByNickname = useQuery(
    api.users.getUserByNickname, 
    !isClerkId ? { nickname: identifier } : "skip"
  );
  
  const profileUser = profileUserByClerkId || profileUserByNickname;
  
  // Stats queries
  const advancedStats = useQuery(
    api.stats.getAdvancedStats, 
    profileUser ? { userId: profileUser._id } : "skip"
  );
  
  const userBadges = useQuery(
    api.badges.getUserBadges,
    profileUser ? { userId: profileUser._id } : "skip"
  );

  // FASE 54: New Profile 3.0 queries
  const wagerStats = useQuery(
    api.profile.getWagerStats,
    profileUser ? { userId: profileUser._id } : "skip"
  );

  const guestbook = useQuery(
    api.profile.getGuestbook,
    profileUser ? { profileUserId: profileUser._id, limit: 10 } : "skip"
  );

  const postComment = useMutation(api.profile.postGuestbookComment);
  const deleteComment = useMutation(api.profile.deleteGuestbookComment);

  const [newComment, setNewComment] = useState("");
  const [copiedCrosshair, setCopiedCrosshair] = useState(false);

  // Check if viewing own profile
  const isOwnProfile = currentUser?._id === profileUser?._id;

  // FASE 38: Friend status
  const friendshipStatus = useQuery(
    api.friendsNew.getFriendshipStatus,
    profileUser && currentUser && !isOwnProfile ? { targetUserId: profileUser._id } : "skip"
  );

  const sendFriendRequest = useMutation(api.friendsNew.sendFriendRequest);
  const acceptFriendRequest = useMutation(api.friendsNew.acceptFriendRequest);
  const removeFriendship = useMutation(api.friendsNew.removeFriendship);
  const [friendLoading, setFriendLoading] = useState(false);

  const handleAddFriend = async () => {
    if (!profileUser || friendLoading) return;
    setFriendLoading(true);
    try {
      await sendFriendRequest({ targetUserId: profileUser._id });
      toast.success("Pedido de amizade enviado!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar pedido");
    } finally {
      setFriendLoading(false);
    }
  };

  const handleAcceptFriend = async () => {
    if (!friendshipStatus?.friendshipId || friendLoading) return;
    setFriendLoading(true);
    try {
      await acceptFriendRequest({ friendshipId: friendshipStatus.friendshipId });
      toast.success("Pedido aceite!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao aceitar pedido");
    } finally {
      setFriendLoading(false);
    }
  };

  const handleRemoveFriend = async () => {
    if (!friendshipStatus?.friendshipId || friendLoading) return;
    setFriendLoading(true);
    try {
      await removeFriendship({ friendshipId: friendshipStatus.friendshipId });
      toast.success("Amizade removida");
    } catch (error: any) {
      toast.error(error.message || "Erro ao remover amizade");
    } finally {
      setFriendLoading(false);
    }
  };

  // FASE 54: Guestbook handlers
  const [postingComment, setPostingComment] = useState(false);
  const handlePostComment = async () => {
    if (!newComment.trim() || !profileUser || postingComment) return;
    setPostingComment(true);
    try {
      await postComment({ profileUserId: profileUser._id, content: newComment.trim() });
      setNewComment("");
      toast.success("Comentário publicado!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao publicar");
    } finally {
      setPostingComment(false);
    }
  };

  const handleCopyCrosshair = () => {
    if (profileUser?.crosshairCode) {
      navigator.clipboard.writeText(profileUser.crosshairCode);
      setCopiedCrosshair(true);
      setTimeout(() => setCopiedCrosshair(false), 2000);
      toast.success("Mira copiada!");
    }
  };

  // Profile 4.0 State
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isMuted, setIsMuted] = useState(true);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Track mouse for tilt effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Loading state
  if (profileUser === undefined) {
    return (
      <div className="flex h-screen bg-black overflow-hidden">
        <Sidebar />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-zinc-500 font-mono text-sm tracking-wider">LOADING AGENT DOSSIER...</p>
          </div>
        </div>
      </div>
    );
  }

  // 404 - Agent not found
  if (!profileUser) {
    return (
      <div className="flex h-screen bg-black overflow-hidden">
        <Sidebar />
        <div className="flex-1 ml-64 flex items-center justify-center relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(239,68,68,0.1)_0%,_transparent_70%)]" />
          <div className="text-center relative z-10">
            <div className="text-8xl font-black text-red-500/20 mb-4">404</div>
            <h1 className="text-2xl font-black text-white mb-2 tracking-wider">AGENT NOT FOUND</h1>
            <p className="text-zinc-500 font-mono text-sm mb-6">DOSSIER @{identifier} DOES NOT EXIST</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded bg-red-500/20 border border-red-500/50 text-red-400 font-bold hover:bg-red-500/30 transition-colors"
            >
              RETURN TO BASE
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Calculate all profile data
  const level = Math.floor((profileUser.matchesPlayed || 0) / 10) + 1;
  const profileTier = getProfileTier(level);
  const archetype = determineArchetype(advancedStats);
  const archetypeData = ARCHETYPES[archetype];
  const ovr = calculateOVR(advancedStats);
  const eloLevel = getEloLevel(profileUser.elo_5v5 || 1000);

  // S-Tier stats - use survivalRate and multiKills as proxies for missing stats
  const aimRank = getStatRank(advancedStats?.hsPercentage || 30, 60);
  const brainRank = getStatRank(advancedStats?.winRate || 50, 70);
  const speedRank = getStatRank(advancedStats?.survivalRate || 50, 100);
  const clutchRank = getStatRank(advancedStats?.multiKills || 5, 20);

  return (
    <div className="flex h-screen bg-black overflow-hidden">
      <Sidebar />
      
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* PROFILE 4.0: THE OPERATOR - FULL IMMERSION (100vh, NO SCROLL)      */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className={`flex-1 ml-64 h-screen overflow-hidden relative ${profileTier.bgEffect}`}>
        
        {/* DYNAMIC BACKGROUND */}
        <div className="absolute inset-0">
          {/* Animated gradient based on archetype */}
          <div 
            className="absolute inset-0 opacity-30"
            style={{
              background: `radial-gradient(ellipse at 30% 50%, ${archetypeData.color}20 0%, transparent 50%),
                          radial-gradient(ellipse at 70% 80%, ${archetypeData.color}10 0%, transparent 40%)`
            }}
          />
          
          {/* Floating particles effect */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 rounded-full animate-pulse"
                style={{
                  backgroundColor: profileTier.particleColor,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${2 + Math.random() * 3}s`,
                  opacity: 0.3 + Math.random() * 0.4,
                }}
              />
            ))}
          </div>

          {/* Scanlines for GODLIKE tier */}
          {profileTier.scanlines && (
            <div 
              className="absolute inset-0 pointer-events-none opacity-5"
              style={{
                backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)"
              }}
            />
          )}

          {/* Grid pattern */}
          <div 
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
              backgroundSize: "50px 50px"
            }}
          />
        </div>

        {/* ═══════════════════════════════════════════════════ */}
        {/* MAIN CONTENT - DYNAMIC PROFILE LAYOUT              */}
        {/* ═══════════════════════════════════════════════════ */}
        <div className="relative z-10 h-full flex items-center justify-center px-8 py-6">
          
          {/* DYNAMIC HERO CARD - FULL WIDTH */}
          <div
            ref={cardRef}
            className="relative cursor-pointer transition-transform duration-300"
            style={{
              transform: `perspective(1000px) rotateY(${(mousePos.x - window.innerWidth / 2) / 120}deg) rotateX(${-(mousePos.y - window.innerHeight / 2) / 120}deg)`,
            }}
          >
            {/* Outer glow */}
            <div 
              className="absolute -inset-3 rounded-3xl opacity-30 blur-2xl"
              style={{ background: `linear-gradient(135deg, ${archetypeData.color}, ${eloLevel.color})` }}
            />
            
            {/* Main card - wider for more content */}
            <div 
              className="relative w-[600px] rounded-3xl overflow-hidden"
              style={{
                background: `linear-gradient(180deg, rgba(18,18,18,0.98) 0%, rgba(8,8,8,0.98) 100%)`,
                boxShadow: `0 30px 60px -15px rgba(0,0,0,0.9)`,
              }}
            >
              {/* Top gradient bar */}
              <div 
                className="h-1 w-full"
                style={{ background: `linear-gradient(90deg, ${archetypeData.color}, ${eloLevel.color}, ${archetypeData.color})` }}
              />

              {/* Holographic shine */}
              <div 
                className="absolute inset-0 opacity-5 pointer-events-none"
                style={{
                  background: `linear-gradient(${Math.atan2(mousePos.y - window.innerHeight/2, mousePos.x - window.innerWidth/2) * 180 / Math.PI + 90}deg, transparent 30%, rgba(255,255,255,0.8) 50%, transparent 70%)`,
                }}
              />

              {/* Card content */}
              <div className="relative z-10 p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-mono text-zinc-500 tracking-widest">PROARENA PLAYER CARD</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {profileUser.isVerified && <BadgeCheck className="w-5 h-5 text-blue-500" />}
                    {profileUser.isPremium && <Crown className="w-5 h-5 text-yellow-500" />}
                  </div>
                </div>

                {/* Main Content - Two Column */}
                <div className="flex gap-8">
                  {/* Left: Avatar + Identity */}
                  <div className="flex-shrink-0">
                    {/* Avatar */}
                    <div 
                      className="w-40 h-40 rounded-2xl overflow-hidden mb-4"
                      style={{ 
                        border: `3px solid ${archetypeData.color}50`,
                        boxShadow: `0 0 30px ${archetypeData.color}20`
                      }}
                    >
                      {profileUser.steamAvatar ? (
                        <img src={profileUser.steamAvatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${archetypeData.gradient} flex items-center justify-center`}>
                          <span className="text-6xl font-black text-white">{(profileUser.nickname || "?")[0]}</span>
                        </div>
                      )}
                    </div>

                    {/* Level Badge */}
                    <div 
                      className={`w-40 p-3 rounded-xl text-center ${eloLevel.bg} ${eloLevel.border} border`}
                    >
                      <div className="flex items-center justify-center gap-3">
                        <span 
                          className="text-4xl font-black"
                          style={{ color: eloLevel.color }}
                        >
                          {eloLevel.level}
                        </span>
                        <div className="text-left">
                          <p className="text-white font-bold">{(profileUser.elo_5v5 || 1000).toLocaleString()}</p>
                          <p className="text-zinc-500 text-xs">ELO</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Info + Stats */}
                  <div className="flex-1">
                    {/* Name & Handle */}
                    <div className="mb-4">
                      <h1 className="text-4xl font-black text-white mb-1">
                        {profileUser.nickname || profileUser.steamName}
                      </h1>
                      <p className="text-zinc-500 text-lg">@{profileUser.nickname || identifier}</p>
                    </div>

                    {/* Stats Bars */}
                    <div className="space-y-3">
                      {/* AIM */}
                      <div className="flex items-center gap-4">
                        <div className="w-16 flex items-center gap-2">
                          <Crosshair className="w-4 h-4 text-zinc-600" />
                          <span className="text-xs text-zinc-500 font-mono">AIM</span>
                        </div>
                        <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-1000"
                            style={{ 
                              width: `${Math.min((advancedStats?.hsPercentage || 30) / 60 * 100, 100)}%`,
                              background: `linear-gradient(90deg, ${archetypeData.color}80, ${archetypeData.color})`
                            }}
                          />
                        </div>
                        <span className={`text-lg font-black w-10 text-right ${aimRank.color}`}>{aimRank.rank}</span>
                      </div>

                      {/* BRAIN */}
                      <div className="flex items-center gap-4">
                        <div className="w-16 flex items-center gap-2">
                          <Brain className="w-4 h-4 text-zinc-600" />
                          <span className="text-xs text-zinc-500 font-mono">BRAIN</span>
                        </div>
                        <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-1000"
                            style={{ 
                              width: `${Math.min((advancedStats?.winRate || 50) / 70 * 100, 100)}%`,
                              background: `linear-gradient(90deg, ${archetypeData.color}80, ${archetypeData.color})`
                            }}
                          />
                        </div>
                        <span className={`text-lg font-black w-10 text-right ${brainRank.color}`}>{brainRank.rank}</span>
                      </div>

                      {/* IMPACT */}
                      <div className="flex items-center gap-4">
                        <div className="w-16 flex items-center gap-2">
                          <Zap className="w-4 h-4 text-zinc-600" />
                          <span className="text-xs text-zinc-500 font-mono">IMPACT</span>
                        </div>
                        <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-1000"
                            style={{ 
                              width: `${Math.min((advancedStats?.survivalRate || 50) / 100 * 100, 100)}%`,
                              background: `linear-gradient(90deg, ${archetypeData.color}80, ${archetypeData.color})`
                            }}
                          />
                        </div>
                        <span className={`text-lg font-black w-10 text-right ${speedRank.color}`}>{speedRank.rank}</span>
                      </div>

                      {/* CLUTCH */}
                      <div className="flex items-center gap-4">
                        <div className="w-16 flex items-center gap-2">
                          <Ghost className="w-4 h-4 text-zinc-600" />
                          <span className="text-xs text-zinc-500 font-mono">CLUTCH</span>
                        </div>
                        <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-1000"
                            style={{ 
                              width: `${Math.min((advancedStats?.multiKills || 5) / 20 * 100, 100)}%`,
                              background: `linear-gradient(90deg, ${archetypeData.color}80, ${archetypeData.color})`
                            }}
                          />
                        </div>
                        <span className={`text-lg font-black w-10 text-right ${clutchRank.color}`}>{clutchRank.rank}</span>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="flex gap-6 mt-6 pt-4 border-t border-zinc-800">
                      <div>
                        <p className="text-2xl font-black text-white">{(profileUser.matchesPlayed || 0).toLocaleString()}</p>
                        <p className="text-xs text-zinc-600 font-mono">MATCHES</p>
                      </div>
                      <div>
                        <p className="text-2xl font-black text-white">{advancedStats?.kd?.toFixed(2) || "0.00"}</p>
                        <p className="text-xs text-zinc-600 font-mono">K/D</p>
                      </div>
                      <div>
                        <p className="text-2xl font-black text-white">{advancedStats?.hsPercentage?.toFixed(0) || 0}%</p>
                        <p className="text-xs text-zinc-600 font-mono">HS%</p>
                      </div>
                      <div>
                        <p className="text-2xl font-black text-white">{advancedStats?.winRate?.toFixed(0) || 0}%</p>
                        <p className="text-xs text-zinc-600 font-mono">WIN</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between">
                  <span className="text-xs font-mono text-zinc-600">
                    ID: {profileUser._id.slice(-8).toUpperCase()}
                  </span>
                  <div className="flex items-center gap-4">
                    {/* Action Buttons - Inline */}
                    {!isOwnProfile && (
                      <>
                        <Link
                          href={`/wagers?challenge=${profileUser._id}`}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all hover:opacity-80"
                          style={{ backgroundColor: archetypeData.color + "20", color: archetypeData.color }}
                        >
                          <Swords className="w-4 h-4" />
                          CHALLENGE
                        </Link>
                        <button
                          onClick={handleAddFriend}
                          disabled={friendLoading}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white text-sm font-bold transition-all disabled:opacity-50"
                        >
                          {friendLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <UserPlus className="w-4 h-4" />
                          )}
                          {friendLoading ? "..." : "ADD"}
                        </button>
                      </>
                    )}
                    {isOwnProfile && (
                      <Link
                        href="/profile/settings"
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white text-sm font-bold transition-all"
                      >
                        <Settings className="w-4 h-4" />
                        EDIT
                      </Link>
                    )}
                    <button
                      onClick={() => setShowDetailPanel(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 text-zinc-500 hover:text-zinc-300 text-sm transition-all"
                    >
                      <ChevronRight className="w-4 h-4" />
                      MORE
                    </button>
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/profile/@${profileUser.nickname || identifier}`;
                        navigator.clipboard.writeText(url);
                        toast.success("Link do perfil copiado!");
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 text-zinc-500 hover:text-zinc-300 text-sm transition-all"
                    >
                      <Share2 className="w-4 h-4" />
                      SHARE
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* DETAIL PANEL - SLIDE OVER                                         */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {showDetailPanel && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowDetailPanel(false)}
            />
            
            {/* Panel */}
            <div className="relative w-full max-w-lg h-full bg-zinc-950 border-l border-zinc-800 overflow-y-auto animate-slide-in">
              {/* Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-zinc-950/90 backdrop-blur border-b border-zinc-800">
                <h2 className="text-lg font-black text-white tracking-wider">AGENT DOSSIER</h2>
                <button 
                  onClick={() => setShowDetailPanel(false)}
                  className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-6">
                {/* BIO SECTION */}
                {profileUser.bio && (
                  <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                    <h3 className="text-xs font-mono text-zinc-500 tracking-wider mb-2">BIO</h3>
                    <p className="text-zinc-300">{profileUser.bio}</p>
                  </div>
                )}

                {/* DETAILED COMBAT STATS */}
                <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                  <h3 className="text-xs font-mono text-zinc-500 tracking-wider mb-4 flex items-center gap-2">
                    <Target className="w-4 h-4" /> COMBAT STATISTICS
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-zinc-800/50">
                      <p className="text-2xl font-black text-white">{advancedStats?.kd?.toFixed(2) || "0.00"}</p>
                      <p className="text-xs text-zinc-500">K/D Ratio</p>
                    </div>
                    <div className="p-3 rounded-lg bg-zinc-800/50">
                      <p className="text-2xl font-black text-blue-400">{advancedStats?.hsPercentage?.toFixed(0) || 0}%</p>
                      <p className="text-xs text-zinc-500">Headshot %</p>
                    </div>
                    <div className="p-3 rounded-lg bg-zinc-800/50">
                      <p className="text-2xl font-black text-orange-400">{advancedStats?.survivalRate?.toFixed(0) || 0}%</p>
                      <p className="text-xs text-zinc-500">Survival</p>
                    </div>
                    <div className="p-3 rounded-lg bg-zinc-800/50">
                      <p className="text-2xl font-black text-green-400">{advancedStats?.winRate?.toFixed(0) || 0}%</p>
                      <p className="text-xs text-zinc-500">Win Rate</p>
                    </div>
                    <div className="p-3 rounded-lg bg-zinc-800/50">
                      <p className="text-2xl font-black text-white">{advancedStats?.totalMatches || 0}</p>
                      <p className="text-xs text-zinc-500">Total Matches</p>
                    </div>
                    <div className="p-3 rounded-lg bg-zinc-800/50">
                      <p className="text-2xl font-black text-white">{advancedStats?.multiKills || 0}</p>
                      <p className="text-xs text-zinc-500">Multi-Kills</p>
                    </div>
                  </div>
                </div>

                {/* WAGER STATS - HIGH ROLLER */}
                <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                  <h3 className="text-xs font-mono text-zinc-500 tracking-wider mb-4 flex items-center gap-2">
                    <Coins className="w-4 h-4 text-yellow-500" /> HIGH ROLLER STATS
                  </h3>
                  {wagerStats && (wagerStats.wins > 0 || wagerStats.losses > 0) ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg bg-zinc-800/50 text-center">
                          <p className="text-2xl font-black text-green-500">+{wagerStats.totalWon}Ⓢ</p>
                          <p className="text-xs text-zinc-500">Total Ganho</p>
                        </div>
                        <div className="p-3 rounded-lg bg-zinc-800/50 text-center">
                          <p className="text-2xl font-black text-yellow-500">{wagerStats.biggestPot}Ⓢ</p>
                          <p className="text-xs text-zinc-500">Maior Pot</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-lg bg-zinc-800/50">
                        <span className="text-zinc-400">Record</span>
                        <span className="font-black">
                          <span className="text-green-500">{wagerStats.wins}W</span>
                          <span className="text-zinc-600 mx-1">/</span>
                          <span className="text-red-500">{wagerStats.losses}L</span>
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-lg bg-zinc-800/50">
                        <span className="text-zinc-400">Win Rate</span>
                        <span className="font-black text-white">{wagerStats.winRate?.toFixed(0) || 0}%</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Coins className="w-10 h-10 text-zinc-700 mx-auto mb-2" />
                      <p className="text-zinc-500 text-sm">Sem wagers ainda</p>
                    </div>
                  )}
                </div>

                {/* SETUP & PERIPHERALS */}
                <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                  <h3 className="text-xs font-mono text-zinc-500 tracking-wider mb-4 flex items-center gap-2">
                    <Settings className="w-4 h-4" /> SETUP & PERIPHERALS
                  </h3>
                  <div className="space-y-2">
                    {profileUser.crosshairCode && (
                      <div className="flex justify-between items-center p-3 rounded-lg bg-zinc-800/50">
                        <span className="text-zinc-400 flex items-center gap-2">
                          <Crosshair className="w-4 h-4" /> Crosshair
                        </span>
                        <div className="flex items-center gap-2">
                          <code className="text-sm text-zinc-300 bg-zinc-700 px-2 py-1 rounded">{profileUser.crosshairCode}</code>
                          <button onClick={handleCopyCrosshair} className="p-1 text-zinc-500 hover:text-white">
                            {copiedCrosshair ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    )}
                    {profileUser.resolution && (
                      <div className="flex justify-between items-center p-3 rounded-lg bg-zinc-800/50">
                        <span className="text-zinc-400 flex items-center gap-2">
                          <Monitor className="w-4 h-4" /> Resolution
                        </span>
                        <span className="text-white font-medium">{profileUser.resolution}</span>
                      </div>
                    )}
                    {profileUser.mouseDpi && (
                      <div className="flex justify-between items-center p-3 rounded-lg bg-zinc-800/50">
                        <span className="text-zinc-400 flex items-center gap-2">
                          <Mouse className="w-4 h-4" /> DPI
                        </span>
                        <span className="text-white font-medium">{profileUser.mouseDpi}</span>
                      </div>
                    )}
                    {profileUser.sensitivity && (
                      <div className="flex justify-between items-center p-3 rounded-lg bg-zinc-800/50">
                        <span className="text-zinc-400 flex items-center gap-2">
                          <Target className="w-4 h-4" /> Sensitivity
                        </span>
                        <span className="text-white font-medium">{profileUser.sensitivity}</span>
                      </div>
                    )}
                    {profileUser.mouseModel && (
                      <div className="flex justify-between items-center p-3 rounded-lg bg-zinc-800/50">
                        <span className="text-zinc-400 flex items-center gap-2">
                          <Mouse className="w-4 h-4" /> Mouse
                        </span>
                        <span className="text-white font-medium">{profileUser.mouseModel}</span>
                      </div>
                    )}
                    {profileUser.keyboardModel && (
                      <div className="flex justify-between items-center p-3 rounded-lg bg-zinc-800/50">
                        <span className="text-zinc-400 flex items-center gap-2">
                          <Keyboard className="w-4 h-4" /> Keyboard
                        </span>
                        <span className="text-white font-medium">{profileUser.keyboardModel}</span>
                      </div>
                    )}
                    {profileUser.headsetModel && (
                      <div className="flex justify-between items-center p-3 rounded-lg bg-zinc-800/50">
                        <span className="text-zinc-400 flex items-center gap-2">
                          <Headphones className="w-4 h-4" /> Headset
                        </span>
                        <span className="text-white font-medium">{profileUser.headsetModel}</span>
                      </div>
                    )}
                    {!profileUser.crosshairCode && !profileUser.resolution && !profileUser.mouseDpi && (
                      <div className="text-center py-6">
                        <Settings className="w-10 h-10 text-zinc-700 mx-auto mb-2" />
                        <p className="text-zinc-500 text-sm">Setup não configurado</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* TROPHIES & BADGES */}
                <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                  <h3 className="text-xs font-mono text-zinc-500 tracking-wider mb-4 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-500" /> TROPHIES & BADGES
                  </h3>
                  {userBadges && userBadges.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {userBadges.map((badge: any) => (
                        <div 
                          key={badge._id} 
                          className="aspect-square rounded-xl bg-zinc-800/50 flex flex-col items-center justify-center p-2 hover:bg-zinc-700/50 transition-colors cursor-pointer"
                          title={badge.description}
                        >
                          <span className="text-2xl">{badge.icon}</span>
                          <span className="text-[10px] text-zinc-500 mt-1 truncate w-full text-center">{badge.name}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Trophy className="w-10 h-10 text-zinc-700 mx-auto mb-2" />
                      <p className="text-zinc-500 text-sm">Sem troféus ainda</p>
                    </div>
                  )}
                </div>

                {/* GUESTBOOK - O MURO */}
                <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                  <h3 className="text-xs font-mono text-zinc-500 tracking-wider mb-4 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-cyan-500" /> O MURO
                  </h3>
                  
                  {/* Post Comment */}
                  {!isOwnProfile && currentUser && (
                    <div className="flex gap-2 mb-4">
                      <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="+rep, gg, nice aim..."
                        maxLength={200}
                        className="flex-1 px-4 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                        onKeyDown={(e) => e.key === "Enter" && handlePostComment()}
                      />
                      <button
                        onClick={handlePostComment}
                        disabled={!newComment.trim()}
                        className="px-4 py-2 rounded-xl bg-cyan-500 text-white font-medium hover:bg-cyan-400 disabled:opacity-50 transition-colors"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Comments */}
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {guestbook && guestbook.length > 0 ? (
                      guestbook.map((comment: any) => (
                        <div key={comment._id} className="flex items-start gap-3 p-3 rounded-xl bg-zinc-800/30">
                          <img 
                            src={comment.author?.steamAvatar || "/default-avatar.png"} 
                            alt="" 
                            className="w-8 h-8 rounded-lg flex-shrink-0" 
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Link 
                                href={`/profile/@${comment.author?.nickname}`} 
                                className="font-medium text-white text-sm hover:text-cyan-400"
                              >
                                {comment.author?.nickname}
                              </Link>
                              <span className="text-[10px] text-zinc-600">
                                {new Date(Number(comment.createdAt)).toLocaleDateString("pt-PT")}
                              </span>
                            </div>
                            <p className="text-zinc-400 text-sm">{comment.content}</p>
                          </div>
                          {isOwnProfile && (
                            <button 
                              onClick={() => deleteComment({ commentId: comment._id })} 
                              className="p-1 text-zinc-600 hover:text-red-400 flex-shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6">
                        <MessageCircle className="w-10 h-10 text-zinc-700 mx-auto mb-2" />
                        <p className="text-zinc-500 text-sm">Sem comentários</p>
                        {!isOwnProfile && <p className="text-zinc-600 text-xs mt-1">Sê o primeiro!</p>}
                      </div>
                    )}
                  </div>
                </div>

                {/* STEAM LINK */}
                {profileUser.steamProfileUrl && (
                  <a
                    href={profileUser.steamProfileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Ver Perfil Steam
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CSS for breathing animation */}
        <style jsx>{`
          @keyframes breathe {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.02); }
          }
          @keyframes slide-in {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
          .animate-slide-in {
            animation: slide-in 0.3s ease-out;
          }
        `}</style>
      </div>
    </div>
  );
}
