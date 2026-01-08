import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * FASE 54: NEWSROOM CMS
 * Articles, News, Match Ticker
 */

const SUPER_ADMIN_EMAIL = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || "marstrabalhar@gmail.com";

// Helper to check editor permission
async function isEditor(ctx: any): Promise<boolean> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.email) return false;
  
  if (identity.email === SUPER_ADMIN_EMAIL) return true;
  
  const staffMember = await ctx.db
    .query("staff_members")
    .withIndex("by_email", (q: any) => q.eq("email", identity.email))
    .first();
  
  return staffMember && (staffMember.role === "ADMIN" || staffMember.role === "ORGANIZER");
}

// Helper to check org manager permission
async function isOrgManager(ctx: any, orgId: Id<"organizations">): Promise<boolean> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return false;

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q: any) => q.eq("clerkId", identity.subject))
    .first();
  if (!user) return false;

  const org = await ctx.db.get(orgId);
  if (!org) return false;

  return org.ownerId === user._id || org.managersIds?.includes(user._id);
}

// Generate URL-friendly slug
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .substring(0, 100);
}

/**
 * Check if current user can create/edit articles
 */
export const canCreateArticle = query({
  args: {},
  handler: async (ctx) => {
    return await isEditor(ctx);
  },
});

/**
 * Get all articles for management (editors only)
 */
export const getArticlesForManagement = query({
  args: {},
  handler: async (ctx) => {
    const canEdit = await isEditor(ctx);
    if (!canEdit) return [];

    const articles = await ctx.db
      .query("articles")
      .order("desc")
      .take(100);

    return await Promise.all(articles.map(async (article) => {
      const author = await ctx.db.get(article.authorId);
      return {
        _id: article._id,
        title: article.title,
        slug: article.slug,
        type: article.type,
        status: article.status,
        isFeatured: article.isFeatured,
        coverImageUrl: article.coverImageUrl,
        views: article.views || 0,
        author: author?.nickname || author?.steamName || "Unknown",
        createdAt: article.createdAt ? Number(article.createdAt) : null,
        publishedAt: article.publishedAt ? Number(article.publishedAt) : null,
      };
    }));
  },
});

/**
 * Create editorial article (Admin/Organizer only)
 */
