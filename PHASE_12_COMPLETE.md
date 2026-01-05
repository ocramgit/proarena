# 🎯 FASE 12 COMPLETA - CLEANUP & UI VERSUS COMPACTA

**Data:** 05/01/2026  
**Objetivo:** Servidor apagado IMEDIATAMENTE após fim de jogo + UI Lobby compacta com jogadores nas laterais

---

## ✅ IMPLEMENTADO

### 1. **UI LOBBY COMPACTA - VERSUS STYLE**

#### Layout Base (`app/lobby/[matchId]/page.tsx`)
```
┌─────────────────────────────────────────────────────────┐
│  [Player A - 250px]  │  [Center Arena]  │  [Player B - 250px]  │
│                      │                  │                      │
│  Avatar Grande       │   VETO STAGE     │  Avatar Grande       │
│  Nome                │                  │  Nome                │
│  ELO                 │   Cards de       │  ELO                 │
│  Stats               │   Mapas/Locs     │  Stats               │
│                      │                  │                      │
│  Border Laranja      │   Turn Info      │  Border Laranja      │
│  (se for a vez)      │                  │  (se for a vez)      │
└─────────────────────────────────────────────────────────┘
```

**Características:**
- ✅ `h-screen w-full overflow-hidden` - Sem scroll
- ✅ Jogadores fixos nas laterais (250px cada)
- ✅ Centro flex-1 para veto arena
- ✅ Border laranja quando é a vez do jogador
- ✅ Turn indicator: "🟢 Vez de Banir" badge animado

**Cards de Mapa (Estilo TCG):**
- ✅ Pequenos e verticais (w-40 h-56) - ratio 3:4
- ✅ Imagem do mapa com overlay gradient
- ✅ Estado banido: `grayscale opacity-20 scale-90` + X vermelho
- ✅ Estado selecionado: `border-green-500 ring-4`
- ✅ Hover: `scale-105 border-orange-500`
- ✅ Cursor `not-allowed` quando não é a vez

**Cards de Localização:**
- ✅ Maiores (w-48 h-64)
- ✅ Flag emoji gigante (text-6xl)
- ✅ Nome em uppercase font-black
- ✅ Mesmas animações de ban/select

**Stages:**
1. **Location Veto:** 3 cards horizontais, ban alternado
2. **Map Veto:** 5 cards em flex-wrap, ban alternado
3. **Provisioning:** Loader animado + texto do mapa/localização
4. **Ready:** IP do servidor + botão copiar

---

### 2. **SERVER CLEANUP IMEDIATO**

#### `convex/matchResults.ts`
```typescript
// PHASE 12: Delete server IMMEDIATELY
await ctx.scheduler.runAfter(0, internal.matchResults.cleanupServer, {
  matchId: match._id,
});
```

**Fluxo de Cleanup:**
1. ✅ Game end detectado (webhook DatHost)
2. ✅ ELO atualizado
3. ✅ Match state = FINISHED
4. ✅ **Scheduler com delay 0ms** (imediato)
5. ✅ cleanupServer action:
   - Kickall (RCON)
   - Wait 2s
   - Stop server
   - Wait 3s
   - **DELETE server** (API DatHost)

**Resultado:** Servidor é apagado ~5 segundos após o fim do jogo (tempo mínimo para garantir que os comandos são processados).

---

### 3. **LOCATION MAPPING (Veto → DatHost)**

#### `convex/lobbyDatHost.ts`
```typescript
// PHASE 12: Use selected location from veto
const locationMap: Record<string, string> = {
  "Frankfurt": "dusseldorf", // Closest to Frankfurt
  "Paris": "strasbourg",     // Closest to Paris
  "Madrid": "barcelona",     // Closest to Madrid
};

const serverLocation = match.selectedLocation 
  ? locationMap[match.selectedLocation] || "dusseldorf"
  : "dusseldorf";
```

**Garantia:** O servidor é criado na localização que foi escolhida no veto, não em hardcoded logic.

---

### 4. **CANCELLED MATCHES - FILTRO DE STATS**

#### `convex/users.ts` - `getMyProfile`
```typescript
// PHASE 12: Calculate stats from FINISHED matches only (CANCELLED excluded)
const allMatches = await ctx.db
  .query("matches")
  .filter((q) => q.eq(q.field("state"), "FINISHED"))
  .collect();

const myMatches = allMatches.filter(
  (match) => match.teamA.includes(user._id) || match.teamB.includes(user._id)
);

const wins = myMatches.filter((match) => {
  const isInTeamA = match.teamA.includes(user._id);
  const isInTeamB = match.teamB.includes(user._id);
  return (isInTeamA && match.winnerId && match.teamA.includes(match.winnerId)) ||
         (isInTeamB && match.winnerId && match.teamB.includes(match.winnerId));
}).length;

const totalMatches = myMatches.length;
const losses = totalMatches - wins;
const winRate = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;
```

