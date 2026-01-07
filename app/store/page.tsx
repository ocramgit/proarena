"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Sidebar } from "@/components/layout/sidebar";
import { 
  Gift,
  Crown,
  Sparkles,
  Star,
  ShoppingBag,
  Clock,
  X,
  Check,
  Search
} from "lucide-react";

/**
 * FASE 50: LOJA DA PLATAFORMA
 * Marketplace para gift cards, premium, itens especiais
 * Com Sidebar lateral - Design limpo
 */

type Category = "all" | "giftcards" | "premium" | "bundles" | "special";

interface StoreItem {
  id: string;
  name: string;
  description: string;
  category: Category;
  price: number;
  originalPrice?: number;
  emoji: string;
  badge?: string;
  badgeColor?: string;
  popular?: boolean;
  limited?: boolean;
  stock?: number;
}

const STORE_ITEMS: StoreItem[] = [
  // Gift Cards
  { id: "gc-steam-20", name: "Steam Gift Card 20€", description: "Código enviado por email", category: "giftcards", price: 400, emoji: "🎮" },
  { id: "gc-steam-50", name: "Steam Gift Card 50€", description: "Código enviado por email", category: "giftcards", price: 950, originalPrice: 1000, emoji: "🎮", badge: "-5%", badgeColor: "bg-green-500" },
  { id: "gc-psn-25", name: "PlayStation Store 25€", description: "Código enviado por email", category: "giftcards", price: 500, emoji: "🎯" },
  { id: "gc-xbox-25", name: "Xbox Gift Card 25€", description: "Código enviado por email", category: "giftcards", price: 500, emoji: "🟢" },
  // Premium
  { id: "premium-month", name: "Premium 1 Mês", description: "Prioridade na queue, badge especial, stats avançadas", category: "premium", price: 500, emoji: "👑", badge: "POPULAR", badgeColor: "bg-orange-500", popular: true },
  { id: "premium-year", name: "Premium Anual", description: "12 meses + 500Ⓢ bónus. Poupa 40%!", category: "premium", price: 3600, originalPrice: 6000, emoji: "💎", badge: "-40%", badgeColor: "bg-red-500" },
  { id: "premium-lifetime", name: "Premium Vitalício", description: "Acesso Premium para sempre", category: "premium", price: 10000, emoji: "🏆", badge: "EXCLUSIVO", badgeColor: "bg-purple-500", limited: true, stock: 50 },
  // Bundles
  { id: "bundle-starter", name: "Starter Bundle", description: "500Ⓢ + 1 mês Premium + Badge", category: "bundles", price: 800, originalPrice: 1000, emoji: "📦", badge: "-20%", badgeColor: "bg-green-500" },
  { id: "bundle-pro", name: "Pro Gamer Bundle", description: "2000Ⓢ + 3 meses Premium + Steam 20€", category: "bundles", price: 2500, originalPrice: 3200, emoji: "🎁", badge: "TOP", badgeColor: "bg-yellow-500", popular: true },
  // Special
  { id: "special-nickname", name: "Mudança de Nickname", description: "Altera o teu nickname uma vez", category: "special", price: 200, emoji: "✏️" },
  { id: "special-badge-og", name: "Badge OG Player", description: "Badge exclusiva limitada", category: "special", price: 1000, emoji: "🏅", badge: "LIMITADO", badgeColor: "bg-amber-500", limited: true, stock: 100 },
  { id: "special-banner", name: "Banner de Perfil Custom", description: "Personaliza o teu perfil", category: "special", price: 300, emoji: "🖼️" },
];

const CATEGORIES = [
  { id: "all", name: "Tudo", icon: Sparkles },
  { id: "giftcards", name: "Gift Cards", icon: Gift },
  { id: "premium", name: "Premium", icon: Crown },
  { id: "bundles", name: "Bundles", icon: ShoppingBag },
  { id: "special", name: "Especiais", icon: Star },
];

