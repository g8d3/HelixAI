import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { type ModelConfig } from "@shared/schema";
import { storage } from "../storage";

export const MODEL_CONFIGS: Record<string, ModelConfig> = {
  "gpt-3.5-turbo": { cost: 5, provider: "openai" },
  "gpt-4": { cost: 20, provider: "openai" },
  "claude-2": { cost: 15, provider: "anthropic" },
  "palm-2": { cost: 10, provider: "palm" },
};

async function getClient(provider: string) {
  const apiKey = await storage.getApiKey(provider);
  if (!apiKey) {
    throw new Error(`No API key configured for provider: ${provider}`);
  }

  switch (provider) {
    case "openai":
      return new OpenAI({ apiKey });
    case "anthropic":
      return new Anthropic({ apiKey });
    case "palm":
      return new GoogleGenerativeAI(apiKey);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

export async function generateResponse(
  prompt: string,
  model: string,
): Promise<{ response: string; tokens: number }> {
  const config = MODEL_CONFIGS[model];
  if (!config) {
    throw new Error(`Unsupported model: ${model}`);
  }

  try {
    const client = await getClient(config.provider);

    switch (config.provider) {
      case "openai": {
        const completion = await (client as OpenAI).chat.completions.create({
          model,
          messages: [{ role: "user", content: prompt }],
        });
        return {
          response: completion.choices[0]?.message?.content || "",
          tokens: completion.usage?.total_tokens || 0,
        };
      }

      case "anthropic": {
        const message = await (client as Anthropic).messages.create({
          model: "claude-2",
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
        });
        return {
          response: message.content[0].text,
          tokens: Math.ceil(prompt.length / 4) + Math.ceil(message.content[0].text.length / 4),
        };
      }

      case "palm": {
        const model = (client as GoogleGenerativeAI).getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateText(prompt);
        const response = result.response.text();
        return {
          response,
          tokens: Math.ceil(prompt.length / 4) + Math.ceil(response.length / 4),
        };
      }

      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
  } catch (error: any) {
    console.error(`Error calling ${config.provider} API:`, error);
    throw new Error(`Failed to generate response: ${error.message}`);
  }
}