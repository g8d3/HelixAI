import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { querySchema, updateUserSchema } from "@shared/schema";
import { ZodError } from "zod";

const MOCK_MODELS = {
  "gpt-3.5-turbo": { cost: 5, maxLength: 50 },
  "gpt-4": { cost: 20, maxLength: 100 },
  "claude-2": { cost: 15, maxLength: 75 },
  "palm-2": { cost: 10, maxLength: 60 },
};

function generateMockResponse(prompt: string, model: string): string {
  const config = MOCK_MODELS[model as keyof typeof MOCK_MODELS];
  const words = prompt.split(" ");
  const truncatedPrompt = words.slice(0, config.maxLength).join(" ");
  return `${model} response to: ${truncatedPrompt}`;
}

function isAdmin(req: Express.Request) {
  return req.user?.isAdmin === true;
}

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Admin routes
  app.get("/api/admin/users", async (req, res) => {
    if (!req.isAuthenticated() || !isAdmin(req)) return res.sendStatus(403);
    const users = await storage.getAllUsers();
    res.json(users);
  });

  app.patch("/api/admin/users/:id", async (req, res) => {
    if (!req.isAuthenticated() || !isAdmin(req)) return res.sendStatus(403);
    try {
      const updates = updateUserSchema.parse(req.body);
      const user = await storage.updateUser(parseInt(req.params.id), updates);
      res.json(user);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  app.get("/api/admin/queries", async (req, res) => {
    if (!req.isAuthenticated() || !isAdmin(req)) return res.sendStatus(403);
    const queries = await storage.getAllQueries();
    res.json(queries);
  });

  // Existing routes
  app.post("/api/query", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { prompt, model } = querySchema.parse(req.body);
      const user = req.user!;

      const modelConfig = MOCK_MODELS[model as keyof typeof MOCK_MODELS];
      if (user.credits < modelConfig.cost) {
        return res.status(402).json({ error: "Insufficient credits" });
      }

      const response = generateMockResponse(prompt, model);
      const tokens = prompt.length + response.length;

      const query = await storage.createQuery({
        userId: user.id,
        prompt,
        model,
        response,
        tokens,
        cost: modelConfig.cost,
        timestamp: new Date(),
      });

      await storage.updateUserCredits(user.id, user.credits - modelConfig.cost);

      res.json({
        response,
        tokens,
        cost: modelConfig.cost,
        remainingCredits: user.credits - modelConfig.cost,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  app.get("/api/queries", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const queries = await storage.getUserQueries(req.user!.id);
    res.json(queries);
  });

  const httpServer = createServer(app);
  return httpServer;
}