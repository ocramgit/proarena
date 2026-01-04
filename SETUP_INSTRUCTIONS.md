# 🚀 Instruções de Configuração - FASE 2

## ⚠️ PASSOS OBRIGATÓRIOS PARA COMPLETAR A FASE 2

### 1️⃣ Configurar Convex (Backend)

1. **Iniciar Convex Dev:**
   ```bash
   npx convex dev
   ```

2. **Fazer Login:**
   - O comando irá abrir o browser automaticamente
   - Cria uma conta Convex (ou faz login se já tiveres)
   - Autoriza o projeto

3. **Copiar as Credenciais:**
   - Após o login, o Convex irá gerar automaticamente:
     - `CONVEX_DEPLOYMENT`
     - `NEXT_PUBLIC_CONVEX_URL`
   - Estas variáveis serão adicionadas automaticamente ao ficheiro `.env.local`

---

### 2️⃣ Configurar Clerk (Autenticação)

1. **Criar Conta no Clerk:**
   - Vai a https://clerk.com
   - Cria uma conta gratuita
   - Cria uma nova aplicação

2. **Obter as Chaves:**
   - No dashboard do Clerk, vai a **API Keys**
   - Copia:
     - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
     - `CLERK_SECRET_KEY`

3. **Adicionar ao `.env.local`:**
   - Cria o ficheiro `.env.local` na raiz do projeto (se ainda não existir)
   - Adiciona as chaves do Clerk:
   ```env
   # Convex (gerado automaticamente pelo npx convex dev)
   CONVEX_DEPLOYMENT=your-deployment-id
   NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

   # Clerk (copia do dashboard)
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   ```

---

### 3️⃣ Configurar Webhook do Clerk (Opcional mas Recomendado)

Para sincronização automática de utilizadores:

1. No dashboard do Clerk, vai a **Webhooks**
2. Cria um novo endpoint: `https://your-domain.com/api/webhooks/clerk`
3. Seleciona os eventos: `user.created`, `user.updated`
4. Copia o **Signing Secret** e adiciona ao `.env.local`:
   ```env
   CLERK_WEBHOOK_SECRET=whsec_...
   ```

---

### 4️⃣ Reiniciar o Servidor de Desenvolvimento

Após configurar as variáveis de ambiente:

```bash
npm run dev
```

---

## ✅ Verificação

A aplicação deve agora:
- ✅ Mostrar a **Landing Page** quando não autenticado
- ✅ Redirecionar para o **Dashboard** após login
- ✅ Sincronizar automaticamente o utilizador na base de dados Convex
- ✅ Permitir logout através do **UserButton** na Sidebar

---

## 🐛 Troubleshooting

### Erro: "Cannot find module '@/convex/_generated/api'"
- **Solução:** Executa `npx convex dev` para gerar os ficheiros TypeScript

### Erro: "Clerk publishable key not found"
- **Solução:** Verifica se o `.env.local` tem a chave `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

### Erro: "Convex client not configured"
- **Solução:** Verifica se o `.env.local` tem a chave `NEXT_PUBLIC_CONVEX_URL`

---

## 📁 Estrutura de Ficheiros Criada

```
ProArena/
├── convex/
│   ├── schema.ts          # Schema da base de dados
│   ├── users.ts           # Mutations e queries de utilizadores
│   └── tsconfig.json      # Config TypeScript do Convex
├── components/
│   ├── providers/
│   │   └── convex-client-provider.tsx  # Provider que integra Clerk + Convex
│   ├── layout/
│   │   └── sidebar.tsx    # Sidebar com UserButton
│   ├── landing-page.tsx   # Landing page pública
│   └── dashboard.tsx      # Dashboard protegido
├── hooks/
│   └── use-store-user-effect.tsx  # Hook para sincronizar utilizador
├── app/
│   ├── layout.tsx         # Layout com ConvexClientProvider
│   └── page.tsx           # Página principal com SignedIn/SignedOut
├── middleware.ts          # Proteção de rotas
├── .env.example           # Exemplo de variáveis de ambiente
└── .env.local             # ⚠️ CRIAR ESTE FICHEIRO MANUALMENTE
```

---

## 🎯 Próximos Passos (FASE 3)

Após completar a configuração:
- Sistema de Matchmaking (Fila de jogadores)
- Ecrã de Lobby com vetos de mapas
- Integração com servidor CS2
- Sistema de reports
- Painel de Admin
