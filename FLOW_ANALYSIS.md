# FLOW COMPLETO: CONFIRMING → LIVE

## 1️⃣ CONFIRMING (20 segundos)
**Ficheiro:** `convex/matchConfirmation.ts`
- Ambos jogadores têm 20s para aceitar
- Se ambos aceitam → `state: "VETO"`
- Se alguém recusa → `state: "CANCELLED"` + cooldown

## 2️⃣ VETO - Localização
**Ficheiro:** `convex/lobbyLocation.ts`
- Estado: `VETO`
- Jogadores banem localizações alternadamente
- Quando resta 1 → `selectedLocation` é definido
- **NÃO muda state**, continua em `VETO`

## 3️⃣ VETO - Mapa
**Ficheiro:** `convex/lobby.ts`
- Estado: ainda `VETO`
- Jogadores banem mapas alternadamente
- Quando resta 1 → `selectedMap` é definido + `state: "CONFIGURING"`

## 4️⃣ CONFIGURING (provisioning)
**Ficheiro:** `convex/lobbyDatHost.ts` + `convex/dathost.ts`
- Cliente chama `provisionDatHostServer`
- Cria servidor DatHost
- Envia comandos de configuração:
  - Base config (mp_warmuptime, mp_maxrounds, etc)
  - `mp_restartgame 1`
  - **AGUARDA 2 segundos**
  - Comandos `sm_team` para Team A (CT) e Team B (T)
- Quando servidor está pronto → `state: "WARMUP"`

## 5️⃣ WARMUP (aguardar jogadores)
**Ficheiro:** `convex/matchWarmup.ts`
- Cria `player_stats` para todos os jogadores
- Inicia monitoring (`convex/matchMonitor.ts`)
- Aguarda jogadores conectarem

### Deteção de Conexão:
**Ficheiro:** `convex/cs2LogHandlers.ts`
- CS2 envia logs via webhook
- `handlePlayerConnect` marca `connected: true`
- Quando todos conectam → `checkLobbyReady`

### Countdown:
**Ficheiro:** `convex/lobbyReady.ts`
- Todos conectados → countdown 10s
- Envia `mp_warmuptime 10` ao servidor
- Após 10s → `state: "LIVE"`

## 6️⃣ LIVE (jogo a decorrer)
- Servidor CS2 a correr
- Stats a ser tracked
- Aguarda fim do jogo

---

## 🔴 PROBLEMAS IDENTIFICADOS:

### Problema 1: Jogadores escolhem lado manualmente
**Causa:** Comandos `sm_team` não estão a funcionar
**Razão:** Podem estar a ser enviados antes do servidor estar pronto
**Solução:** Já implementado delay de 2s + 200ms entre comandos

### Problema 2: Deteção inconsistente
**Causa:** CS2 logs podem não estar a chegar ao webhook
**Razão:** Endpoint pode não estar configurado corretamente
**Solução:** Verificar logs e endpoint

### Problema 3: Informações desapareceram
**Causa:** Novo UI (page-v6.tsx) não tem provisioning logic
**Razão:** Código antigo tinha `provisionServer` direto, novo tem `requestProvisioning`
**Solução:** Verificar se provisioning está a ser chamado
