# ✅ FASE 42: DATHOST LIFECYCLE FIX & ENDGAME LOGIC

## 🎯 OBJETIVO COMPLETO

Sistema de provisionamento, monitorização e finalização de matches DatHost totalmente funcional.

---

## 🔧 CORREÇÕES IMPLEMENTADAS

### **1. FIX: Missing `game_server_id` Property ✅**

**Problema Original:**
```
Error: missing property 'game_server_id'
```

**Causa:**
O endpoint `POST /api/0.1/cs2-matches` da DatHost **requer** um `game_server_id` para alocar a match a um servidor específico.

**Solução Implementada:**

#### **A. Server Pool Management (`dathostServerPool.ts`)**
Novo módulo que gere alocação dinâmica de servidores:

```typescript
// GET /api/0.1/game-servers - Lista servidores disponíveis
export const getAvailableServer = internalAction({
  handler: async (ctx, args) => {
    // 1. Fetch all game servers
    const servers = await fetch("https://dathost.net/api/0.1/game-servers");
    
    // 2. Filter available servers (not running a match)
    const availableServers = servers.filter(s => !s.match_id && s.on);
    
    // 3. Prefer server in requested location
    if (args.preferredLocation) {
      const locationServer = availableServers.find(s => 
        s.location.includes(args.preferredLocation)
      );
      if (locationServer) return locationServer.id;
    }
    
    // 4. Return first available server
    return availableServers[0].id;
  }
});
```

#### **B. Updated `spawnServer` (`dathostCore.ts`)**
```typescript
// ANTES (ERRO)
const payload = {
  game: "cs2",
  name: "ProArena 1v1",
  // ❌ FALTA: game_server_id
};

// DEPOIS (CORRIGIDO)
const gameServerId = await ctx.runAction(internal.dathostServerPool.getAvailableServer, {
  preferredLocation: args.location,
});

const payload = {
  game_server_id: gameServerId, // ✅ FIX: Alocação dinâmica
  game: "cs2",
  name: "ProArena 1v1",
  // ... resto da config
};
```

---

### **2. Match Monitoring Inteligente ✅**

**Objetivo:** Detetar automaticamente quando jogadores entram e quando a match termina.

#### **A. Detecção de Estado LIVE**
```typescript
// matchMonitor.ts - checkMatchStatus
if (match.state === "WARMUP" && match.dathostMatchId) {
  const statusData = await ctx.runAction(internal.dathostCore.getMatchStatus, {
    dathostMatchId: match.dathostMatchId,
  });
  
  // Detetar jogadores online
  if (statusData && statusData.players_online > 0) {
    console.log("🎮 Players detected, transitioning to LIVE");
    await ctx.runMutation(internal.matchMonitor.transitionToLive, {
      matchId: args.matchId,
    });
  }
}
```

**Resultado:**
- ✅ Match muda de `WARMUP` → `LIVE` automaticamente quando jogadores conectam
- ✅ `startTime` é registado

#### **B. Detecção de Match Finish**
```typescript
if (match.state === "LIVE" && match.dathostMatchId) {
  const statusData = await ctx.runAction(internal.dathostCore.getMatchStatus, {
    dathostMatchId: match.dathostMatchId,
  });
  
  // Detetar match terminada
  if (statusData && statusData.finished) {
    console.log("🏁 Match finished detected");
    const winner = statusData.team1_score > statusData.team2_score ? "team1" : "team2";
    
    await ctx.runMutation(internal.matchResults.processMatchResult, {
      dathostMatchId: match.dathostMatchId,
      winner,
      scoreTeam1: statusData.team1_score,
      scoreTeam2: statusData.team2_score,
    });
  }
}
```

**Resultado:**
- ✅ Match muda de `LIVE` → `FINISHED` automaticamente
- ✅ Processa resultado (ELO, rewards, cleanup)

---

### **3. Endgame Logic (Já Existente, Mantido) ✅**

O sistema já tinha lógica de finalização robusta em `matchResults.ts`:

