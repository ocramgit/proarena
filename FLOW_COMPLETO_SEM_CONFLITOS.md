# FLOW COMPLETO: CRIAÇÃO DE SERVIDOR → DETEÇÃO → LIVE

## 🎯 OBJETIVO
Garantir que:
1. Servidor é criado UMA vez (sem duplicados)
2. Jogadores são detetados IMEDIATAMENTE
3. Comandos sm_team são enviados UMA vez por jogador
4. Não há conflitos entre CS2 logs e DatHost API
5. Countdown inicia assim que 2/2 conectados
6. Transição para LIVE é automática

---

## 📋 FLOW PASSO A PASSO

### **FASE 1: VETO → CONFIGURING**
```
Estado: VETO
Ação: Último mapa banido
Resultado: state = "CONFIGURING", selectedMap definido
```

**Ficheiro:** `convex/lobby.ts`
- Quando resta 1 mapa → `state: "CONFIGURING"`

---

### **FASE 2: PROVISIONING (Cliente)**
```
Estado: CONFIGURING
Trigger: useEffect no cliente detecta state = "CONFIGURING"
Ação: Chama provisionServer action
```

**Ficheiro:** `app/lobby/[matchId]/page.tsx`
```typescript
useEffect(() => {
  if (
    match?.state === "CONFIGURING" && 
    !match.serverIp && 
    !match.provisioningStarted && 
    !isProvisioning
  ) {
    setIsProvisioning(true);
    provisionServer({ matchId })
      .then(() => toast.success("Servidor provisionado!"))
      .catch((error) => toast.error("Erro ao provisionar servidor"))
      .finally(() => setIsProvisioning(false));
  }
}, [match?.state, match?.serverIp, match?.provisioningStarted, matchId, provisionServer, isProvisioning]);
```

**PROTEÇÃO:** 
- ✅ `!match.serverIp` - não provisiona se já tem IP
- ✅ `!match.provisioningStarted` - não provisiona se já iniciou
- ✅ `!isProvisioning` - não provisiona se já está a provisionar (estado local)

---

### **FASE 3: PROVISIONING (Servidor)**
```
Ação: provisionDatHostServer action
Resultado: Servidor DatHost criado, state = "WARMUP"
```

**Ficheiro:** `convex/lobbyDatHost.ts`
```typescript
export const provisionDatHostServer = action({
  handler: async (ctx, args) => {
    // 1. Verificar estado
    if (match.state !== "CONFIGURING") throw new Error("Not in CONFIGURING state");
    if (match.serverIp || match.provisioningStarted) throw new Error("Already provisioning");
    
    // 2. Set lock
    await ctx.runMutation(internal.lobbyDatHost.setProvisioningLock, { matchId });
    
    // 3. Criar servidor DatHost
    const result = await ctx.runAction(internal.dathost.createDatHostMatch, { ... });
    
    // 4. Atualizar match com serverIp, dathostServerId, dathostMatchId
    await ctx.runMutation(internal.lobbyDatHost.updateMatchWithServer, { ... });
    
    // 5. Iniciar warmup
    await ctx.runMutation(internal.matchWarmup.scheduleWarmupCheck, { matchId });
  }
});
```

**PROTEÇÃO:**
- ✅ Verifica `state === "CONFIGURING"`
- ✅ Verifica `!serverIp && !provisioningStarted`
- ✅ Set `provisioningStarted: true` ANTES de criar servidor

---

### **FASE 4: CONFIGURAÇÃO DO SERVIDOR**
```
Ação: Criar servidor DatHost + enviar comandos base
Resultado: Servidor pronto, warmup infinito
```

**Ficheiro:** `convex/dathost.ts`
```typescript
// 1. Criar servidor DatHost
const gameServer = await fetch("https://dathost.net/api/0.1/game-servers", {
  method: "POST",
  body: JSON.stringify({
    game: "cs2",
    location: selectedLocation,
    csgo_settings: {
      mapgroup_start_map: selectedMap,
      // ...
    }
  })
});

// 2. Enviar comandos base (SEM sm_team aqui!)
const commands = [
  "mp_warmuptime 9999", // Warmup infinito
  "mp_maxrounds 30",
  "mp_autoteambalance 0",
  "mp_limitteams 0",
  "mp_restartgame 1",
];

for (const command of commands) {
  await fetch(`https://dathost.net/api/0.1/game-servers/${gameServerId}/console`, {
    method: "POST",
    body: JSON.stringify({ line: command }),
  });
}

