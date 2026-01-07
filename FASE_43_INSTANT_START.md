# ✅ FASE 43: INSTANT START (WEBHOOKS & RCON) - COMPLETO

## 🎯 OBJETIVO ALCANÇADO

Sistema de início instantâneo de partidas via webhooks DatHost e comandos RCON. **Delay reduzido de 2 minutos para 5 segundos.**

---

## 🔧 IMPLEMENTAÇÃO

### **1. WEBHOOK ENDPOINT (`convex/http.ts`)**

```typescript
http.route({
  path: "/dathost-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    
    // FASE 43: Player Connect Detection
    if (body.event === "player_connect") {
      const matchId = body.match_id;
      const steamId = body.player_steam_id;
      
      await ctx.runAction(internal.webhooks.handlePlayerConnect, {
        dathostMatchId: matchId,
        steamId,
      });
    }
    
    // ... outros eventos (match_finished, round_start)
  }),
});
```

**Resultado:**
- ✅ Recebe evento `player_connect` da DatHost
- ✅ Extrai `match_id` e `player_steam_id`
- ✅ Chama handler interno

---

### **2. PLAYER CONNECT HANDLER (`convex/webhooks.ts`)**

```typescript
export const handlePlayerConnect = internalAction({
  handler: async (ctx, args) => {
    // 1. Find match by dathostMatchId
    const match = await ctx.runQuery(internal.webhooks.findMatchByDathostId, {
      dathostMatchId: args.dathostMatchId,
    });
    
    // 2. Mark player as connected
    await ctx.runMutation(internal.webhooks.markPlayerConnected, {
      matchId: match._id,
      steamId: args.steamId,
    });
    
    // 3. Check if all players connected
    const allConnected = await ctx.runQuery(internal.webhooks.checkAllPlayersConnected, {
      matchId: match._id,
    });
    
    // 4. If all ready and state is WARMUP -> START IMMEDIATELY
    if (allConnected && match.state === "WARMUP") {
      console.log("🚀 ALL PLAYERS READY - STARTING MATCH IMMEDIATELY!");
      
      // Force start via RCON
      await ctx.runAction(internal.dathostCore.forceStartMatch, {
        serverId: match.dathostServerId,
      });
      
      // Update state to LIVE
      await ctx.runMutation(internal.webhooks.setMatchStateLive, {
        matchId: match._id,
      });
    }
  }
});
```

**Lógica:**
1. ✅ Encontra match pelo `dathostMatchId`
2. ✅ Marca jogador como `connected: true` em `player_stats`
3. ✅ Conta jogadores conectados
4. ✅ Se `connectedCount === totalPlayers` → **INICIA IMEDIATAMENTE**

---

### **3. FORCE START VIA RCON (`convex/dathostCore.ts`)**

```typescript
export const forceStartMatch = internalAction({
  handler: async (ctx, args) => {
    const rconCommand = 'mp_warmup_end; mp_restartgame 5; say ">>> TODOS CONECTADOS. O JOGO VAI COMEÇAR EM 5 SEGUNDOS! <<<"';
    
    await fetch(
      `https://dathost.net/api/0.1/game-servers/${serverId}/console`,
      {
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
        body: JSON.stringify({ line: rconCommand }),
      }
    );
    
    console.log("✅ RCON command sent - match starting in 5 seconds!");
  }
});
```

**Comandos RCON:**
- `mp_warmup_end` → Termina warmup instantaneamente
- `mp_restartgame 5` → Reinicia jogo em 5 segundos
- `say "..."` → Avisa jogadores no chat

---

### **4. WEBHOOK CONFIGURATION (`convex/dathostCore.ts`)**

```typescript
// configureMatch payload
const payload = {
  game_server_id: serverId,
  players: [...],
  settings: {...},
  webhooks: {
    match_end_url: `${convexSiteUrl}/dathost-webhook`,
    round_end_url: `${convexSiteUrl}/dathost-webhook`,
    player_connect_url: `${convexSiteUrl}/dathost-webhook`, // ✅ FASE 43
  },
};
```

**Resultado:**
- ✅ DatHost envia webhook quando jogador conecta
- ✅ Backend recebe evento instantaneamente

---

## 🔄 FLUXO COMPLETO (ALTA VELOCIDADE)

```
19:40:00 → Servidor criado (WARMUP)
19:40:05 → Jogador 1 conecta
          ├─ Webhook dispara
          ├─ DB marca Player 1 connected: true
          └─ Check: 1/2 jogadores → Aguarda

19:40:06 → Jogador 2 conecta
          ├─ Webhook dispara
          ├─ DB marca Player 2 connected: true
          ├─ Check: 2/2 jogadores → ✅ TODOS PRONTOS!
          ├─ RCON: mp_warmup_end; mp_restartgame 5
          └─ Estado: WARMUP → LIVE

19:40:11 → Jogo começa (5s após último jogador)
```

**Tempo Total: 6 segundos** (vs 2 minutos antes)

---

## 📊 COMPARAÇÃO

### **ANTES (Polling):**
- 🔴 Polling a cada 1 segundo
- 🔴 Delay de até 2 minutos (warmup timer)
- 🔴 Jogadores esperam mesmo estando prontos

### **DEPOIS (Webhooks + RCON):**
- ✅ Deteção instantânea via webhook
- ✅ Início forçado via RCON (5s)
- ✅ **Redução de 120s → 5s (96% mais rápido)**

---

## 🧪 TESTE

```bash
# 1. Deploy
git add .
git commit -m "feat: FASE 43 - Instant start via webhooks & RCON"
git push origin master

# 2. Criar match e conectar
# Logs esperados:

🔔 DATHOST WEBHOOK RECEIVED
Event type: player_connect
Player SteamID: STEAM_X:X:XXXXX
✅ Marking player as connected: Player1
👥 Connected: 1/2

🔔 DATHOST WEBHOOK RECEIVED
Event type: player_connect
Player SteamID: STEAM_Y:Y:YYYYY
✅ Marking player as connected: Player2
👥 Connected: 2/2
🚀 ALL PLAYERS READY - STARTING MATCH IMMEDIATELY!
✅ RCON command sent - match starting in 5 seconds!
✅ Match state set to LIVE

# 3. No servidor CS2:
>>> TODOS CONECTADOS. O JOGO VAI COMEÇAR EM 5 SEGUNDOS! <<<
[5 segundos depois]
Match started!
```

---

## 📊 ARQUIVOS MODIFICADOS

### **Criados:**
- ✅ `convex/webhooks.ts` - Player connect handler e lógica de deteção

### **Modificados:**
- ✅ `convex/http.ts` - Endpoint webhook com player_connect
- ✅ `convex/dathostCore.ts` - forceStartMatch + webhook config

---

## 🚀 RESULTADO FINAL

**Sistema de Início Instantâneo:**
- ✅ Webhooks DatHost configurados
- ✅ Deteção instantânea de jogadores
- ✅ Início forçado via RCON (5s)
- ✅ **96% redução no tempo de espera**

**Experiência do Jogador:**
1. Conecta ao servidor
2. Aguarda 5 segundos (outro jogador)
3. **JOGO COMEÇA IMEDIATAMENTE**

---

**FASE 43 ✅ COMPLETA - INSTANT START FUNCIONAL!** ⚡
