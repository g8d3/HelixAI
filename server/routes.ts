import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { querySchema, updateUserSchema, upsertApiKeySchema } from "@shared/schema";
import { ZodError } from "zod";
import { generateResponse, MODEL_CONFIGS } from "./services/models";

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

  // API Key management
  app.get("/api/admin/api-keys", async (req, res) => {
    if (!req.isAuthenticated() || !isAdmin(req)) return res.sendStatus(403);
    const keys = await storage.getAllApiKeys();
    res.json(keys);
  });

  app.post("/api/admin/api-keys", async (req, res) => {
    if (!req.isAuthenticated() || !isAdmin(req)) return res.sendStatus(403);
    try {
      const keyData = upsertApiKeySchema.parse(req.body);
      const key = await storage.upsertApiKey(keyData);
      res.json(key);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  // Query route
  app.post("/api/query", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { prompt, model } = querySchema.parse(req.body);
      const user = req.user!;

      const modelConfig = MODEL_CONFIGS[model];
      if (!modelConfig) {
        return res.status(400).json({ error: "Invalid model selected" });
      }

      if (user.credits < modelConfig.cost) {
        return res.status(402).json({ error: "Insufficient credits" });
      }

      const { response, tokens } = await generateResponse(prompt, model);

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
        console.error("Error processing query:", error);
        res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
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