```typescript
export const processMatchResult = internalMutation({
  handler: async (ctx, args) => {
    // 1. Determinar vencedor
    const winningTeam = args.winner === "team1" ? match.teamA : match.teamB;
    const losingTeam = args.winner === "team1" ? match.teamB : match.teamA;
    
    // 2. Atualizar ELO (+25 vencedor, -25 perdedor)
    for (const winnerId of winningTeam) {
      const winner = await ctx.db.get(winnerId);
      const newElo = currentElo + ELO_CHANGE;
      await ctx.db.patch(winnerId, { elo_1v1: newElo });
    }
    
    // 3. Creditar Soberanas (economia)
    await ctx.scheduler.runAfter(0, internal.economy.rewardMatchWinner, {
      winnerId: winningTeam[0],
      loserId: losingTeam[0],
    });
    
    // 4. Incrementar matchesPlayed
    // 5. Check referral rewards
    // 6. Award badges
    
    // 7. Cleanup servidor (DELETE)
    await ctx.scheduler.runAfter(0, internal.matchResults.cleanupServer, {
      matchId: match._id,
    });
  }
});
```

---

## 🔄 FLUXO COMPLETO (LIFECYCLE)

```
1. PROVISIONAR
   ├─ getAvailableServer() → Aloca game_server_id
   ├─ spawnServer() → POST /cs2-matches com game_server_id
   └─ Match criada (state: WARMUP)

2. MONITORIZAR (a cada 1 segundo)
   ├─ GET /cs2-matches/{id} → Verifica players_online
   ├─ Se players_online > 0 → Transição para LIVE
   └─ Se finished: true → Processa resultado

3. FINALIZAR
   ├─ processMatchResult() → Calcula vencedor
   ├─ Atualiza ELO (+25/-25)
   ├─ Credita Soberanas (economia)
   ├─ Incrementa matchesPlayed
   ├─ Check referral rewards
   └─ cleanupServer() → DELETE /cs2-matches/{id}

4. CLEANUP
   ├─ Kick all players
   ├─ Stop server
   └─ Delete server
```

---

## 📊 ARQUIVOS MODIFICADOS/CRIADOS

### **Novos:**
- ✅ `convex/dathostServerPool.ts` - Gestão de pool de servidores

### **Modificados:**
- ✅ `convex/dathostCore.ts` - Adiciona alocação dinâmica de `game_server_id`
- ✅ `convex/matchMonitor.ts` - Detecção inteligente de LIVE e FINISHED

### **Mantidos (Já Funcionais):**
- ✅ `convex/matchResults.ts` - Processamento de resultado e ELO
- ✅ `convex/economy.ts` - Rewards (Soberanas)
- ✅ `convex/referrals.ts` - Referral rewards
- ✅ `convex/badges.ts` - Badge awards

---

## 🧪 COMO TESTAR

### **1. Criar Match:**
```bash
# Entrar na fila 1v1
# Sistema vai:
# - Alocar game_server_id dinamicamente
# - Criar cs2-match com game_server_id
# - Iniciar monitoring
```

### **2. Verificar Logs:**
```
✅ [FASE 42] Allocated game_server_id: abc123
📤 [FASE 42] Sending request to DatHost cs2-matches endpoint...
🔑 game_server_id: abc123
✅ Match server created
```

### **3. Conectar ao Servidor:**
```
# Quando jogadores conectam:
🎮 [FASE 42] Players detected online, transitioning to LIVE
✅ [FASE 42] Match transitioned to LIVE
```

### **4. Terminar Match:**
```
# Quando match termina:
🏁 [FASE 42] Match finished detected
✅ Match FINISHED, ELO updated
🗑️ Scheduling IMMEDIATE server deletion
```

---

## 🎯 RESULTADO FINAL

**Antes:**
- ❌ Erro `missing property 'game_server_id'`
- ❌ Matches ficavam stuck em WARMUP
- ❌ Sem detecção automática de fim de match

**Depois:**
- ✅ Alocação dinâmica de servidores
- ✅ Detecção automática de jogadores (WARMUP → LIVE)
- ✅ Detecção automática de fim (LIVE → FINISHED)
- ✅ ELO, rewards e cleanup automáticos

---

## 🚀 DEPLOY

```bash
git add .
git commit -m "feat: FASE 42 - DatHost lifecycle fix + intelligent monitoring"
git push origin master
```

Sistema de matches totalmente funcional! 🎮