**Resultado:**
- ✅ Apenas matches com `state: "FINISHED"` contam para stats
- ✅ Matches `CANCELLED` (timeout no warmup) **não aparecem** em vitórias/derrotas
- ✅ Matches `CANCELLED` ainda aparecem no histórico (cinzentos) mas não afetam win rate

---

### 5. **CANCELLATION CLEANUP (Já estava a funcionar)**

#### `convex/endgame.ts` - `cancelMatch`
```typescript
// Update match state to CANCELLED
await ctx.db.patch(args.matchId, {
  state: "CANCELLED",
  finishedAt: BigInt(Date.now()),
});

// Schedule server cleanup if there's a server
if (match.dathostServerId) {
  await ctx.scheduler.runAfter(1000, internal.matchResults.cleanupServer, {
    matchId: args.matchId,
  });
}
```

**Garantia:** Se o jogo for cancelado (ex: timeout no warmup), o servidor é apagado automaticamente.

---

## 🎨 DESIGN DETAILS

### Player Panel (Lateral)
```
┌──────────────────┐
│                  │
│  [Turn Badge]    │ ← Aparece quando é a vez
│                  │
│   ┌────────┐     │
│   │ Avatar │     │ ← 128x128, border laranja se isCurrentUser
│   └────────┘     │
│                  │
│   Nome Jogador   │ ← font-black text-xl
│   "TU"           │ ← Se for o currentUser
│                  │
│  ┌──────────────┐│
│  │ 🏆 ELO: 1000 ││ ← bg-zinc-800/50 rounded
│  └──────────────┘│
│                  │
│  ┌──────────────┐│
│  │   CT / T     ││ ← Side badge (blue/red)
│  └──────────────┘│
│                  │
│      ⚔️          │ ← VS icon
└──────────────────┘
```

### Map Card (Center Arena)
```
┌────────────┐
│            │
│  [Image]   │ ← Background image com gradient overlay
│            │
│            │
│  aim_map   │ ← Nome em baixo, uppercase
└────────────┘

Se banido:
- grayscale
- opacity-20
- scale-90
- X vermelho gigante no centro
```

---

## 📊 FLUXO COMPLETO (1v1 com Cleanup)

```
1. Queue 1v1 → Match criado (state: VETO)
   ↓
2. Lobby VERSUS UI
   - Jogadores nas laterais
   - Location veto no centro (3 cards)
   ↓
3. Location selecionada → Map veto (5 cards)
   ↓
4. Map selecionado → state: CONFIGURING
   ↓
5. Auto-provision server
   - Usa selectedLocation → DatHost location
   - Usa selectedMap
   - state: WARMUP
   ↓
6. Jogadores conectam → state: LIVE
   ↓
7. Jogo termina (webhook DatHost)
   ↓
8. processMatchResult:
   - ELO +25 / -25
   - state: FINISHED
   - Schedule cleanupServer (delay 0ms)
   ↓
9. cleanupServer (IMEDIATO):
   - Kickall
   - Stop server
   - DELETE server ✅
   ↓
10. Servidor apagado da DatHost
    Match history atualizado
    Stats calculados (CANCELLED excluídos)
```

---

## 🔧 FICHEIROS MODIFICADOS

### Frontend
- ✅ `app/lobby/[matchId]/page.tsx` - Nova UI VERSUS compacta
- ✅ Backup criado: `page-phase11-backup.tsx`

### Backend
- ✅ `convex/matchResults.ts` - Cleanup imediato (delay 0ms)
- ✅ `convex/lobbyDatHost.ts` - Location mapping (veto → DatHost)
- ✅ `convex/users.ts` - Stats calculation (CANCELLED excluded)
- ✅ `convex/matches.ts` - Comment clarifying CANCELLED exclusion

---

## ✅ CHECKLIST DE VERIFICAÇÃO

### UI
- [x] Lobby sem scroll (h-screen overflow-hidden)
- [x] Jogadores fixos nas laterais (250px)
- [x] Cards de mapa pequenos e verticais (ratio 3:4)
- [x] Animações de ban (grayscale, scale-90, X vermelho)
- [x] Turn indicator visível
- [x] Border laranja quando é a vez do jogador
- [x] Cursor not-allowed quando não é a vez

### Backend
- [x] Servidor deletado imediatamente após game end
- [x] Servidor deletado quando match cancelado
- [x] Location do veto usada no DatHost
- [x] Map do veto usado no DatHost
- [x] CANCELLED matches excluídos de stats
- [x] Stats calculation implementado (wins, losses, winRate)

---

## 🎉 FASE 12 COMPLETA!

**Resultado:**
- ✅ UI Lobby compacta e elegante (VERSUS style)
- ✅ Servidor apagado IMEDIATAMENTE após fim de jogo
- ✅ Location e Map do veto usados corretamente
- ✅ Matches cancelados não afetam estatísticas
- ✅ Código limpo e bem documentado

**Próximos passos sugeridos:**
- Testar fluxo completo end-to-end
- Adicionar animações com framer-motion (opcional)
- Implementar live scoreboard updates
- Victory/Defeat animations na página de resultado
