"use client";

import dynamic from "next/dynamic";

const HomeClient = dynamic(() => import("@/components/HomeClient"), {
  ssr: false,
  loading: () => (
    <div className="mx-auto w-full max-w-xl px-4 py-10 sm:px-6">
      <p className="text-sm text-zinc-500">Loading…</p>
    </div>
  ),
});

export default function HomeLoader() {
  return <HomeClient />;
}
