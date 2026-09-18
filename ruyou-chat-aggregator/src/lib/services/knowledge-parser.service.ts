import mammoth from "mammoth";
import * as XLSX from "xlsx";

const CHUNK_SIZE = 1200;
const CHUNK_OVERLAP = 150;

export function normalizeExtractedText(text: string): string {
  return text
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function splitIntoChunks(text: string): string[] {
  const normalized = normalizeExtractedText(text);
  if (!normalized) return [];

  const paragraphs = normalized.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if ((current + "\n\n" + paragraph).trim().length <= CHUNK_SIZE) {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
      continue;
    }

    if (current) {
      chunks.push(current);
      const overlap = current.slice(Math.max(0, current.length - CHUNK_OVERLAP));
      current = overlap ? `${overlap}\n\n${paragraph}` : paragraph;
    } else {
      for (let i = 0; i < paragraph.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
        chunks.push(paragraph.slice(i, i + CHUNK_SIZE));
      }
      current = "";
    }

    if (current.length > CHUNK_SIZE) {
      chunks.push(current.slice(0, CHUNK_SIZE));
      current = current.slice(CHUNK_SIZE - CHUNK_OVERLAP);
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks.filter((chunk) => chunk.length > 0);
}

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    const text = normalizeExtractedText(result.text ?? "");
    if (!text) {
      throw new Error("В PDF не найден извлекаемый текст. OCR на этом этапе не поддерживается.");
    }
    return text;
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  const text = normalizeExtractedText(result.value ?? "");
  if (!text) {
    throw new Error("В DOCX не найден текст.");
  }
  return text;
}

export async function extractTextFromXlsx(buffer: Buffer): Promise<string> {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const parts: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const rows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(sheet, {
      header: 1,
      defval: "",
      raw: false,
    });
    const lines = rows
      .map((row) => row.map((cell) => String(cell ?? "").trim()).filter(Boolean).join(" | "))
      .filter(Boolean);
    if (lines.length > 0) {
      parts.push(`Лист: ${sheetName}\n${lines.join("\n")}`);
    }
  }

  const text = normalizeExtractedText(parts.join("\n\n"));
  if (!text) {
    throw new Error("В XLSX не найден текст.");
  }
  return text;
}

export function stripHtmlToText(html: string): string {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<(nav|header|footer|aside)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  const withBreaks = withoutScripts
    .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|tr|br|section|article)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

  return normalizeExtractedText(withBreaks);
}
