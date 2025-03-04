import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { type ModelConfig } from "@shared/schema";
import { storage } from "../storage";

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

async function fetchOpenAIModels() {
  const client = await getClient("openai") as OpenAI;
  const response = await client.models.list();

  return response.data
    .filter(model => model.id.includes('gpt'))
    .map(model => {
      // Determine costs based on model ID
      let inputCost, outputCost;
      if (model.id.includes('gpt-4')) {
        if (model.id.includes('turbo')) {
          inputCost = 1000;  // $0.01/1K tokens
          outputCost = 3000; // $0.03/1K tokens
        } else {
          inputCost = 3000;  // $0.03/1K tokens
          outputCost = 6000; // $0.06/1K tokens
        }
      } else {
        // GPT-3.5 pricing
        inputCost = 150;   // $0.0015/1K tokens
        outputCost = 200;  // $0.002/1K tokens
      }

      return {
        providerId: model.id,
        displayName: model.id.split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' '),
        provider: 'openai' as const,
        inputCost,
        outputCost,
        contextWindow: 128000, // Updated to latest context windows
        maxTokens: 128000,
      };
    });
}

async function fetchAnthropicModels() {
  // Anthropic doesn't have a models endpoint yet, return known models
  return [
    {
      providerId: 'claude-2',
      displayName: 'Claude 2',
      provider: 'anthropic' as const,
      inputCost: 1100, // $0.011/1K input tokens
      outputCost: 3200, // $0.032/1K output tokens
      contextWindow: 100000,
      maxTokens: 100000,
    },
    {
      providerId: 'claude-instant-1',
      displayName: 'Claude Instant',
      provider: 'anthropic' as const,
      inputCost: 163,  // $0.00163/1K input tokens
      outputCost: 550, // $0.0055/1K output tokens
      contextWindow: 100000,
      maxTokens: 100000,
    },
  ];
}

async function fetchPaLMModels() {
  // PaLM/Gemini doesn't have a models endpoint yet, return known models
  return [
    {
      providerId: 'gemini-pro',
      displayName: 'Gemini Pro',
      provider: 'palm' as const,
      inputCost: 100,  // $0.001/1K input tokens
      outputCost: 200, // $0.002/1K output tokens
      contextWindow: 8192,
      maxTokens: 8192,
    },
  ];
}

export async function syncAvailableModels() {
  try {
    const models = [];
    const providers = ['openai', 'anthropic', 'palm'];

    for (const provider of providers) {
      try {
        const apiKey = await storage.getApiKey(provider);
        if (!apiKey) {
          console.log(`Skipping ${provider} - no API key configured`);
          continue;
        }

        console.log(`Fetching models from ${provider}...`);
        let providerModels;
        switch (provider) {
          case 'openai':
            providerModels = await fetchOpenAIModels();
            break;
          case 'anthropic':
            providerModels = await fetchAnthropicModels();
            break;
          case 'palm':
            providerModels = await fetchPaLMModels();
            break;
        }

        if (providerModels?.length) {
          console.log(`Found ${providerModels.length} models from ${provider}`);
          models.push(...providerModels);
        }
      } catch (error) {
        console.error(`Error fetching models from ${provider}:`, error);
      }
    }

    // Update models in database
    for (const model of models) {
      try {
        await storage.upsertModel({
          ...model,
          enabled: true,
        });
      } catch (error) {
        console.error(`Error upserting model ${model.providerId}:`, error);
      }
    }

    return models;
  } catch (error) {
    console.error('Error syncing models:', error);
    throw error;
  }
}

export async function generateResponse(
  prompt: string,
  model: string,
): Promise<{ response: string; tokens: number }> {
  const modelConfig = await storage.getModel(model);
  if (!modelConfig) {
    throw new Error(`Unsupported model: ${model}`);
  }

  try {
    const client = await getClient(modelConfig.provider);

    switch (modelConfig.provider) {
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
          max_tokens: modelConfig.maxTokens ?? undefined,
          messages: [{ role: "user", content: prompt }],
        });
        return {
          response: message.content[0].text,
          // Estimate tokens until Anthropic provides usage info
          tokens: Math.ceil(prompt.length / 4) + Math.ceil(message.content[0].text.length / 4),
        };
      }

      case "palm": {
        const model = (client as GoogleGenerativeAI).getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent(prompt);
        const response = result.response.text();
        return {
          response,
          // Estimate tokens until PaLM provides usage info
          tokens: Math.ceil(prompt.length / 4) + Math.ceil(response.length / 4),
        };
      }

      default:
        throw new Error(`Unsupported provider: ${modelConfig.provider}`);
    }
  } catch (error: any) {
    console.error(`Error calling ${modelConfig.provider} API:`, error);
    throw new Error(`Failed to generate response: ${error.message}`);
  }
}