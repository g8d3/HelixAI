import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  credits: integer("credits").notNull().default(100),
});

export const queries = pgTable("queries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  prompt: text("prompt").notNull(),
  model: text("model").notNull(),
  response: text("response").notNull(),
  tokens: integer("tokens").notNull(),
  cost: integer("cost").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const querySchema = z.object({
  prompt: z.string().min(1).max(1000),
  model: z.enum(["gpt-3.5-turbo", "gpt-4", "claude-2", "palm-2"]),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Query = typeof queries.$inferSelect;
export type InsertQuery = typeof queries.$inferInsert;
