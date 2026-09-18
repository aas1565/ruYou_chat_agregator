import { z } from "zod";

export const aiAnswerSchema = z.object({
  canAnswer: z.boolean(),
  answer: z.string().nullable(),
  reason: z.string().nullable().optional(),
});

export type AiAnswerPayload = z.infer<typeof aiAnswerSchema>;

export type AiChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AiCompletionResult = {
  content: string;
  model: string;
  latencyMs: number;
};

function getAiConfig() {
  const provider = (process.env.AI_PROVIDER || "").trim().toLowerCase() || "openai";
  const gatewayApiKey = process.env.AMAZI_AI_GATEWAY_OPENAI_API_KEY?.trim() || "";
  const localApiKey = process.env.AI_API_KEY?.trim() || "";
  const apiKey = gatewayApiKey || (process.env.NODE_ENV === "production" ? "" : localApiKey);
  const model = process.env.AI_MODEL?.trim() || "gpt-4o-mini";
  const gatewayBaseUrl = process.env.AMAZI_AI_GATEWAY_OPENAI_BASE_URL?.trim() || "";
  const localBaseUrl = process.env.AI_BASE_URL?.trim() || "https://api.openai.com/v1";
  const baseUrl = (
    gatewayBaseUrl || (process.env.NODE_ENV === "production" ? "" : localBaseUrl)
  ).replace(/\/$/, "");
  return { provider, apiKey, model, baseUrl };
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI вернул ответ без JSON");
    return JSON.parse(match[0]);
  }
}

async function callOpenAiCompatible(
  messages: AiChatMessage[],
  config: { apiKey: string; model: string; baseUrl: string },
): Promise<AiCompletionResult> {
  if (!config.apiKey) {
    throw new Error("Ключ AI API не задан");
  }
  if (!config.baseUrl) {
    throw new Error("Адрес AI API не задан");
  }

  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API недоступен (HTTP ${response.status})`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      model?: string;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("AI API вернул пустой ответ");
    }

    return {
      content,
      model: payload.model || config.model,
      latencyMs: Date.now() - started,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Превышено время ожидания AI API");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function mockCompletion(messages: AiChatMessage[], model: string): AiCompletionResult {
  const started = Date.now();
  const userMessage = [...messages].reverse().find((item) => item.role === "user")?.content ?? "";
  const knowledgeBlock =
    messages.find((item) => item.role === "system" && item.content.includes("БАЗА ЗНАНИЙ"))
      ?.content ?? "";

  const query = userMessage.toLocaleLowerCase("ru-RU");
  const knowledgeLower = knowledgeBlock.toLocaleLowerCase("ru-RU");

  const queryKeywords = query
    .replace(/[^a-zа-яё0-9\s-]/gi, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4);

  const distinctive = queryKeywords.filter(
    (token) =>
      ![
        "есть",
        "услуга",
        "услуги",
        "можно",
        "скажите",
        "подскажите",
        "сегодня",
        "работаете",
        "сколько",
        "какой",
        "какая",
        "какие",
        "ваше",
        "ваша",
        "новый",
        "сообщение",
        "клиента",
        "недоверенный",
        "контент",
      ].includes(token),
  );

  const coveredDistinctive = distinctive.filter((token) => knowledgeLower.includes(token));
  const coverageOk =
    distinctive.length === 0 || coveredDistinctive.length >= Math.min(1, distinctive.length);

  const hoursSnippet =
    knowledgeBlock
      .split("\n")
      .map((line) => line.trim())
      .find((line) => /\d{1,2}:\d{2}/.test(line) && /(пн|вт|ср|чт|пт|сб|вс|режим|работа)/i.test(line)) ||
    knowledgeBlock
      .split("\n")
      .map((line) => line.trim())
      .find((line) => /пн|09:00|21:00/i.test(line) && !line.startsWith("["));

  const hasHours =
    /работа|режим|час|открыт|закрыт|доскольк|график|до скольк/.test(query) &&
    /(пн|вт|ср|чт|пт|сб|вс|09:00|21:00|режим|работа)/.test(knowledgeLower);
  const hasPrice =
    /цена|стоим|сколько|прайс/.test(query) &&
    /цена|стоим|₽|руб|от /.test(knowledgeLower) &&
    coverageOk;
  const hasAddress =
    /адрес|где|наход|локац/.test(query) &&
    /адрес|улиц|ленина|офис/.test(knowledgeLower);
  const hasFaqEvening = /вечер|запис/.test(query) && /до 21:00|работа/.test(knowledgeLower);
  const asksService = /услуг|сервис|делаете|шиномонтаж/.test(query);
  const knownServiceInQuery =
    /шиномонтаж|балансиров|мойк|масл|диагностик/.test(query) &&
    /шиномонтаж|балансиров|мойк|масл|диагностик/.test(knowledgeLower);

  let payload: AiAnswerPayload;

  if (hasHours || hasFaqEvening) {
    const hoursLine = (hoursSnippet || "Пн–Пт 09:00–21:00")
      .replace(/^\[.*?\]\s*/, "")
      .replace(/^[-*]\s*/, "")
      .trim();
    payload = {
      canAnswer: true,
      answer: `Мы работаем по графику: ${hoursLine}. Если нужна запись на конкретное время — уточните удобный день.`,
      reason: null,
    };
  } else if (hasAddress) {
    const addressLine =
      knowledgeBlock
        .split("\n")
        .map((line) => line.trim())
        .find((line) => /улиц|ленина|адрес/i.test(line) && !line.startsWith("["))
        ?.replace(/^[-*]\s*/, "")
        .trim() || "ул. Ленина, 10";
    payload = {
      canAnswer: true,
      answer: `Наш адрес: ${addressLine}.`,
      reason: null,
    };
  } else if (hasPrice) {
    const priceLine =
      knowledgeBlock
        .split("\n")
        .map((line) => line.trim())
        .find((line) => /от |₽|руб|цена/i.test(line) && !line.startsWith("["))
        ?.replace(/^[-*]\s*/, "")
        .trim() || "стоимость уточняется у оператора";
    payload = {
      canAnswer: true,
      answer: `По стоимости: ${priceLine}.`,
      reason: null,
    };
  } else if (asksService && knownServiceInQuery) {
    payload = {
      canAnswer: true,
      answer: "Да, такая услуга есть. Могу подсказать детали по режиму работы и записи.",
      reason: null,
    };
  } else {
    payload = {
      canAnswer: false,
      answer: null,
      reason: "Недостаточно информации в базе знаний",
    };
  }

  return {
    content: JSON.stringify(payload),
    model,
    latencyMs: Date.now() - started,
  };
}

export async function completeAiChat(messages: AiChatMessage[]): Promise<AiCompletionResult> {
  const config = getAiConfig();

  if (config.provider === "mock") {
    return mockCompletion(messages, config.model || "mock");
  }

  return callOpenAiCompatible(messages, config);
}

export function parseAiAnswer(content: string): AiAnswerPayload {
  const parsed = extractJsonObject(content);
  const result = aiAnswerSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error("AI вернул невалидный JSON");
  }

  if (result.data.canAnswer) {
    const answer = result.data.answer?.trim();
    if (!answer) {
      return {
        canAnswer: false,
        answer: null,
        reason: result.data.reason || "Пустой ответ AI",
      };
    }
    return { ...result.data, answer };
  }

  return {
    canAnswer: false,
    answer: null,
    reason: result.data.reason || "Недостаточно информации в базе знаний",
  };
}

export function getConfiguredAiModel() {
  return getAiConfig().model;
}