export const createArticle = mutation({
  args: {
    title: v.string(),
    excerpt: v.optional(v.string()),
    content: v.string(),
    coverImageUrl: v.optional(v.string()),
    type: v.union(
      v.literal("EDITORIAL"),
      v.literal("ANNOUNCEMENT"),
      v.literal("TOURNAMENT")
    ),
    tournamentId: v.optional(v.id("tournaments")),
    isFeatured: v.optional(v.boolean()),
    status: v.optional(v.union(v.literal("DRAFT"), v.literal("PUBLISHED"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const canEdit = await isEditor(ctx);
    if (!canEdit) throw new Error("Acesso negado. Apenas ADMIN ou ORGANIZER.");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    const slug = generateSlug(args.title) + "-" + Date.now().toString(36);
    const now = BigInt(Date.now());

    const articleId = await ctx.db.insert("articles", {
      title: args.title,
      slug,
      excerpt: args.excerpt,
      content: args.content,
      coverImageUrl: args.coverImageUrl,
      type: args.type,
      authorId: user._id,
      tournamentId: args.tournamentId,
      isFeatured: args.isFeatured || false,
      status: args.status || "DRAFT",
      publishedAt: args.status === "PUBLISHED" ? now : undefined,
      views: 0,
      createdAt: now,
    });

    console.log(`📰 Article created: ${args.title}`);
    return articleId;
  },
});

/**
 * Create org press release (Org Manager only)
 */
export const createOrgNews = mutation({
  args: {
    orgId: v.id("organizations"),
    title: v.string(),
    excerpt: v.optional(v.string()),
    content: v.string(),
    coverImageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const canManage = await isOrgManager(ctx, args.orgId);
    if (!canManage) throw new Error("Acesso negado. Apenas Manager da Organização.");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    const slug = generateSlug(args.title) + "-" + Date.now().toString(36);
    const now = BigInt(Date.now());

    const articleId = await ctx.db.insert("articles", {
      title: args.title,
      slug,
      excerpt: args.excerpt,
      content: args.content,
      coverImageUrl: args.coverImageUrl,
      type: "ORG_NEWS",
      authorId: user._id,
      orgId: args.orgId,
      status: "PUBLISHED",
      publishedAt: now,
      views: 0,
      createdAt: now,
    });

    const org = await ctx.db.get(args.orgId);
    console.log(`📰 Org news published: ${org?.name} - ${args.title}`);
    return articleId;
  },
});

/**
 * Update article
 */
export const updateArticle = mutation({
  args: {
    articleId: v.id("articles"),
    title: v.optional(v.string()),
    excerpt: v.optional(v.string()),
    content: v.optional(v.string()),
    coverImageUrl: v.optional(v.string()),
    isFeatured: v.optional(v.boolean()),
    featuredOrder: v.optional(v.float64()),
    status: v.optional(v.union(v.literal("DRAFT"), v.literal("PUBLISHED"), v.literal("ARCHIVED"))),
  },
  handler: async (ctx, args) => {
    const article = await ctx.db.get(args.articleId);
    if (!article) throw new Error("Article not found");

    // Check permission
    if (article.type === "ORG_NEWS" && article.orgId) {
      const canManage = await isOrgManager(ctx, article.orgId);
      if (!canManage) throw new Error("Acesso negado");
    } else {
      const canEdit = await isEditor(ctx);
      if (!canEdit) throw new Error("Acesso negado");
    }

    const { articleId, ...updates } = args;
    const cleanUpdates: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }

    // Set publishedAt if publishing
    if (updates.status === "PUBLISHED" && article.status !== "PUBLISHED") {
      cleanUpdates.publishedAt = BigInt(Date.now());
    }

    // Update slug if title changed
    if (updates.title) {
      cleanUpdates.slug = generateSlug(updates.title) + "-" + Date.now().toString(36);
    }

    cleanUpdates.updatedAt = BigInt(Date.now());

    await ctx.db.patch(articleId, cleanUpdates);
    return { success: true };
  },
});

/**
 * Delete article
 */
export const deleteArticle = mutation({
  args: { articleId: v.id("articles") },
  handler: async (ctx, args) => {
    const article = await ctx.db.get(args.articleId);
    if (!article) throw new Error("Article not found");

    if (article.type === "ORG_NEWS" && article.orgId) {
      const canManage = await isOrgManager(ctx, article.orgId);
      if (!canManage) throw new Error("Acesso negado");
    } else {
      const canEdit = await isEditor(ctx);
      if (!canEdit) throw new Error("Acesso negado");
    }

    await ctx.db.delete(args.articleId);
    return { success: true };
  },
});

/**
 * Get article by slug
 */
export const getArticleBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const article = await ctx.db
      .query("articles")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!article) return null;

    // Get author info
    const author = await ctx.db.get(article.authorId);

    // Get org info if org news
    let org = null;
    if (article.orgId) {
      org = await ctx.db.get(article.orgId);
    }

    return {
      ...article,
      createdAt: Number(article.createdAt),
      publishedAt: article.publishedAt ? Number(article.publishedAt) : null,
      author: author ? {
        nickname: author.nickname,
        steamName: author.steamName,
        steamAvatar: author.steamAvatar,
      } : null,
      org: org ? { name: org.name, tag: org.tag, logoUrl: org.logoUrl } : null,
    };
  },
});

/**
 * Get article by ID
 */
export const getArticle = query({
  args: { articleId: v.id("articles") },
  handler: async (ctx, args) => {
    const article = await ctx.db.get(args.articleId);
    if (!article) return null;

    const author = await ctx.db.get(article.authorId);

    return {
      ...article,
      createdAt: Number(article.createdAt),
      publishedAt: article.publishedAt ? Number(article.publishedAt) : null,
      author: author ? {
        nickname: author.nickname,
        steamAvatar: author.steamAvatar,
      } : null,
    };
  },
});

/**
 * Get featured articles (Hero Grid)
 */
