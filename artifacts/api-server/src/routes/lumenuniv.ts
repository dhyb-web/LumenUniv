import { randomUUID } from "node:crypto";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  CreatePostBody,
  CreatePostResponse,
  GetCurrentProfileResponse,
  GetDashboardSummaryResponse,
  ListCommunitiesResponse,
  ListFeedPostsQueryParams,
  ListFeedPostsResponse,
  ListUniversitiesQueryParams,
  ListUniversitiesResponse,
  SearchAcademicQueryParams,
  SearchAcademicResponse,
  TogglePostLikeParams,
  TogglePostLikeResponse,
} from "@workspace/api-zod";
import {
  communitiesTable,
  db,
  postLikesTable,
  postsTable,
  profilesTable,
  universitiesTable,
} from "@workspace/db";

const router: IRouter = Router();
const CURRENT_PROFILE_ID = "profile-yaovi";

function toProfile(profile: typeof profilesTable.$inferSelect) {
  return {
    id: profile.id,
    name: profile.name,
    handle: profile.handle,
    avatar: profile.avatar,
    role: profile.role,
    country: profile.country,
    university: profile.university,
    field: profile.field,
    verified: profile.verified,
    followers: profile.followers,
    following: profile.following,
  };
}

function toUniversity(university: typeof universitiesTable.$inferSelect) {
  return {
    id: university.id,
    name: university.name,
    city: university.city,
    country: university.country,
    region: university.region,
    students: university.students,
    verified: university.verified,
    initials: university.initials,
    accent: university.accent,
  };
}

function toCommunity(community: typeof communitiesTable.$inferSelect) {
  return {
    id: community.id,
    name: community.name,
    description: community.description,
    members: community.members,
    university: community.university,
    category: community.category,
    joined: community.joined,
  };
}

async function serializePost(postId: string, profileId = CURRENT_PROFILE_ID) {
  const [row] = await db
    .select()
    .from(postsTable)
    .innerJoin(profilesTable, eq(postsTable.authorId, profilesTable.id))
    .where(eq(postsTable.id, postId));

  if (!row) {
    return undefined;
  }

  const [liked] = await db
    .select({ postId: postLikesTable.postId })
    .from(postLikesTable)
    .where(
      and(
        eq(postLikesTable.postId, postId),
        eq(postLikesTable.profileId, profileId),
      ),
    );

  return {
    id: row.posts.id,
    author: toProfile(row.profiles),
    body: row.posts.body,
    image: row.posts.image,
    topic: row.posts.topic,
    publishedAt: row.posts.createdAt.toISOString(),
    likes: row.posts.likes,
    comments: row.posts.comments,
    reposts: row.posts.reposts,
    liked: Boolean(liked),
    university: row.posts.university,
  };
}

router.get("/me", async (_req, res): Promise<void> => {
  const [profile] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.id, CURRENT_PROFILE_ID));

  if (!profile) {
    res.status(404).json({ error: "Current profile not found" });
    return;
  }

  res.json(GetCurrentProfileResponse.parse(toProfile(profile)));
});

router.get("/dashboard", async (_req, res): Promise<void> => {
  const [summary] = await db
    .select({
      activeCommunities: sql<number>`count(*)::int`,
    })
    .from(communitiesTable)
    .where(eq(communitiesTable.joined, true));

  res.json(
    GetDashboardSummaryResponse.parse({
      greeting: "Good morning, Yaovi",
      unreadNotifications: 4,
      nextClass: {
        title: "Research methodology",
        time: "Today, 10:30",
        room: "Amphi B · Campus Nord",
      },
      activeCommunities: summary?.activeCommunities ?? 0,
      weeklyProgress: 72,
    }),
  );
});

router.get("/feed/posts", async (req, res): Promise<void> => {
  const parsed = ListFeedPostsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const rows = await db
    .select()
    .from(postsTable)
    .innerJoin(profilesTable, eq(postsTable.authorId, profilesTable.id))
    .orderBy(desc(postsTable.createdAt))
    .limit(parsed.data.limit);

  const likedRows = await db
    .select({ postId: postLikesTable.postId })
    .from(postLikesTable)
    .where(eq(postLikesTable.profileId, CURRENT_PROFILE_ID));
  const likedIds = new Set(likedRows.map((row) => row.postId));

  const posts = rows.map((row) => ({
    id: row.posts.id,
    author: toProfile(row.profiles),
    body: row.posts.body,
    image: row.posts.image,
    topic: row.posts.topic,
    publishedAt: row.posts.createdAt.toISOString(),
    likes: row.posts.likes,
    comments: row.posts.comments,
    reposts: row.posts.reposts,
    liked: likedIds.has(row.posts.id),
    university: row.posts.university,
  }));

  res.json(ListFeedPostsResponse.parse(posts));
});

