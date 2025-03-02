import { pgTable, text, serial, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
  inputCost: integer("input_cost").notNull(),
  outputCost: integer("output_cost").notNull(),
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
  providerId: text("provider_id").notNull(),
  displayName: text("display_name").notNull(),
  provider: text("provider").notNull(),
  inputCost: integer("input_cost").notNull(),
  outputCost: integer("output_cost").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  isPublic: boolean("is_public").notNull().default(false),
  contextWindow: integer("context_window"),
  maxTokens: integer("max_tokens"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const paymentCredentials = pgTable("payment_credentials", {
  id: serial("id").primaryKey(),
  provider: text("provider").notNull().unique(), 
  credentials: jsonb("credentials").notNull(), 
  enabled: boolean("enabled").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), 
  provider: text("provider").notNull(), 
  type: text("type").notNull(), 
  minAmount: integer("min_amount").notNull(), 
  enabled: boolean("enabled").notNull().default(true),
  settings: jsonb("settings").notNull(), 
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: integer("amount").notNull(), 
  credits: integer("credits").notNull(), 
  paymentMethod: text("payment_method").notNull(), 
  provider: text("provider").notNull(), 
  status: text("status").notNull(), 
  providerTransactionId: text("provider_transaction_id"), 
  metadata: jsonb("metadata"), 
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const querySchema = z.object({
  prompt: z.string().min(1).max(1000),
  model: z.string().min(1),
});

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
  inputCost: z.number().min(0),
  outputCost: z.number().min(0),
  enabled: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  contextWindow: z.number().int().nullish(),
  maxTokens: z.number().int().nullish(),
});

export const upsertPaymentCredentialsSchema = z.object({
  provider: z.enum(["stripe", "coinbase", "direct"]),
  credentials: z.record(z.unknown()),
  enabled: z.boolean().optional(),
});

export const upsertPaymentMethodSchema = z.object({
  name: z.string().min(1),
  provider: z.enum(["stripe", "coinbase", "direct"]),
  type: z.enum(["crypto", "fiat"]),
  minAmount: z.number().int().min(0),
  enabled: z.boolean().optional(),
  settings: z.record(z.unknown()),
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
export type PaymentCredentials = typeof paymentCredentials.$inferSelect;
export type UpsertPaymentCredentials = z.infer<typeof upsertPaymentCredentialsSchema>;
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type UpsertPaymentMethod = z.infer<typeof upsertPaymentMethodSchema>;
export type Transaction = typeof transactions.$inferSelect;