import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  integer,
  index,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const universitiesTable = pgTable(
  "universities",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    city: text("city").notNull(),
    country: text("country").notNull(),
    region: text("region").notNull(),
    students: integer("students").notNull().default(0),
    verified: boolean("verified").notNull().default(false),
    initials: text("initials").notNull(),
    accent: text("accent").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("universities_country_idx").on(table.country)],
);

export const profilesTable = pgTable(
  "profiles",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    handle: text("handle").notNull().unique(),
    avatar: text("avatar").notNull(),
    role: text("role").notNull(),
    country: text("country").notNull(),
    university: text("university").notNull(),
    field: text("field").notNull(),
    verified: boolean("verified").notNull().default(false),
    followers: integer("followers").notNull().default(0),
    following: integer("following").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("profiles_university_idx").on(table.university)],
);

export const communitiesTable = pgTable(
  "communities",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    members: integer("members").notNull().default(0),
    university: text("university").notNull(),
    category: text("category").notNull(),
    joined: boolean("joined").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("communities_category_idx").on(table.category)],
);

export const postsTable = pgTable(
  "posts",
  {
    id: text("id").primaryKey(),
    authorId: text("author_id")
      .notNull()
      .references(() => profilesTable.id),
    body: text("body").notNull(),
    image: text("image"),
    topic: text("topic"),
    university: text("university").notNull(),
    likes: integer("likes").notNull().default(0),
    comments: integer("comments").notNull().default(0),
    reposts: integer("reposts").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("posts_created_at_idx").on(table.createdAt),
    index("posts_author_idx").on(table.authorId),
  ],
);

export const postLikesTable = pgTable(
  "post_likes",
  {
    postId: text("post_id")
      .notNull()
      .references(() => postsTable.id),
    profileId: text("profile_id")
      .notNull()
      .references(() => profilesTable.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("post_likes_post_idx").on(table.postId),
    index("post_likes_profile_idx").on(table.profileId),
  ],
);

export const insertUniversitySchema = createInsertSchema(universitiesTable).omit({
  createdAt: true,
});
export const insertProfileSchema = createInsertSchema(profilesTable).omit({
  createdAt: true,
});
export const insertCommunitySchema = createInsertSchema(communitiesTable).omit({
  createdAt: true,
});
export const insertPostSchema = createInsertSchema(postsTable).omit({
  createdAt: true,
  likes: true,
  comments: true,
  reposts: true,
});

export type InsertUniversity = z.infer<typeof insertUniversitySchema>;
export type University = typeof universitiesTable.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profilesTable.$inferSelect;
export type InsertCommunity = z.infer<typeof insertCommunitySchema>;
export type Community = typeof communitiesTable.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof postsTable.$inferSelect;