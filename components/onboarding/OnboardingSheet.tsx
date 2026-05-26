"use client";

import { useState } from "react";

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
import { SOURCE_APP_LABELS } from "@/lib/types";

type OnboardingStep = "welcome" | "contacts" | "review";

interface OnboardingSheetProps {
  open: boolean;
  loading?: boolean;
  error?: string | null;
  onComplete: (contacts: PriorityContactDraft[]) => Promise<void>;
  onSkip: () => Promise<void>;
}

export function OnboardingSheet({
  open,
  loading = false,
  error = null,
  onComplete,
  onSkip,
}: OnboardingSheetProps) {
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [draft, setDraft] = useState<PriorityContactDraft>(EMPTY_PRIORITY_CONTACT_DRAFT);
  const [contacts, setContacts] = useState<PriorityContactDraft[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  function resetDraft() {
    setDraft(EMPTY_PRIORITY_CONTACT_DRAFT);
    setEditingIndex(null);
  }

  function handleAddOrUpdateContact() {
    if (!draft.name.trim()) return;

    if (editingIndex !== null) {
      setContacts((current) =>
        current.map((entry, index) =>
          index === editingIndex ? { ...draft, name: draft.name.trim() } : entry,
        ),
      );
    } else {
      setContacts((current) => [...current, { ...draft, name: draft.name.trim() }]);
    }

    resetDraft();
  }

  function handleEditContact(index: number) {
    setDraft(contacts[index]!);
    setEditingIndex(index);
  }

  function handleRemoveContact(index: number) {
    setContacts((current) => current.filter((_, entryIndex) => entryIndex !== index));
    if (editingIndex === index) {
      resetDraft();
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-h-[92vh] max-w-lg overflow-y-auto rounded-[var(--radius-card)] shadow-sm sm:max-w-lg"
        showCloseButton={false}
        onPointerDownOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        {step === "welcome" && (
          <>
            <DialogHeader>
              <DialogTitle>Who matters most?</DialogTitle>
              <DialogDescription>
                Add priority contacts with expected reply windows. Everything
                stays on this device.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                disabled={loading}
                onClick={() => setStep("contacts")}
                className="flex-1"
              >
                Set up priority contacts
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => void onSkip()}
              >
                Skip for now
              </Button>
            </div>
          </>
        )}

        {step === "contacts" && (
          <>
            <DialogHeader>
              <DialogTitle>Add priority contacts</DialogTitle>
              <DialogDescription>
                Add people you never want to leave hanging.
              </DialogDescription>
            </DialogHeader>

            <PriorityContactForm
              value={draft}
              onChange={setDraft}
              onSubmit={handleAddOrUpdateContact}
              submitLabel={editingIndex !== null ? "Update contact" : "Add contact"}
              disabled={loading}
            />

            {contacts.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted">Added ({contacts.length})</p>
                <div className="divide-y divide-border border-y border-border">
                  {contacts.map((contact, index) => (
                    <div
                      key={`${contact.name}-${index}`}
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
                          onClick={() => handleEditContact(index)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          disabled={loading}
                          onClick={() => handleRemoveContact(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && <p className="text-sm text-danger">{error}</p>}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                disabled={loading}
                onClick={() => setStep("review")}
                className="flex-1"
              >
                Continue
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => void onSkip()}
              >
                Skip
              </Button>
            </div>
          </>
        )}

        {step === "review" && (
          <>
            <DialogHeader>
              <DialogTitle>Ready to go</DialogTitle>
              <DialogDescription>
                {contacts.length === 0
                  ? "You can add priority contacts later from settings."
                  : `${contacts.length} priority contact${contacts.length === 1 ? "" : "s"} will be saved locally.`}
              </DialogDescription>
            </DialogHeader>

            {contacts.length > 0 && (
              <ul className="divide-y divide-border border-y border-border text-sm text-text">
                {contacts.map((contact, index) => (
                  <li key={`${contact.name}-${index}`} className="px-3 py-2">
                    {contact.name} · {contact.priority} · {contact.replyWindow}
                  </li>
                ))}
              </ul>
            )}

            {error && <p className="text-sm text-danger">{error}</p>}

            <Button
              type="button"
              disabled={loading}
              onClick={() => void onComplete(contacts)}
              className="w-full"
            >
              {loading ? "Saving…" : "Finish setup"}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