export default function StorePage() {
  const router = useRouter();
  const balance = useQuery(api.economy.getBalance);
  const [selectedCategory, setSelectedCategory] = useState<Category>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);

  const filteredItems = STORE_ITEMS.filter((item) => {
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handlePurchase = (item: StoreItem) => {
    setSelectedItem(item);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedItem(null);
  };

  const canAfford = (price: number): boolean => {
    return !!(balance && balance.balance >= price);
  };

  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden">
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 ml-64 pt-14 overflow-y-auto">
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-black text-white flex items-center gap-3">
                <ShoppingBag className="w-8 h-8 text-orange-500" />
                Loja
              </h1>
              <p className="text-zinc-400 mt-1">Gift Cards, Premium & Mais</p>
            </div>
            {balance && (
              <div className="flex items-center gap-4">
                <div className="px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800">
                  <span className="text-zinc-400 text-sm mr-2">Saldo:</span>
                  <span className="text-yellow-500 font-bold">{balance.balance.toFixed(0)} Ⓢ</span>
                </div>
                <button
                  onClick={() => router.push("/shop")}
                  className="px-4 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm transition-colors"
                >
                  + Recarregar
                </button>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id as Category)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedCategory === cat.id
                        ? "bg-orange-500 text-white"
                        : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {cat.name}
                  </button>
                );
              })}
            </div>
            <div className="relative flex-1 max-w-xs ml-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Pesquisar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* Products Grid */}
          {filteredItems.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-4xl mb-4">🔍</div>
              <p className="text-zinc-500">Nenhum produto encontrado</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handlePurchase(item)}
                  className={`relative p-4 rounded-xl bg-zinc-900 border cursor-pointer transition-all hover:scale-[1.02] hover:-translate-y-1 ${
                    item.popular ? "border-orange-500/50" : "border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  {item.badge && (
                    <div className={`absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-bold text-white ${item.badgeColor}`}>
                      {item.badge}
                    </div>
                  )}
                  {item.limited && item.stock && (
                    <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 text-xs text-zinc-400">
                      <Clock className="w-3 h-3" />
                      {item.stock}
                    </div>
                  )}
                  <div className="text-4xl mb-3">{item.emoji}</div>
                  <h3 className="font-bold text-white mb-1">{item.name}</h3>
                  <p className="text-xs text-zinc-500 mb-3 line-clamp-1">{item.description}</p>
                  <div className="flex items-center justify-between">
                    <div>
                      {item.originalPrice && (
                        <span className="text-zinc-600 line-through text-xs mr-2">{item.originalPrice}Ⓢ</span>
                      )}
                      <span className="text-lg font-bold text-yellow-500">{item.price} <span className="text-sm">Ⓢ</span></span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${canAfford(item.price) ? "bg-green-500/20 text-green-400" : "bg-zinc-800 text-zinc-500"}`}>
                      {canAfford(item.price) ? "Comprar" : "Sem saldo"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Purchase Modal */}
      {showModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <button onClick={closeModal} className="absolute top-4 right-4 text-zinc-500 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <div className="text-center">
              <div className="text-5xl mb-4">{selectedItem.emoji}</div>
              <h3 className="text-xl font-bold text-white mb-1">{selectedItem.name}</h3>
              <p className="text-zinc-400 text-sm mb-4">{selectedItem.description}</p>
              <div className="p-3 rounded-lg bg-zinc-800 mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-zinc-400">Preço:</span>
                  <span className="text-yellow-500 font-bold">{selectedItem.price} Ⓢ</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Teu saldo:</span>
                  <span className={canAfford(selectedItem.price) ? "text-green-400" : "text-red-400"}>
                    {balance?.balance.toFixed(0) || 0} Ⓢ
                  </span>
                </div>
              </div>
              {canAfford(selectedItem.price) ? (
                <button onClick={closeModal} className="w-full py-3 rounded-lg bg-green-500 hover:bg-green-400 text-white font-bold flex items-center justify-center gap-2">
                  <Check className="w-5 h-5" /> Confirmar
                </button>
              ) : (
                <button onClick={() => { closeModal(); router.push("/shop"); }} className="w-full py-3 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black font-bold">
                  Recarregar Saldo
                </button>
              )}
              <p className="text-xs text-zinc-500 mt-3">Integração brevemente disponível</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
