"use client";

import { useEffect, useState } from "react";

import {
  EMPTY_PRIORITY_CONTACT_DRAFT,
  PriorityContactForm,
  type PriorityContactDraft,
} from "@/components/onboarding/PriorityContactForm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { SOURCE_APP_LABELS, type PriorityContact } from "@/lib/types";

interface PriorityContactsSheetProps {
  open: boolean;
  contacts: PriorityContact[];
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
  onRefresh: () => Promise<void>;
}

export function PriorityContactsSheet({
  open,
  contacts,
  loading = false,
  error = null,
  onClose,
  onRefresh,
}: PriorityContactsSheetProps) {
  const [draft, setDraft] = useState<PriorityContactDraft>(EMPTY_PRIORITY_CONTACT_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setDraft(EMPTY_PRIORITY_CONTACT_DRAFT);
      setEditingId(null);
      setLocalError(null);
    }
  }, [open]);

  function startEdit(contact: PriorityContact) {
    setEditingId(contact.id);
    setDraft({
      name: contact.name,
      apps: contact.apps,
      priority: contact.priority,
      replyWindow: contact.replyWindow,
      notes: contact.notes,
    });
  }

  async function handleSaveNew() {
    setLocalError(null);
    const response = await fetch("/api/priority-contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact: draft }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setLocalError(data.error ?? "Failed to save contact.");
      return;
    }

    setDraft(EMPTY_PRIORITY_CONTACT_DRAFT);
    await onRefresh();
  }

  async function handleUpdate() {
    if (!editingId) return;
    setLocalError(null);

    const response = await fetch(`/api/priority-contacts/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setLocalError(data.error ?? "Failed to update contact.");
      return;
    }

    setEditingId(null);
    setDraft(EMPTY_PRIORITY_CONTACT_DRAFT);
    await onRefresh();
  }

  async function handleDelete(id: string) {
    setLocalError(null);
    const response = await fetch(`/api/priority-contacts/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setLocalError(data.error ?? "Failed to delete contact.");
      return;
    }

    if (editingId === id) {
      setEditingId(null);
      setDraft(EMPTY_PRIORITY_CONTACT_DRAFT);
    }
    await onRefresh();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto rounded-[var(--radius-card)] shadow-sm sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Priority contacts</DialogTitle>
          <DialogDescription>
            Edit who matters most and how quickly you want to reply.
          </DialogDescription>
        </DialogHeader>

        <PriorityContactForm
          value={draft}
          onChange={setDraft}
          onSubmit={() => void (editingId ? handleUpdate() : handleSaveNew())}
          submitLabel={editingId ? "Save changes" : "Add contact"}
          disabled={loading}
        />

        {(error || localError) && (
          <p className="text-sm text-danger">{error ?? localError}</p>
        )}

        <Separator />

        <div className="space-y-2">
          <p className="text-sm text-muted">Saved contacts ({contacts.length})</p>
          {contacts.length === 0 ? (
            <p className="text-sm text-muted">No priority contacts yet.</p>
          ) : (
            <div className="divide-y divide-border border-y border-border">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-start justify-between gap-3 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text">
                      {contact.name}
                      <span className="ml-2 text-xs font-normal text-muted">
                        {contact.priority} · {contact.replyWindow}
                      </span>
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {contact.apps.length > 0
                        ? contact.apps.map((app) => SOURCE_APP_LABELS[app]).join(", ")
                        : "All apps"}
                      {contact.notes ? ` · ${contact.notes}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      disabled={loading}
                      onClick={() => startEdit(contact)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      disabled={loading}
                      onClick={() => void handleDelete(contact.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
