import { NextResponse } from "next/server";

import { applyItemAction } from "@/lib/db/actions";
import type { ItemAction, Priority } from "@/lib/types";

const ACTIONS: ItemAction[] = [
  "done",
  "snooze_1h",
  "snooze_24h",
  "ignore_contact",
  "set_priority",
  "restore_contact",
  "reset_status",
];

function isItemAction(value: string): value is ItemAction {
  return (ACTIONS as readonly string[]).includes(value);
}

function isPriority(value: string): value is Priority {
  return value === "high" || value === "medium" || value === "low";
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      action?: string;
      priority?: string;
    };

    if (!body.action || !isItemAction(body.action)) {
      return NextResponse.json(
        { error: "Invalid or missing action." },
        { status: 400 },
      );
    }

    if (body.action === "set_priority") {
      if (!body.priority || !isPriority(body.priority)) {
        return NextResponse.json(
          { error: "Missing or invalid priority for set_priority." },
          { status: 400 },
        );
      }
    }

    const updated = applyItemAction(id, body.action, {
      priority:
        body.priority && isPriority(body.priority) ? body.priority : undefined,
    });

    if (!updated) {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update item.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
