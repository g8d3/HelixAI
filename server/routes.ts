import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { querySchema, updateUserSchema, upsertApiKeySchema, upsertModelSchema, upsertPaymentCredentialsSchema, upsertPaymentMethodSchema } from "@shared/schema";
import { ZodError } from "zod";
import { generateResponse, syncAvailableModels } from "./services/models";

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

      // After saving a new API key, sync models from that provider
      try {
        await syncAvailableModels();
      } catch (error) {
        console.error('Error syncing models after API key update:', error);
        // Don't fail the request if sync fails
      }

      res.json(key);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  // Model management
  app.get("/api/models", async (req, res) => {
    const models = await storage.getPublicModels();
    res.json(models);
  });

  app.get("/api/admin/models", async (req, res) => {
    if (!req.isAuthenticated() || !isAdmin(req)) return res.sendStatus(403);
    const models = await storage.getAllModels();
    res.json(models);
  });

  app.post("/api/admin/models/sync", async (req, res) => {
    if (!req.isAuthenticated() || !isAdmin(req)) return res.sendStatus(403);
    try {
      const models = await syncAvailableModels();
      res.json(models);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
    }
  });

  app.post("/api/admin/models", async (req, res) => {
    if (!req.isAuthenticated() || !isAdmin(req)) return res.sendStatus(403);
    try {
      const modelData = upsertModelSchema.parse(req.body);
      const model = await storage.upsertModel(modelData);
      res.json(model);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error("Error creating model:", error);
        res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
      }
    }
  });

  app.patch("/api/admin/models/:id", async (req, res) => {
    if (!req.isAuthenticated() || !isAdmin(req)) return res.sendStatus(403);
    try {
      const modelData = upsertModelSchema.parse(req.body);
      const model = await storage.upsertModel(modelData);
      res.json(model);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error("Error updating model:", error);
        res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
      }
    }
  });

  // Payment Credentials Management
  app.get("/api/admin/payment-credentials", async (req, res) => {
    if (!req.isAuthenticated() || !isAdmin(req)) return res.sendStatus(403);
    const credentials = await storage.getAllPaymentCredentials();
    res.json(credentials);
  });

  app.post("/api/admin/payment-credentials", async (req, res) => {
    if (!req.isAuthenticated() || !isAdmin(req)) return res.sendStatus(403);
    try {
      const credentialsData = upsertPaymentCredentialsSchema.parse(req.body);
      const credentials = await storage.upsertPaymentCredentials(credentialsData);
      res.json(credentials);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error("Error updating payment credentials:", error);
        res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
      }
    }
  });

  // Payment Methods Management
  app.get("/api/admin/payment-methods", async (req, res) => {
    if (!req.isAuthenticated() || !isAdmin(req)) return res.sendStatus(403);
    const methods = await storage.getAllPaymentMethods();
    res.json(methods);
  });

  app.post("/api/admin/payment-methods", async (req, res) => {
    if (!req.isAuthenticated() || !isAdmin(req)) return res.sendStatus(403);
    try {
      const methodData = upsertPaymentMethodSchema.parse(req.body);
      const method = await storage.upsertPaymentMethod(methodData);
      res.json(method);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error("Error updating payment method:", error);
        res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
      }
    }
  });

  // Transaction Management
  app.get("/api/admin/transactions", async (req, res) => {
    if (!req.isAuthenticated() || !isAdmin(req)) return res.sendStatus(403);
    const transactions = await storage.getAllTransactions();
    res.json(transactions);
  });

  // Query route
  app.post("/api/query", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { prompt, model: modelId } = querySchema.parse(req.body);
      const user = req.user!;

      const model = await storage.getModel(modelId);
      if (!model || !model.enabled) {
        return res.status(400).json({ error: "Invalid or disabled model selected" });
      }

      const totalCost = Math.round((model.inputCost + model.outputCost) / 2);
      if (user.credits < totalCost) {
        return res.status(402).json({ error: "Insufficient credits" });
      }

      const { response, tokens } = await generateResponse(prompt, modelId);

      const query = await storage.createQuery({
        userId: user.id,
        prompt,
        model: modelId,
        response,
        inputTokens: tokens.input,
        outputTokens: tokens.output,
        inputCost: Math.round((tokens.input / 1000) * model.inputCost),
        outputCost: Math.round((tokens.output / 1000) * model.outputCost),
        timestamp: new Date(),
      });

      await storage.updateUserCredits(user.id, user.credits - totalCost);

      res.json({
        response,
        tokens,
        totalCost,
        remainingCredits: user.credits - totalCost,
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