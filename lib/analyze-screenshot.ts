import {
  GoogleGenerativeAI,
  SchemaType,
  type ResponseSchema,
} from "@google/generative-ai";

import { getAnalyzeMode } from "./analyze-config";
import { classifyAndFilterItems } from "./classify-items";
import { getMockRawModelOutput } from "./fixtures/mock-analysis";
import { parseModelOutput } from "./parse-model-output";
import { buildAnalysisPrompt } from "./prompts/index";
import {
  applyPriorityBoost,
  matchPriorityContact,
} from "./priority-contacts";
import { listPriorityContacts } from "./db/priority-contact-queries";
import { type AnalysisResult, type SourceApp } from "./types";

const MODEL_NAME = "gemini-2.5-flash";

const responseSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    items: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          app: {
            type: SchemaType.STRING,
            format: "enum",
            enum: ["whatsapp", "telegram", "instagram", "messenger", "messages"],
          },
          contactName: { type: SchemaType.STRING },
          preview: { type: SchemaType.STRING },
          timestampText: { type: SchemaType.STRING },
          likelyLastSender: {
            type: SchemaType.STRING,
            format: "enum",
            enum: ["me", "them", "unknown"],
          },
          confidence: { type: SchemaType.NUMBER },
          reason: { type: SchemaType.STRING },
        },
        required: [
          "contactName",
          "preview",
          "timestampText",
          "likelyLastSender",
          "confidence",
          "reason",
        ],
      },
    },
  },
  required: ["items"],
};

export function buildFailedResult(
  sourceApp: SourceApp,
  rawModelOutput: string,
  warnings: string[],
): AnalysisResult {
  return {
    sourceApp,
    items: [],
    analyzedAt: new Date().toISOString(),
    rawModelOutput,
    warnings,
    parseStatus: "failed",
  };
}

export function analyzeFromRawText(
  rawText: string,
  sourceApp: SourceApp,
): AnalysisResult {
  if (!rawText.trim()) {
    return buildFailedResult(sourceApp, rawText, [
      "The model response was empty.",
    ]);
  }

  const parsed = parseModelOutput(rawText, sourceApp);
  const priorityContacts = listPriorityContacts();
  const classified = classifyAndFilterItems(
    parsed.rawItems,
    sourceApp,
    priorityContacts,
  );
  const warnings = [...parsed.warnings, ...classified.warnings];

  const boostedItems = classified.items.map((item) => {
    const match = matchPriorityContact(
      item.contactName,
      sourceApp,
      priorityContacts,
    );
    return match ? applyPriorityBoost(item, match) : item;
  });

  if (parsed.status === "failed") {
    return buildFailedResult(sourceApp, parsed.rawText, warnings);
  }

  return {
    sourceApp,
    items: boostedItems,
    analyzedAt: new Date().toISOString(),
    rawModelOutput: parsed.rawText,
    warnings: warnings.length > 0 ? warnings : undefined,
    parseStatus: parsed.status,
  };
}

export async function analyzeScreenshot(
  imageBuffer: Buffer,
  mimeType: string,
  sourceApp: SourceApp,
): Promise<AnalysisResult> {
  if (process.env.DEBUG_FORCE_INVALID_JSON === "1") {
    return buildFailedResult(sourceApp, "{ not valid json", [
      "Forced invalid JSON for testing.",
    ]);
  }

  if (getAnalyzeMode() === "mock") {
    return analyzeFromRawText(getMockRawModelOutput(sourceApp), sourceApp);
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GOOGLE_AI_API_KEY is not configured. Add it to .env.local, or set ANALYZE_MODE=mock for local testing.",
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0.2,
    },
  });

  const prompt = buildAnalysisPrompt(sourceApp);
  const imageBase64 = imageBuffer.toString("base64");

  const result = await model.generateContent([
    { text: prompt },
    {
      inlineData: {
        mimeType,
        data: imageBase64,
      },
    },
  ]);

  const rawText = result.response.text();
  if (!rawText) {
    return buildFailedResult(sourceApp, "", [
      "The vision model returned an empty response.",
    ]);
  }

  return analyzeFromRawText(rawText, sourceApp);
}
