import { NextResponse } from "next/server";

import {
  createPriorityContactsBatch,
  listPriorityContacts,
  type CreatePriorityContactInput,
} from "@/lib/db/priority-contact-queries";
import {
  type Priority,
  REPLY_WINDOW_OPTIONS,
  SOURCE_APPS,
  isSourceApp,
  type ReplyWindow,
} from "@/lib/types";

function isPriority(value: string): value is Priority {
  return value === "high" || value === "medium" || value === "low";
}

function isReplyWindow(value: string): value is ReplyWindow {
  return (REPLY_WINDOW_OPTIONS as readonly string[]).includes(value);
}

function parseCreateInput(raw: unknown): CreatePriorityContactInput | null {
  if (!raw || typeof raw !== "object") return null;

  const body = raw as Record<string, unknown>;
  if (typeof body.name !== "string" || !body.name.trim()) return null;
  if (!isPriority(String(body.priority))) return null;
  if (!isReplyWindow(String(body.replyWindow))) return null;

  const appsRaw = body.apps;
  const apps = Array.isArray(appsRaw)
    ? appsRaw.filter((value): value is (typeof SOURCE_APPS)[number] =>
        isSourceApp(String(value)),
      )
    : [];

  return {
    name: body.name.trim(),
    apps,
    priority: body.priority as Priority,
    replyWindow: body.replyWindow as ReplyWindow,
    notes: typeof body.notes === "string" ? body.notes : "",
  };
}

export async function GET() {
  try {
    const contacts = listPriorityContacts();
    return NextResponse.json({ contacts });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load priority contacts.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { contacts?: unknown[]; contact?: unknown };

    const inputs: CreatePriorityContactInput[] = [];

    if (Array.isArray(body.contacts)) {
      for (const entry of body.contacts) {
        const parsed = parseCreateInput(entry);
        if (!parsed) {
          return NextResponse.json(
            { error: "Invalid contact in batch." },
            { status: 400 },
          );
        }
        inputs.push(parsed);
      }
    } else if (body.contact) {
      const parsed = parseCreateInput(body.contact);
      if (!parsed) {
        return NextResponse.json(
          { error: "Invalid contact payload." },
          { status: 400 },
        );
      }
      inputs.push(parsed);
    } else {
      return NextResponse.json(
        { error: "Missing contact or contacts." },
        { status: 400 },
      );
    }

    const contacts =
      inputs.length === 1
        ? [createPriorityContactsBatch(inputs)[0]]
        : createPriorityContactsBatch(inputs);

    return NextResponse.json({ contacts });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create priority contact.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
