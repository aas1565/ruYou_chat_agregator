import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { stripHtmlToText } from "@/lib/services/knowledge-parser.service";

const FETCH_TIMEOUT_MS = 10000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return true;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (normalized.startsWith("fe80")) return true;
  if (normalized.startsWith("::ffff:")) {
    const mapped = normalized.slice("::ffff:".length);
    if (isIP(mapped) === 4) return isPrivateIpv4(mapped);
  }
  return false;
}

function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (!host) return true;
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return true;
  if (host === "0.0.0.0" || host === "127.0.0.1" || host === "::1") return true;
  if (host === "metadata.google.internal") return true;
  return false;
}

async function assertSafeUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Некорректный URL");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Разрешены только протоколы http и https");
  }

  if (parsed.username || parsed.password) {
    throw new Error("URL с учётными данными запрещён");
  }

  const hostname = parsed.hostname;
  if (isBlockedHostname(hostname)) {
    throw new Error("Обращение к локальным и внутренним адресам запрещено");
  }

  const ipVersion = isIP(hostname);
  if (ipVersion === 4 && isPrivateIpv4(hostname)) {
    throw new Error("Обращение к приватным IP-адресам запрещено");
  }
  if (ipVersion === 6 && isPrivateIpv6(hostname)) {
    throw new Error("Обращение к приватным IP-адресам запрещено");
  }

  if (ipVersion === 0) {
    const records = await lookup(hostname, { all: true, verbatim: true });
    if (!records.length) {
      throw new Error("Не удалось разрешить hostname");
    }
    for (const record of records) {
      if (record.family === 4 && isPrivateIpv4(record.address)) {
        throw new Error("Обращение к приватным IP-адресам запрещено");
      }
      if (record.family === 6 && isPrivateIpv6(record.address)) {
        throw new Error("Обращение к приватным IP-адресам запрещено");
      }
    }
  }

  return parsed;
}

export async function fetchPublicPageText(rawUrl: string): Promise<{ url: string; text: string; title: string }> {
  const safeUrl = await assertSafeUrl(rawUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(safeUrl.toString(), {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "User-Agent": "RuyouKnowledgeBot/1.0",
        Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
      },
    });

    if (response.status >= 300 && response.status < 400) {
      throw new Error("Редиректы URL на этом этапе не поддерживаются");
    }

    if (!response.ok) {
      throw new Error(`Не удалось загрузить страницу (HTTP ${response.status})`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (
      !contentType.includes("text/html") &&
      !contentType.includes("text/plain") &&
      !contentType.includes("application/xhtml")
    ) {
      throw new Error("Поддерживаются только HTML и текстовые страницы");
    }

    const contentLength = Number(response.headers.get("content-length") ?? "0");
    if (contentLength > MAX_RESPONSE_BYTES) {
      throw new Error("Размер ответа превышает допустимый лимит");
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Пустой ответ сервера");
    }

    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        throw new Error("Размер ответа превышает допустимый лимит");
      }
      chunks.push(value);
    }

    const buffer = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
    const raw = buffer.toString("utf8");
    const titleMatch = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch?.[1]?.replace(/\s+/g, " ").trim() || safeUrl.hostname;
    const text = stripHtmlToText(raw);
    if (!text) {
      throw new Error("На странице не найден читаемый текст");
    }

    return { url: safeUrl.toString(), text, title };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Превышено время ожидания загрузки URL");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
