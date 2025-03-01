import { users, queries, apiKeys, models, type User, type InsertUser, type Query, type InsertQuery, type UpdateUser, type ApiKey, type UpsertApiKey, type Model, type UpsertModel } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserCredits(userId: number, credits: number): Promise<void>;
  createQuery(query: InsertQuery): Promise<Query>;
  getUserQueries(userId: number): Promise<Query[]>;
  // Admin operations
  getAllUsers(): Promise<User[]>;
  getAllQueries(): Promise<Query[]>;
  updateUser(userId: number, updates: UpdateUser): Promise<User>;
  // API Key operations
  getApiKey(provider: string): Promise<string | null>;
  upsertApiKey(key: UpsertApiKey): Promise<ApiKey>;
  getAllApiKeys(): Promise<ApiKey[]>;
  // Model operations
  getAllModels(): Promise<Model[]>;
  getEnabledModels(): Promise<Model[]>;
  getModel(providerId: string): Promise<Model | undefined>;
  upsertModel(model: UpsertModel): Promise<Model>;
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({ ...insertUser, credits: 100 })
      .returning();
    return user;
  }

  async updateUserCredits(userId: number, credits: number): Promise<void> {
    await db
      .update(users)
      .set({ credits })
      .where(eq(users.id, userId));
  }

  async createQuery(query: InsertQuery): Promise<Query> {
    const [newQuery] = await db
      .insert(queries)
      .values(query)
      .returning();
    return newQuery;
  }

  async getUserQueries(userId: number): Promise<Query[]> {
    return db
      .select()
      .from(queries)
      .where(eq(queries.userId, userId))
      .orderBy(queries.timestamp);
  }

  // Admin operations
  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async getAllQueries(): Promise<Query[]> {
    return db.select().from(queries).orderBy(queries.timestamp);
  }

  async updateUser(userId: number, updates: UpdateUser): Promise<User> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // API Key operations
  async getApiKey(provider: string): Promise<string | null> {
    const [key] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.provider, provider));
    return key?.apiKey ?? null;
  }

  async upsertApiKey(key: UpsertApiKey): Promise<ApiKey> {
    const [existing] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.provider, key.provider));

    if (existing) {
      const [updated] = await db
        .update(apiKeys)
        .set({ apiKey: key.apiKey, updatedAt: new Date() })
        .where(eq(apiKeys.provider, key.provider))
        .returning();
      return updated;
    }

    const [newKey] = await db
      .insert(apiKeys)
      .values({ ...key, updatedAt: new Date() })
      .returning();
    return newKey;
  }

  async getAllApiKeys(): Promise<ApiKey[]> {
    return db.select().from(apiKeys);
  }

  // Model operations
  async getAllModels(): Promise<Model[]> {
    return db.select().from(models).orderBy(models.provider, models.displayName);
  }

  async getEnabledModels(): Promise<Model[]> {
    return db
      .select()
      .from(models)
      .where(eq(models.enabled, true))
      .orderBy(models.provider, models.displayName);
  }

  async getModel(providerId: string): Promise<Model | undefined> {
    const [model] = await db
      .select()
      .from(models)
      .where(eq(models.providerId, providerId));
    return model;
  }

  async upsertModel(model: UpsertModel): Promise<Model> {
    const [existing] = await db
      .select()
      .from(models)
      .where(eq(models.providerId, model.providerId));

    if (existing) {
      const [updated] = await db
        .update(models)
        .set({ ...model, updatedAt: new Date() })
        .where(eq(models.providerId, model.providerId))
        .returning();
      return updated;
    }

    const [newModel] = await db
      .insert(models)
      .values({ ...model, updatedAt: new Date() })
      .returning();
    return newModel;
  }
}

export const storage = new DatabaseStorage();