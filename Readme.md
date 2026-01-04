# ProArena - Plataforma Competitiva CS2 (Clone FACEIT)

## 1. Visão Geral e Identidade Visual
A **ProArena** é uma plataforma de matchmaking para CS2.
**Referência Visual Obrigatória:** O design deve imitar a estética do **FACEIT**.
* **Vibe:** Competitiva, "Dark", Industrial, Gamer.
* **Layout:** Sidebar Esquerda Fixa (Navegação) + Topbar (Utilizador) + Conteúdo Central.
* **Paleta de Cores (Tailwind):**
    * **Background:** `bg-zinc-950` (Preto profundo, não cinzento).
    * **Painéis/Cards:** `bg-zinc-900/50` (Com ligeira transparência/backdrop-blur).
    * **Bordas:** `border-zinc-800`.
    * **Primária (Ação):** `bg-orange-600` hover `bg-orange-500` (O "Laranja FACEIT").
    * **Texto:** `text-zinc-100` (Branco sujo) e `text-zinc-400` (Cinza para metadados).
* **Tipografia:** Fonte sem serifa, pesos `bold` para títulos e números.

## 2. Stack Tecnológica (Imutável)
* **Frontend:** Next.js (App Router).
* **Routing:** TanStack Router (File-based routing).
* **UI Lib:** Shadcn/ui (Radix) + Lucide React Icons.
* **CSS:** Tailwind CSS (Com plugin `tailwindcss-animate`).
* **Backend:** Convex (BaaS).
* **Auth:** Clerk.

## 3. Arquitetura de UI (Instruções de Layout)

### 3.1. Shell da Aplicação (Layout Global)
O ficheiro `layout.tsx` deve implementar:
1.  **Sidebar (Esquerda - 64px a 240px):**
    * Logo no topo (Ícone Laranja).
    * Menu: "Jogar" (Ícone Gamepad), "Torneios" (Trophy), "Ranking" (Chart).
    * O item ativo deve ter uma borda laranja à esquerda (`border-l-4 border-orange-600`).
2.  **Header (Topo):**
    * Saldo/Moeda (se houver).
    * Notificações.
    * **User Menu:** Avatar (Clerk) + Dropdown.
3.  **Main Content:** Área de scroll infinito central.

### 3.2. Dashboard "JOGAR" (A Home)
Deve replicar a sensação de entrar num lobby.
* **Hero Section:** Imagem de fundo de um mapa de CS2 (ex: Mirage) com overlay preto (`bg-black/60`).
* **Cards de Seleção de Modo (1v1 vs 5v5):**
    * Dois cartões grandes lado a lado.
    * Devem mostrar estatísticas pessoais (ELO atual nesse modo).
    * Ao clicar, ficam com outline laranja (`ring-2 ring-orange-600`).
* **Botão de Ação Flutuante ou Fixo:**
    * Um botão GIGANTE: **"JOGAR"**.
    * Cor: `bg-orange-600`. Texto: `uppercase font-black`.
* **Friends List (Opcional - Direita):** Uma barra colapsável à direita com lista de amigos online (fake data por enquanto).

### 3.3. Ecrã de Lobby (Match Room)
Quando a partida é encontrada:
* **Cabeçalho:** Placar "Team A vs Team B" com ELO médio.
* **Coluna Central (Vetos):**
    * Grid de imagens dos mapas do CS2.
    * Mapas banidos ficam a P&B e riscados.
    * Mapas disponíveis ficam coloridos.
* **Ação Final:** Quando o IP for gerado, mostrar um input `readonly` com o comando `connect 127.0.0.1:27015` e um botão "COPIAR".

## 4. Estrutura de Dados (Schema Convex)

### `users`
* `clerkId` (Index), `steamId` (Required).
* `role`: `"USER" | "ADMIN"`.
* `elo_1v1`: Float (Default 1000).
* `elo_5v5`: Float (Default 1000).
* `isBanned`: Boolean.

### `queue_entries`
* `userId` (Ref), `mode` ("1v1" | "5v5"), `joinedAt` (Int64).

### `matches`
* `state`: `"VETO" | "CONFIGURING" | "LIVE" | "FINISHED" | "CANCELLED"`.
* `mode`: `"1v1" | "5v5"`.
* `teamA`: [Ref User], `teamB`: [Ref User].
* `mapPool`: [String], `bannedMaps`: [String].
* `serverIp`: String.

## 5. Painel de Admin (`/admin`)
* **Segurança:** Middleware deve bloquear acesso se `role !== "ADMIN"`.
* **UI:** Tabela densa (Shadcn Table) com lista de utilizadores.
* **Ações:** Botão Destrutivo "BANIR" (muda `isBanned` para true).
* **Logs:** Lista de partidas recentes com ID e Vencedor.

## 6. Configuração (.env)
Apenas chaves essenciais no `.env.local`:
```env
CONVEX_DEPLOYMENT=...
NEXT_PUBLIC_CONVEX_URL=...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...