export const getFeaturedArticles = query({
  args: { limit: v.optional(v.float64()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 5;

    const articles = await ctx.db
      .query("articles")
      .withIndex("by_featured", (q) => q.eq("isFeatured", true))
      .filter((q) => q.eq(q.field("status"), "PUBLISHED"))
      .order("desc")
      .take(limit);

    return await Promise.all(articles.map(async (article) => {
      const author = await ctx.db.get(article.authorId);
      let org = null;
      if (article.orgId) {
        org = await ctx.db.get(article.orgId);
      }

      return {
        _id: article._id,
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        coverImageUrl: article.coverImageUrl,
        type: article.type,
        publishedAt: article.publishedAt ? Number(article.publishedAt) : null,
        author: author?.nickname || author?.steamName,
        org: org ? { name: org.name, tag: org.tag } : null,
      };
    }));
  },
});

/**
 * Get latest news feed
 */
export const getNewsFeed = query({
  args: {
    limit: v.optional(v.float64()),
    type: v.optional(v.union(
      v.literal("EDITORIAL"),
      v.literal("ANNOUNCEMENT"),
      v.literal("ORG_NEWS"),
      v.literal("TOURNAMENT")
    )),
    orgId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;

    let articles;

    if (args.type) {
      articles = await ctx.db.query("articles")
        .withIndex("by_type", (q) => q.eq("type", args.type!))
        .filter((q) => q.eq(q.field("status"), "PUBLISHED"))
        .order("desc")
        .take(limit);
    } else if (args.orgId) {
      articles = await ctx.db.query("articles")
        .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
        .filter((q) => q.eq(q.field("status"), "PUBLISHED"))
        .order("desc")
        .take(limit);
    } else {
      articles = await ctx.db.query("articles")
        .withIndex("by_status", (q) => q.eq("status", "PUBLISHED"))
        .order("desc")
        .take(limit);
    }

    return await Promise.all(articles.map(async (article) => {
      const author = await ctx.db.get(article.authorId);
      let org = null;
      if (article.orgId) {
        org = await ctx.db.get(article.orgId);
      }

      return {
        _id: article._id,
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        coverImageUrl: article.coverImageUrl,
        type: article.type,
        publishedAt: article.publishedAt ? Number(article.publishedAt) : null,
        views: article.views || 0,
        author: author?.nickname || author?.steamName,
        org: org ? { name: org.name, tag: org.tag, logoUrl: org.logoUrl } : null,
      };
    }));
  },
});

/**
 * Increment article view count
 */
export const incrementViews = mutation({
  args: { articleId: v.id("articles") },
  handler: async (ctx, args) => {
    const article = await ctx.db.get(args.articleId);
    if (!article) return;

    await ctx.db.patch(args.articleId, {
      views: (article.views || 0) + 1,
    });
  },
});

/**
 * Get live match ticker
 */
export const getLiveTicker = query({
  args: { limit: v.optional(v.float64()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    // Get live and upcoming matches
    const liveMatches = await ctx.db
      .query("live_ticker")
      .withIndex("by_status", (q) => q.eq("status", "LIVE"))
      .order("desc")
      .take(limit);

    const recentFinished = await ctx.db
      .query("live_ticker")
      .withIndex("by_status", (q) => q.eq("status", "FINISHED"))
      .order("desc")
      .take(5);

    const upcoming = await ctx.db
      .query("live_ticker")
      .withIndex("by_status", (q) => q.eq("status", "UPCOMING"))
      .order("asc")
      .take(5);

    const allMatches = [
      ...liveMatches.map(m => ({ ...m, sortOrder: 0 })),
      ...upcoming.map(m => ({ ...m, sortOrder: 1 })),
      ...recentFinished.map(m => ({ ...m, sortOrder: 2 })),
    ];

    return allMatches.map(m => ({
      _id: m._id,
      team1Name: m.team1Name,
      team2Name: m.team2Name,
      team1Logo: m.team1Logo,
      team2Logo: m.team2Logo,
      score1: m.score1,
      score2: m.score2,
      map: m.map,
      status: m.status,
      scheduledTime: m.scheduledTime ? Number(m.scheduledTime) : null,
      tournamentName: m.tournamentName,
    }));
  },
});

/**
 * Update live ticker (internal - called from match system)
 */
export const updateLiveTicker = internalMutation({
  args: {
    matchId: v.optional(v.id("matches")),
    tournamentMatchId: v.optional(v.id("tournament_matches")),
    team1Name: v.string(),
    team2Name: v.string(),
    team1Logo: v.optional(v.string()),
    team2Logo: v.optional(v.string()),
    score1: v.float64(),
    score2: v.float64(),
    map: v.optional(v.string()),
    status: v.union(v.literal("UPCOMING"), v.literal("LIVE"), v.literal("FINISHED")),
    tournamentName: v.optional(v.string()),
    priority: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    // Check if ticker entry exists
    let existing = null;
    if (args.matchId) {
      existing = await ctx.db
        .query("live_ticker")
        .filter((q) => q.eq(q.field("matchId"), args.matchId))
        .first();
    } else if (args.tournamentMatchId) {
      existing = await ctx.db
        .query("live_ticker")
        .filter((q) => q.eq(q.field("tournamentMatchId"), args.tournamentMatchId))
        .first();
    }

    const now = BigInt(Date.now());

    if (existing) {
      await ctx.db.patch(existing._id, {
        score1: args.score1,
        score2: args.score2,
        status: args.status,
        map: args.map,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("live_ticker", {
        matchId: args.matchId,
        tournamentMatchId: args.tournamentMatchId,
        team1Name: args.team1Name,
        team2Name: args.team2Name,
        team1Logo: args.team1Logo,
        team2Logo: args.team2Logo,
        score1: args.score1,
        score2: args.score2,
        map: args.map,
        status: args.status,
        tournamentName: args.tournamentName,
        priority: args.priority || 1,
        createdAt: now,
      });
    }
  },
});

/**
 * Check if user is editor
 */
export const checkIsEditor = query({
  args: {},
  handler: async (ctx) => {
    return await isEditor(ctx);
  },
});