// 3. Configurar CS2 log endpoints
await fetch(`https://dathost.net/api/0.1/game-servers/${gameServerId}/console`, {
  method: "POST",
  body: JSON.stringify({
    line: `logaddress_add_http "${convexSiteUrl}/cs2-logs"`,
  }),
});
```

**IMPORTANTE:** 
- ❌ NÃO envia comandos `sm_team` aqui
- ✅ Apenas configuração base do servidor
- ✅ Configura webhook CS2 logs

---

### **FASE 5: WARMUP + MONITORING**
```
Estado: WARMUP
Ação: Inicia monitoring a cada 500ms
Resultado: Aguarda jogadores conectarem
```

**Ficheiro:** `convex/matchWarmup.ts`
```typescript
export const scheduleWarmupCheck = internalMutation({
  handler: async (ctx, args) => {
    // 1. Atualizar estado
    await ctx.db.patch(args.matchId, {
      state: "WARMUP",
      warmupEndsAt: BigInt(Date.now() + 5 * 60 * 1000),
    });
    
    // 2. Pre-criar player_stats
    for (const playerId of allPlayerIds) {
      await ctx.db.insert("player_stats", {
        matchId: args.matchId,
        userId: playerId,
        kills: 0,
        deaths: 0,
        assists: 0,
        mvps: 0,
        connected: false,
      });
    }
    
    // 3. Iniciar monitoring (500ms)
    await ctx.scheduler.runAfter(500, internal.matchMonitor.startMatchMonitoring, {
      matchId: args.matchId,
    });
  }
});
```

---

### **FASE 6: DETEÇÃO DE JOGADORES (2 MÉTODOS)**

#### **MÉTODO 1: CS2 Logs (Webhook)**
```
Trigger: Jogador conecta → CS2 envia log
Ação: handlePlayerConnect marca connected: true
```

**Ficheiro:** `convex/http.ts` + `convex/cs2LogHandlers.ts`
```typescript
// http.ts - recebe log
const connectMatch = line.match(/"(.+?)<(\d+)><(STEAM_\d+:\d+:\d+)>"/);
if (connectMatch && line.includes("connected")) {
  await ctx.runMutation(internal.cs2LogHandlers.handlePlayerConnect, {
    steamId,
    playerName,
  });
}

// cs2LogHandlers.ts - processa conexão
export const handlePlayerConnect = internalMutation({
  handler: async (ctx, args) => {
    // 1. Encontrar user pelo SteamID
    const user = await ctx.db.query("users").filter(...).first();
    
    // 2. Marcar como conectado
    await ctx.db.patch(existingStat._id, { connected: true });
    
    // 3. Enviar sm_team (APENAS se via CS2 logs)
    const isTeamA = match.teamA.includes(user._id);
    if (isTeamA) {
      await ctx.scheduler.runAfter(0, internal.cs2LogHandlers.assignPlayerTeam, {
        steamId: normalizedSteamId,
        team: 3, // CT
      });
    } else {
      await ctx.scheduler.runAfter(0, internal.cs2LogHandlers.assignPlayerTeam, {
        steamId: normalizedSteamId,
        team: 2, // T
      });
    }
    
    // 4. Verificar se todos conectaram
    await ctx.scheduler.runAfter(0, internal.lobbyReady.checkLobbyReady, {
      matchId: match._id,
    });
  }
});
```

#### **MÉTODO 2: DatHost API (Fallback - A CADA 500ms)**
```
Trigger: Monitoring chama DatHost API
Ação: Se 2 jogadores online → marca TODOS como conectados + envia sm_team
```

**Ficheiro:** `convex/matchMonitor.ts` + `convex/dathostStatus.ts`
```typescript
// matchMonitor.ts - chama API a cada 500ms
export const checkMatchStatus = internalAction({
  handler: async (ctx, args) => {
    if (match.dathostMatchId) {
      const result = await ctx.runAction(internal.dathostStatus.checkServerStatus, {
        dathostMatchId: match.dathostMatchId,
        matchId: args.matchId,
      });
    }
    
    // Continua monitoring
    await ctx.scheduler.runAfter(500, internal.matchMonitor.checkMatchStatus, {
      matchId: args.matchId,
    });
  }
});

