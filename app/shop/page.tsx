"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Sidebar } from "@/components/layout/sidebar";
import { 
  Swords, 
  Trophy, 
  TrendingUp, 
  Shield, 
  Zap, 
  HelpCircle,
  Sparkles,
  Crown,
  Star,
  Check,
  X,
  Coins
} from "lucide-react";

/**
 * FASE 50: COMPRAR SOBERANAS
 * Página para recarregar saldo de moeda virtual
 * Com Sidebar lateral
 */

interface PricingTier {
  id: string;
  name: string;
  amount: number;
  bonus: number;
  price: number;
  badge?: string;
  badgeColor?: string;
  recommended?: boolean;
  icon: React.ReactNode;
  gradient: string;
  glowColor: string;
}

const PRICING_TIERS: PricingTier[] = [
  {
    id: "starter",
    name: "Starter Pack",
    amount: 100,
    bonus: 0,
    price: 10.00,
    icon: <Star className="w-8 h-8" />,
    gradient: "from-zinc-600 to-zinc-700",
    glowColor: "rgba(161, 161, 170, 0.3)",
  },
  {
    id: "challenger",
    name: "Challenger",
    amount: 500,
    bonus: 50,
    price: 45.00,
    badge: "POPULAR",
    badgeColor: "bg-blue-500",
    icon: <Sparkles className="w-8 h-8" />,
    gradient: "from-blue-600 to-blue-700",
    glowColor: "rgba(59, 130, 246, 0.4)",
  },
  {
    id: "elite",
    name: "Elite",
    amount: 1200,
    bonus: 250,
    price: 100.00,
    badge: "MELHOR VALOR",
    badgeColor: "bg-gradient-to-r from-yellow-500 to-amber-500",
    recommended: true,
    icon: <Crown className="w-8 h-8" />,
    gradient: "from-yellow-600 to-amber-600",
    glowColor: "rgba(234, 179, 8, 0.5)",
  },
  {
    id: "immortal",
    name: "Immortal Vault",
    amount: 3000,
    bonus: 750,
    price: 250.00,
    badge: "ÉPICO",
    badgeColor: "bg-gradient-to-r from-purple-500 to-pink-500",
    icon: <Trophy className="w-8 h-8" />,
    gradient: "from-purple-600 to-pink-600",
    glowColor: "rgba(168, 85, 247, 0.4)",
  },
];

export default function ShopPage() {
  const router = useRouter();
  const balance = useQuery(api.economy.getBalance);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handlePurchase = (tier: PricingTier) => {
    setSelectedTier(tier.id);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedTier(null);
  };

  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden">
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 ml-64 pt-14 overflow-y-auto">
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-black text-white flex items-center gap-3">
                <Coins className="w-8 h-8 text-yellow-500" />
                Comprar Soberanas
              </h1>
              <p className="text-zinc-400 mt-1">Recarrega o teu saldo para competir</p>
            </div>
            {balance && (
              <div className="px-6 py-3 rounded-xl bg-zinc-900 border border-yellow-500/30">
                <div className="text-xs text-zinc-500 mb-1">Saldo atual</div>
                <div className="text-2xl font-black text-yellow-500">
                  {balance.balance.toFixed(0)} {balance.symbol}
                </div>
              </div>
            )}
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-12">
            {PRICING_TIERS.map((tier) => (
              <PricingCard 
                key={tier.id} 
                tier={tier} 
                onPurchase={handlePurchase}
              />
            ))}
          </div>

          {/* Trust Signals */}
          <div className="flex flex-wrap items-center justify-center gap-8 p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div className="flex items-center gap-3 text-zinc-400">
              <Shield className="w-5 h-5 text-green-500" />
              <span className="text-sm">Pagamentos Seguros</span>
            </div>
            <div className="flex items-center gap-3 text-zinc-400">
              <Zap className="w-5 h-5 text-yellow-500" />
              <span className="text-sm">Entrega Instantânea</span>
            </div>
            <button 
              onClick={() => router.push("/support")}
              className="flex items-center gap-3 text-zinc-400 hover:text-white transition-colors"
            >
              <HelpCircle className="w-5 h-5 text-blue-500" />
              <span className="text-sm">FAQ & Suporte</span>
            </button>
          </div>
        </div>
      </div>

      {/* Payment Coming Soon Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <button 
              onClick={closeModal}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-yellow-500/20 to-amber-500/20 flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-yellow-500" />
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-2">
                Brevemente Disponível
              </h3>
              <p className="text-zinc-400 mb-6">
                A integração de pagamentos está a ser finalizada. Em breve poderás adquirir Soberanas diretamente!
              </p>

              <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700 mb-6">
                <div className="flex items-center justify-center gap-2 text-yellow-500">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">Sistema de saldo funcional</span>
                </div>
              </div>

              <button
                onClick={closeModal}
                className="w-full py-3 px-6 rounded-lg bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black font-bold transition-all duration-300 hover:shadow-[0_0_20px_rgba(234,179,8,0.4)]"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Pricing Card Component
function PricingCard({ 
  tier, 
  onPurchase 
}: { 
  tier: PricingTier; 
  onPurchase: (tier: PricingTier) => void;
}) {
  const totalAmount = tier.amount + tier.bonus;
  const bonusPercent = tier.bonus > 0 ? Math.round((tier.bonus / tier.amount) * 100) : 0;

  return (
    <div 
      className={`relative group rounded-2xl p-6 bg-zinc-900/80 border transition-all duration-300 cursor-pointer
        ${tier.recommended 
          ? "border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.2)] scale-105 lg:scale-110" 
          : "border-zinc-800 hover:border-zinc-600"
        }
        hover:shadow-[0_0_40px_${tier.glowColor}] hover:scale-105 hover:-translate-y-2
      `}
      onClick={() => onPurchase(tier)}
    >
      {/* Badge */}
      {tier.badge && (
        <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white ${tier.badgeColor}`}>
          {tier.badge}
        </div>
      )}

      {/* Icon */}
      <div className={`w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br ${tier.gradient} flex items-center justify-center text-white group-hover:scale-110 transition-transform`}>
        {tier.icon}
      </div>

      {/* Tier Name */}
      <h3 className="text-lg font-bold text-white text-center mb-2">{tier.name}</h3>

      {/* Amount */}
      <div className="text-center mb-4">
        <div className="text-4xl font-black text-white">
          {totalAmount.toLocaleString()}
          <span className="text-yellow-500 text-2xl ml-1">Ⓢ</span>
        </div>
        {tier.bonus > 0 && (
          <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-bold">
            <Sparkles className="w-3 h-3" />
            +{tier.bonus} GRÁTIS (+{bonusPercent}%)
          </div>
        )}
      </div>

      {/* Price */}
      <div className="text-center mb-6">
        <span className="text-2xl font-bold text-zinc-300">{tier.price.toFixed(2)} €</span>
      </div>

      {/* CTA Button */}
      <button 
        className={`w-full py-3 px-4 rounded-lg font-bold text-sm uppercase tracking-wide transition-all duration-300
          ${tier.recommended 
            ? "bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black hover:shadow-[0_0_20px_rgba(234,179,8,0.4)]" 
            : "bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 hover:border-zinc-600"
          }
        `}
      >
        {tier.recommended ? "Comprar Elite" : "Comprar"}
      </button>

      {/* Value per Euro */}
      <div className="mt-4 text-center text-xs text-zinc-500">
        {(totalAmount / tier.price).toFixed(1)} Ⓢ por €
      </div>
    </div>
  );
}
