import Anthropic from "@anthropic-ai/sdk";

const DEFAULT_MAIN_MODEL = process.env.ANTHROPIC_MAIN_MODEL || "claude-sonnet-4-6";
const DEFAULT_FAST_MODEL = "claude-3-5-haiku-latest";

let anthropicClient: Anthropic | null = null;

export function getAnthropicClient() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: key });
  }
  return anthropicClient;
}

function extractText(content: Anthropic.Messages.Message["content"]) {
  return content
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
}

export async function runAiJson(params: {
  system?: string;
  prompt: string;
  model?: string;
  maxTokens?: number;
}) {
  const client = getAnthropicClient();
  if (!client) throw new Error("Missing ANTHROPIC_API_KEY");

  const model = params.model || DEFAULT_MAIN_MODEL;
  const response = await client.messages.create({
    model,
    max_tokens: params.maxTokens ?? 1200,
    system: params.system,
    messages: [{ role: "user", content: params.prompt }],
  });

  const raw = extractText(response.content);
  const parsed = JSON.parse(raw);
  return {
    parsed,
    text: raw,
    model: response.model,
    usage: {
      input: response.usage.input_tokens || 0,
      output: response.usage.output_tokens || 0,
    },
  };
}

export async function runAiText(params: {
  system?: string;
  prompt: string;
  model?: string;
  maxTokens?: number;
}) {
  const client = getAnthropicClient();
  if (!client) throw new Error("Missing ANTHROPIC_API_KEY");

  const model = params.model || DEFAULT_MAIN_MODEL;
  const response = await client.messages.create({
    model,
    max_tokens: params.maxTokens ?? 900,
    system: params.system,
    messages: [{ role: "user", content: params.prompt }],
  });

  return {
    text: extractText(response.content),
    model: response.model,
    usage: {
      input: response.usage.input_tokens || 0,
      output: response.usage.output_tokens || 0,
    },
  };
}

export function getSearchModel() {
  return process.env.AI_SEARCH_MODEL || DEFAULT_FAST_MODEL;
}
