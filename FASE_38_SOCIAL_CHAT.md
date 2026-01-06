# ✅ FASE 38: SISTEMA DE AMIGOS E CHAT DIRETO

## 📋 RESUMO

Sistema completo de amigos e chat direto implementado com UI discreta e janelas flutuantes persistentes.

---

## 🗄️ BACKEND (Convex)

### **Schema Atualizado** (`convex/schema.ts`)

```typescript
// Tabela de Amigos
friends: defineTable({
  user1Id: v.id("users"),
  user2Id: v.id("users"),
  status: v.union(v.literal("PENDING"), v.literal("ACCEPTED")),
  actionUserId: v.id("users"), // Quem enviou o pedido
  createdAt: v.int64(),
})
  .index("by_user1", ["user1Id"])
  .index("by_user2", ["user2Id"])
  .index("by_users", ["user1Id", "user2Id"])
  .index("by_status", ["status"])

// Tabela de Mensagens Diretas
direct_messages: defineTable({
  senderId: v.id("users"),
  receiverId: v.id("users"),
  content: v.string(),
  read: v.boolean(),
  timestamp: v.int64(),
})
  .index("by_sender", ["senderId"])
  .index("by_receiver", ["receiverId"])
  .index("by_conversation", ["senderId", "receiverId", "timestamp"])
```

### **Mutations & Queries**

**`convex/friendsNew.ts`:**
- ✅ `sendFriendRequest` - Enviar pedido de amizade
- ✅ `acceptFriendRequest` - Aceitar pedido
- ✅ `removeFriendship` - Remover/Rejeitar amizade
- ✅ `getFriends` - Listar amigos aceites
- ✅ `getPendingRequests` - Listar pedidos pendentes
- ✅ `getFriendshipStatus` - Verificar status com user específico

**`convex/directMessages.ts`:**
- ✅ `sendMessage` - Enviar mensagem direta
- ✅ `getConversation` - Buscar conversa com user
- ✅ `markAsRead` - Marcar mensagens como lidas
- ✅ `getUnreadCounts` - Contar mensagens não lidas
- ✅ `getRecentConversations` - Listar conversas recentes

---

## 🎨 FRONTEND (React)

### **1. ChatContext** (`contexts/ChatContext.tsx`)

Estado global para gestão de chats:
- `openChats` - Lista de janelas abertas (máx 3)
- `openChat()` - Abrir chat com amigo
- `closeChat()` - Fechar janela
- `minimizeChat()` / `maximizeChat()` - Toggle minimize
- `isSidebarOpen` - Estado da sidebar
- `toggleSidebar()` - Abrir/Fechar sidebar

### **2. SocialSidebar** (`components/SocialSidebar.tsx`)

**Barra lateral direita colapsável:**
- **Posição:** `fixed right-0 top-16`
- **Largura:** 
  - Expandida: `w-64`
  - Colapsada: `w-16` (apenas ícone)
- **Secções:**
  - Pedidos Pendentes (com botões Aceitar/Recusar)
  - Amigos Online (ordenados por ELO)
  - Badge de notificação se houver pedidos

### **3. ChatWindow** (`components/ChatWindow.tsx`)

**Janela flutuante de chat:**
- **Posição:** `fixed bottom-0` (empilha da direita para esquerda)
- **Tamanho:** `w-72 h-96`
- **Features:**
  - Minimizar (clique no header)
  - Fechar (botão X)
  - Auto-scroll para última mensagem
  - Mark as read automático
  - Input com limite de 500 caracteres
  - Timestamps nas mensagens

### **4. ChatManager** (`components/ChatManager.tsx`)

Renderiza todas as janelas de chat abertas simultaneamente.

### **5. AppHeader** (`components/AppHeader.tsx`)

**Botão toggle de amigos adicionado:**
- Ícone `Users`
- Badge laranja com número de pedidos pendentes
- Toggle da sidebar ao clicar

---

## 🔗 INTEGRAÇÃO

### **`app/page.tsx`**

```tsx
function DashboardWithSocial() {
  return (
    <ChatProvider>
      <Dashboard />
      <MatchmakingBar />
      <MatchReadyModal />
      <SocialSidebar />  {/* ← Barra direita */}
      <ChatManager />     {/* ← Janelas flutuantes */}
    </ChatProvider>
  )
}
```

**Persistência:** O `ChatProvider` mantém o estado dos chats abertos mesmo ao navegar entre páginas (/, /profile, /lobby, etc).

---

## 🎯 FUNCIONALIDADES

### **Sistema de Amigos**
1. ✅ Enviar pedido de amizade (via perfil público)
2. ✅ Aceitar/Rejeitar pedidos
3. ✅ Remover amizade
4. ✅ Ver lista de amigos online
5. ✅ Badge de notificação para pedidos pendentes

### **Chat Direto**
1. ✅ Abrir chat clicando no amigo
2. ✅ Máximo 3 chats abertos simultaneamente
3. ✅ Minimizar/Maximizar janelas
4. ✅ Mensagens em tempo real (Convex subscriptions)
5. ✅ Mark as read automático
6. ✅ Histórico de conversa (últimas 50 mensagens)
7. ✅ Timestamps formatados

### **UI Discreta**
- ✅ Sidebar colapsável (não obstrui conteúdo)
- ✅ Janelas flutuantes no canto inferior direito
- ✅ Z-index correto (não sobrepõe modais)
- ✅ Animações suaves

---

## 📝 PRÓXIMOS PASSOS (Opcional)

1. **Adicionar botões de amizade no perfil público** (`/profile/[username]`)
2. **Indicadores de status:**
   - 🟢 Online (conectado ao Convex)
   - 🟡 In-Game (em match)
   - ⚫ Offline
3. **Notificações push** para novas mensagens
4. **Typing indicators** ("User está a escrever...")
5. **Emojis** no chat

---

## 🚀 DEPLOY

```bash
git add .
git commit -m "feat: FASE 38 - Sistema de Amigos e Chat Direto"
git push origin master
```

**Convex:** Schema será atualizado automaticamente no deploy.

---

## 🎨 DESIGN NOTES

- **Cores:** Zinc (background) + Orange (accent)
- **Estilo:** Minimalista, inspirado em Discord/Steam
- **Responsivo:** Funciona em desktop (mobile TBD)
- **Performance:** Queries otimizadas com índices

---

**FASE 38 ✅ COMPLETA**