router.post("/feed/posts", async (req, res): Promise<void> => {
  const parsed = CreatePostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [profile] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.id, CURRENT_PROFILE_ID));
  if (!profile) {
    res.status(404).json({ error: "Current profile not found" });
    return;
  }

  const [post] = await db
    .insert(postsTable)
    .values({
      id: `post-${randomUUID()}`,
      authorId: profile.id,
      body: parsed.data.body,
      image: parsed.data.image ?? null,
      topic: parsed.data.topic ?? null,
      university: profile.university,
    })
    .returning();

  const created = await serializePost(post.id);
  res.status(201).json(CreatePostResponse.parse(created));
});

router.post("/feed/posts/:id/like", async (req, res): Promise<void> => {
  const parsed = TogglePostLikeParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [post] = await db
    .select()
    .from(postsTable)
    .where(eq(postsTable.id, parsed.data.id));
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  const [existingLike] = await db
    .select()
    .from(postLikesTable)
    .where(
      and(
        eq(postLikesTable.postId, post.id),
        eq(postLikesTable.profileId, CURRENT_PROFILE_ID),
      ),
    );

  if (existingLike) {
    await db
      .delete(postLikesTable)
      .where(
        and(
          eq(postLikesTable.postId, post.id),
          eq(postLikesTable.profileId, CURRENT_PROFILE_ID),
        ),
      );
    await db
      .update(postsTable)
      .set({ likes: sql`greatest(${postsTable.likes} - 1, 0)` })
      .where(eq(postsTable.id, post.id));
  } else {
    await db.insert(postLikesTable).values({
      postId: post.id,
      profileId: CURRENT_PROFILE_ID,
    });
    await db
      .update(postsTable)
      .set({ likes: sql`${postsTable.likes} + 1` })
      .where(eq(postsTable.id, post.id));
  }

  const updated = await serializePost(post.id);
  res.json(TogglePostLikeResponse.parse(updated));
});

router.get("/universities", async (req, res): Promise<void> => {
  const parsed = ListUniversitiesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const conditions = parsed.data.country
    ? eq(universitiesTable.country, parsed.data.country)
    : undefined;
  const universities = await db
    .select()
    .from(universitiesTable)
    .where(conditions)
    .limit(parsed.data.limit);

  res.json(ListUniversitiesResponse.parse(universities.map(toUniversity)));
});

router.get("/communities", async (_req, res): Promise<void> => {
  const communities = await db
    .select()
    .from(communitiesTable)
    .orderBy(desc(communitiesTable.members));
  res.json(ListCommunitiesResponse.parse(communities.map(toCommunity)));
});

router.get("/search", async (req, res): Promise<void> => {
  const parsed = SearchAcademicQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const term = `%${parsed.data.q}%`;
  const [profiles, universities, communities, posts] = await Promise.all([
    parsed.data.type === "all" || parsed.data.type === "people"
      ? db
          .select()
          .from(profilesTable)
          .where(
            or(
              ilike(profilesTable.name, term),
              ilike(profilesTable.university, term),
              ilike(profilesTable.field, term),
            ),
          )
          .limit(8)
      : [],
    parsed.data.type === "all" || parsed.data.type === "universities"
      ? db
          .select()
          .from(universitiesTable)
          .where(
            or(
              ilike(universitiesTable.name, term),
              ilike(universitiesTable.city, term),
              ilike(universitiesTable.country, term),
            ),
          )
          .limit(8)
      : [],
    parsed.data.type === "all" || parsed.data.type === "communities"
      ? db
          .select()
          .from(communitiesTable)
          .where(
            or(
              ilike(communitiesTable.name, term),
              ilike(communitiesTable.description, term),
              ilike(communitiesTable.category, term),
            ),
          )
          .limit(8)
      : [],
    parsed.data.type === "all" || parsed.data.type === "posts"
      ? db
          .select()
          .from(postsTable)
          .where(
            or(
              ilike(postsTable.body, term),
              ilike(postsTable.topic, term),
              ilike(postsTable.university, term),
            ),
          )
          .limit(8)
      : [],
  ]);

  const results = [
    ...profiles.map((profile) => ({
      id: profile.id,
      title: profile.name,
      type: "Person",
      subtitle: `${profile.role} · ${profile.university}`,
      image: profile.avatar,
    })),
    ...universities.map((university) => ({
      id: university.id,
      title: university.name,
      type: "University",
      subtitle: `${university.city}, ${university.country}`,
      image: null,
    })),
    ...communities.map((community) => ({
      id: community.id,
      title: community.name,
      type: "Community",
      subtitle: `${community.members} members · ${community.category}`,
      image: null,
    })),
    ...posts.map((post) => ({
      id: post.id,
      title: post.body.slice(0, 80),
      type: "Post",
      subtitle: `${post.university} · ${post.topic ?? "Academic discussion"}`,
      image: post.image,
    })),
  ];

  res.json(SearchAcademicResponse.parse(results));
});

export default router;