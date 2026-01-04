# 🔐 Configuração Clerk + Convex (OBRIGATÓRIO)

## ⚠️ PROBLEMA ATUAL
Erro: "Not authenticated" ao tentar entrar na queue.

## 🛠️ SOLUÇÃO: Configurar JWT Template no Clerk

### Passos:

1. **Vai ao Clerk Dashboard:**
   - https://dashboard.clerk.com

2. **Seleciona o teu projeto** (powerful-doberman-93)

3. **No menu lateral, vai a:**
   - **JWT Templates** (ou **Configure** → **JWT Templates**)

4. **Clica em "New template"**

5. **Seleciona "Convex"** na lista de templates

6. **Configura o template:**
   - **Name:** `convex` (exatamente assim, minúsculas)
   - **Issuer:** Deixa o padrão
   - **Audience:** Deixa o padrão
   - **Token lifetime:** 60 seconds (padrão)

7. **Clica em "Apply Changes" ou "Save"**

8. **IMPORTANTE:** Copia o **Issuer URL** que aparece (algo como `https://powerful-doberman-93.clerk.accounts.dev`)

9. **Vai ao Convex Dashboard:**
   - https://dashboard.convex.dev
   - Seleciona o projeto `proarena`
   - Vai a **Settings** → **Environment Variables**
   - Adiciona:
     ```
     CLERK_ISSUER_URL=https://powerful-doberman-93.clerk.accounts.dev
     ```

10. **Reinicia ambos os servidores:**
    ```bash
    # Terminal 1
    npx convex dev
    
    # Terminal 2
    npm run dev
    ```

## ✅ Verificação

Após configurar:
1. Faz refresh na página
2. Tenta entrar na queue novamente
3. O erro "Not authenticated" deve desaparecer

## 📍 Como Adicionar Steam ID

1. **Vai para `/profile`** (clica em "Perfil" na sidebar)
2. **Se não tiveres Steam ID configurada**, verás um **card amarelo** no topo
3. **Insere a tua Steam ID** (ex: `STEAM_0:1:12345678`)
4. **Clica em "Guardar"**
5. **Agora podes jogar!**

## 🔍 Como Encontrar a Tua Steam ID

1. Vai a: https://steamid.io/
2. Insere o teu perfil Steam
3. Copia o **steamID** (formato: `STEAM_0:X:XXXXXXXX`)
