import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { type ModelConfig } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const palm = new GoogleGenerativeAI(process.env.PALM_API_KEY!);

export const MODEL_CONFIGS: Record<string, ModelConfig> = {
  "gpt-3.5-turbo": { cost: 5, provider: "openai" },
  "gpt-4": { cost: 20, provider: "openai" },
  "claude-2": { cost: 15, provider: "anthropic" },
  "palm-2": { cost: 10, provider: "palm" },
};

export async function generateResponse(
  prompt: string,
  model: string,
): Promise<{ response: string; tokens: number }> {
  const config = MODEL_CONFIGS[model];
  if (!config) {
    throw new Error(`Unsupported model: ${model}`);
  }

  try {
    switch (config.provider) {
      case "openai": {
        const completion = await openai.chat.completions.create({
          model,
          messages: [{ role: "user", content: prompt }],
        });
        return {
          response: completion.choices[0]?.message?.content || "",
          tokens: completion.usage?.total_tokens || 0,
        };
      }

      case "anthropic": {
        const message = await anthropic.messages.create({
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
        const model = palm.getGenerativeModel({ model: "gemini-pro" });
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
