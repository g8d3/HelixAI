import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export interface ModelConfig {
  cost: number;
  provider: "openai" | "anthropic" | "palm";
}

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  credits: integer("credits").notNull().default(100),
  isAdmin: boolean("is_admin").notNull().default(false),
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

export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  provider: text("provider").notNull().unique(),
  apiKey: text("api_key").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const models = pgTable("models", {
  id: serial("id").primaryKey(),
  providerId: text("provider_id").notNull(), // e.g., "gpt-4" for OpenAI
  displayName: text("display_name").notNull(),
  provider: text("provider").notNull(), // openai, anthropic, palm
  cost: integer("cost").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  contextWindow: integer("context_window"),
  maxTokens: integer("max_tokens"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const querySchema = z.object({
  prompt: z.string().min(1).max(1000),
  model: z.string().min(1), // Now accepts any model ID from the models table
});

// Admin schemas
export const updateUserSchema = z.object({
  credits: z.number().int().min(0),
  isAdmin: z.boolean().optional(),
});

export const upsertApiKeySchema = z.object({
  provider: z.enum(["openai", "anthropic", "palm"]),
  apiKey: z.string().min(1),
});

export const upsertModelSchema = z.object({
  providerId: z.string().min(1),
  displayName: z.string().min(1),
  provider: z.enum(["openai", "anthropic", "palm"]),
  cost: z.number().int().min(1),
  enabled: z.boolean().optional(),
  contextWindow: z.number().int().optional(),
  maxTokens: z.number().int().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Query = typeof queries.$inferSelect;
export type InsertQuery = typeof queries.$inferInsert;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type ApiKey = typeof apiKeys.$inferSelect;
export type UpsertApiKey = z.infer<typeof upsertApiKeySchema>;
export type Model = typeof models.$inferSelect;
export type UpsertModel = z.infer<typeof upsertModelSchema>;