// dathostStatus.ts - verifica jogadores
export const updatePlayerCount = internalMutation({
  handler: async (ctx, args) => {
    if (args.playersOnline >= expectedPlayers) {
      // 1. Marcar TODOS como conectados
      for (const stat of stats) {
        await ctx.db.patch(stat._id, { connected: true });
      }
      
      // 2. Enviar sm_team para TODOS
      for (const player of teamAPlayers) {
        await ctx.scheduler.runAfter(0, internal.cs2LogHandlers.assignPlayerTeam, {
          steamId: player.steamId,
          team: 3, // CT
        });
      }
      
      for (const player of teamBPlayers) {
        await ctx.scheduler.runAfter(0, internal.cs2LogHandlers.assignPlayerTeam, {
          steamId: player.steamId,
          team: 2, // T
        });
      }
      
      // 3. Verificar se lobby está pronto
      await ctx.scheduler.runAfter(0, internal.lobbyReady.checkLobbyReady, {
        matchId: args.matchId,
      });
    }
  }
});
```

---

### **FASE 7: COUNTDOWN (2/2 CONECTADOS)**
```
Trigger: checkLobbyReady deteta 2/2 conectados
Ação: Inicia countdown de 5 segundos
```

**Ficheiro:** `convex/lobbyReady.ts`
```typescript
export const checkLobbyReady = internalMutation({
  handler: async (ctx, args) => {
    const connectedPlayers = stats.filter(s => s.connected);
    
    if (connectedPlayers.length === expectedPlayers) {
      console.log("✅ ALL PLAYERS CONNECTED! Initiating countdown...");
      
      await ctx.scheduler.runAfter(0, internal.lobbyReady.startCountdown, {
        matchId: args.matchId,
        dathostServerId: match.dathostServerId,
      });
    }
  }
});

export const startCountdown = internalMutation({
  handler: async (ctx, args) => {
    // 1. Enviar mp_warmuptime 5
    await ctx.scheduler.runAfter(0, internal.cs2Commands.sendWarmupCommand, {
      dathostServerId: args.dathostServerId,
    });
    
    // 2. Após 5s → LIVE
    await ctx.scheduler.runAfter(5000, internal.lobbyReady.transitionToLive, {
      matchId: args.matchId,
    });
  }
});
```

---

### **FASE 8: TRANSIÇÃO PARA LIVE**
```
Ação: Atualizar state para "LIVE"
Resultado: Jogo começa, redirect automático
```

**Ficheiro:** `convex/lobbyReady.ts`
```typescript
export const transitionToLive = internalMutation({
  handler: async (ctx, args) => {
    await ctx.db.patch(args.matchId, {
      state: "LIVE",
      currentRound: 0,
      scoreTeamA: 0,
      scoreTeamB: 0,
    });
  }
});
```

**Ficheiro:** `app/lobby/[matchId]/page.tsx`
```typescript
// Auto-redirect quando state = LIVE
useEffect(() => {
  if (match?.state === "LIVE") {
    router.push(`/match/${matchId}/live`);
  }
}, [match?.state, matchId, router]);
```

---

## ⚠️ PROTEÇÕES CONTRA CONFLITOS

### **1. Provisioning Duplicado**
- ✅ `provisioningStarted` flag
- ✅ `serverIp` check
- ✅ Estado local `isProvisioning`

### **2. sm_team Duplicado**
- ⚠️ **POTENCIAL CONFLITO:** CS2 logs E DatHost API podem enviar sm_team
- **SOLUÇÃO:** Ambos enviam, mas comando é idempotente (não faz mal enviar 2x)

### **3. checkLobbyReady Múltiplo**
- ⚠️ **POTENCIAL CONFLITO:** CS2 logs E DatHost API chamam checkLobbyReady
- **SOLUÇÃO:** checkLobbyReady verifica se já iniciou countdown (via state check)

### **4. Monitoring Infinito**
- ✅ Para quando `state !== "WARMUP"`

---

## 🔧 MELHORIAS NECESSÁRIAS

### **PROBLEMA 1: sm_team pode ser enviado 2x**
**Causa:** CS2 logs + DatHost API ambos enviam
**Solução:** Adicionar flag `teamAssigned` em player_stats

### **PROBLEMA 2: checkLobbyReady pode ser chamado múltiplas vezes**
**Causa:** CS2 logs + DatHost API ambos chamam
**Solução:** Verificar se countdown já iniciou antes de iniciar novo

---

## ✅ FLOW FINAL SEM CONFLITOS

```
VETO → CONFIGURING
  ↓
provisionServer (cliente) [PROTEÇÃO: flags]
  ↓
createDatHostMatch [PROTEÇÃO: state check]
  ↓
WARMUP + monitoring (500ms)
  ↓
┌─────────────────────────────────┐
│ DETEÇÃO PARALELA (2 métodos)   │
├─────────────────────────────────┤
│ CS2 Logs → handlePlayerConnect  │
│   ├─> marca connected           │
│   ├─> envia sm_team             │
│   └─> chama checkLobbyReady     │
│                                 │
│ DatHost API (500ms) → fallback  │
│   ├─> marca TODOS connected     │
│   ├─> envia sm_team TODOS       │
│   └─> chama checkLobbyReady     │
└─────────────────────────────────┘
  ↓
checkLobbyReady (2/2 conectados)
  ↓
startCountdown (5s)
  ↓
LIVE + redirect automático
```
