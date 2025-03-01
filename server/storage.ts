import { users, queries, type User, type InsertUser, type Query, type InsertQuery } from "@shared/schema";
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
}

export const storage = new DatabaseStorage();