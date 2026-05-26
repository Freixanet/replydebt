import { NextResponse } from "next/server";

import {
  deletePriorityContact,
  updatePriorityContact,
} from "@/lib/db/priority-contact-queries";
import {
  type Priority,
  REPLY_WINDOW_OPTIONS,
  isSourceApp,
  type ReplyWindow,
  type SourceApp,
} from "@/lib/types";

function isPriority(value: string): value is Priority {
  return value === "high" || value === "medium" || value === "low";
}

function isReplyWindow(value: string): value is ReplyWindow {
  return (REPLY_WINDOW_OPTIONS as readonly string[]).includes(value);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;

    const update: {
      name?: string;
      apps?: SourceApp[];
      priority?: Priority;
      replyWindow?: ReplyWindow;
      notes?: string;
    } = {};

    if (typeof body.name === "string" && body.name.trim()) {
      update.name = body.name.trim();
    }
    if (body.priority !== undefined) {
      if (!isPriority(String(body.priority))) {
        return NextResponse.json({ error: "Invalid priority." }, { status: 400 });
      }
      update.priority = body.priority as Priority;
    }
    if (body.replyWindow !== undefined) {
      if (!isReplyWindow(String(body.replyWindow))) {
        return NextResponse.json(
          { error: "Invalid reply window." },
          { status: 400 },
        );
      }
      update.replyWindow = body.replyWindow as ReplyWindow;
    }
    if (typeof body.notes === "string") {
      update.notes = body.notes;
    }
    if (Array.isArray(body.apps)) {
      update.apps = body.apps.filter((value): value is SourceApp =>
        isSourceApp(String(value)),
      );
    }

    const contact = updatePriorityContact(id, update);
    if (!contact) {
      return NextResponse.json({ error: "Contact not found." }, { status: 404 });
    }

    return NextResponse.json({ contact });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update priority contact.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const deleted = deletePriorityContact(id);
    if (!deleted) {
      return NextResponse.json({ error: "Contact not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete priority contact.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
