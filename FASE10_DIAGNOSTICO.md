# 🔍 FASE 10 - DIAGNÓSTICO E TESTE

## ❌ Problema Reportado
A FASE 10 não está a funcionar - nenhum processamento de fim de jogo acontece.

## ✅ Correções Aplicadas

1. **Query `getMatchDetails` atualizada** - Agora retorna campos de ELO (`eloChange`, `oldElo`, `newElo`)
2. **Funções de teste criadas** - `testEndgame.ts` para diagnóstico manual

---

## 🧪 COMO TESTAR A FASE 10

### **Opção 1: Teste Manual (RECOMENDADO)**

1. **Abre o Convex Dashboard:**
   - Vai a: https://dashboard.convex.dev
   - Seleciona o teu projeto ProArena

2. **Encontra um match LIVE:**
   ```
   Query: testEndgame.checkMatchState
   Args: { "matchId": "SEU_MATCH_ID_AQUI" }
   ```
   - Copia o `matchId` de um match que esteja em estado `LIVE`

3. **Força o fim de jogo:**
   ```
   Mutation: testEndgame.forceEndGame
   Args: { "matchId": "SEU_MATCH_ID_AQUI" }
   ```

4. **Verifica o resultado:**
   - Vai aos **Logs** no Convex Dashboard
   - Procura por:
     - `🏁 Processing game over for match`
     - `✅ Match state updated to FINISHED`
     - `Winner: teamA` ou `Winner: teamB`
     - Mudanças de ELO para cada jogador

5. **Testa a UI:**
   - Vai a: `http://localhost:3002/matches/SEU_MATCH_ID/result`
   - Deves ver:
     - ✅ "VITÓRIA" ou "DERROTA" em grande
     - ✅ MVP destacado
     - ✅ Tabela de ELO com +25/-25
     - ✅ Stats finais

---

### **Opção 2: Teste Real (Jogo Completo)**

1. **Inicia um match 1v1**
2. **Conecta ao servidor DatHost**
3. **Joga até o fim** (primeiro a 16 rounds)
4. **Quando o jogo terminar:**
   - Verifica os logs do Convex
   - Procura por `Game Over` nos logs
   - Verifica se `handleGameOver` é chamado

---

## 🔍 DIAGNÓSTICO DE PROBLEMAS

### **Problema: Logs não mostram "Game Over"**

**Causa:** O webhook do DatHost pode não estar a enviar logs corretamente.

**Solução:**
1. Verifica o webhook no DatHost:
   - URL: `https://SEU_CONVEX_SITE.convex.site/cs2-logs`
   - Método: POST
2. Testa manualmente com `forceEndGame`

---

### **Problema: ELO não muda**

**Verifica:**
1. A função `processGameOver` foi chamada?
   - Logs: `🏁 Processing game over for match`
2. Os jogadores têm stats?
   ```
   Query: testEndgame.checkMatchState
   Args: { "matchId": "SEU_MATCH_ID" }
   ```
3. O campo `eloChange` está preenchido nos `player_stats`?

---

### **Problema: Página de resultados não carrega**

**Verifica:**
1. O match está em estado `FINISHED`?
2. A query `getMatchDetails` retorna dados?
3. Há erros no console do browser (F12)?

---

## 📊 VERIFICAÇÃO COMPLETA

Execute estes comandos no Convex Dashboard para verificar tudo:

### 1. Ver todos os matches LIVE:
```javascript
// Query: matches (built-in)
// Filter: state === "LIVE"
```

### 2. Ver stats de um match:
```javascript
// Query: testEndgame.checkMatchState
{
  "matchId": "j57fgy7fj6201s0rnhct9v9sn97yj07r"
}
```

### 3. Forçar fim de jogo:
```javascript
// Mutation: testEndgame.forceEndGame
{
  "matchId": "j57fgy7fj6201s0rnhct9v9sn97yj07r"
}
```

### 4. Ver histórico de matches:
```javascript
// Query: matchQueries.getMatchHistory
{
  "limit": 10
}
```

---

## 🎯 CHECKLIST DE FUNCIONAMENTO

- [ ] `handleGameOver` é chamado quando jogo termina
- [ ] `processGameOver` calcula ELO (+25/-25)
- [ ] `processGameOver` determina MVP
- [ ] Match muda para estado `FINISHED`
- [ ] `match_history` é criado
- [ ] `player_stats` tem `eloChange`, `oldElo`, `newElo`
- [ ] Servidor DatHost é apagado
- [ ] Página `/matches/[matchId]/result` mostra resultados
- [ ] Página `/matches/[matchId]` mostra detalhes
- [ ] Dashboard não mostra matches FINISHED

---

## 🚨 SE NADA FUNCIONAR

1. **Para o Convex:** `Ctrl+C` no terminal onde `npx convex dev` está a correr
2. **Apaga a cache:** `Remove-Item -Path ".next" -Recurse -Force`
3. **Reinicia tudo:**
   ```bash
   npx convex dev
   # Noutro terminal:
   npm run dev
   ```
4. **Testa com `forceEndGame`** no Convex Dashboard

---

## 📝 LOGS ESPERADOS

Quando um jogo termina, deves ver isto nos logs do Convex:

```
🏁 Game over detected - Processing match result: j57fgy7fj6201s0rnhct9v9sn97yj07r
Final Score: Team A 16 - 14 Team B
Winner: teamA
🏁 Processing game over for match: j57fgy7fj6201s0rnhct9v9sn97yj07r
Winner: teamA
🏆 MVP determined: jh7cva1qw5p5q3g9t9v...
✅ user123: 1000 → 1025 (+25)
✅ user456: 1050 → 1075 (+25)
❌ user789: 980 → 955 (-25)
❌ user012: 1020 → 995 (-25)
✅ Match state updated to FINISHED
✅ Match history entry created
🗑️ Scheduling DatHost server cleanup
```

---

## 💡 DICA RÁPIDA

Para testar rapidamente:
1. Abre Convex Dashboard
2. Vai a "Functions" → "testEndgame" → "forceEndGame"
3. Usa o matchId de um match LIVE
4. Clica "Run"
5. Verifica os logs

**Isto deve processar o fim de jogo imediatamente!**
