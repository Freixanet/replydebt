"use client";

import { forwardRef } from "react";

interface DashboardSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export const DashboardSearch = forwardRef<HTMLInputElement, DashboardSearchProps>(
  function DashboardSearch({ value, onChange }, ref) {
    return (
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search contacts or previews…"
        className="w-full rounded-[var(--radius)] border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
      />
    );
  },
);
