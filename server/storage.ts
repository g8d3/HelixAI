import { type User, type InsertUser, type Query, type InsertQuery } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserCredits(userId: number, credits: number): Promise<void>;
  createQuery(query: InsertQuery): Promise<Query>;
  getUserQueries(userId: number): Promise<Query[]>;
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private queries: Map<number, Query>;
  private currentUserId: number;
  private currentQueryId: number;
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.queries = new Map();
    this.currentUserId = 1;
    this.currentQueryId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id, credits: 100 };
    this.users.set(id, user);
    return user;
  }

  async updateUserCredits(userId: number, credits: number): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    this.users.set(userId, { ...user, credits });
  }

  async createQuery(query: InsertQuery): Promise<Query> {
    const id = this.currentQueryId++;
    const newQuery = { ...query, id } as Query;
    this.queries.set(id, newQuery);
    return newQuery;
  }

  async getUserQueries(userId: number): Promise<Query[]> {
    return Array.from(this.queries.values()).filter(
      (query) => query.userId === userId,
    );
  }
}

export const storage = new MemStorage();
