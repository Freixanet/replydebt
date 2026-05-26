import type { SourceApp } from "@/lib/types";

const APP_DOT_CLASS: Record<SourceApp, string> = {
  whatsapp: "bg-app-whatsapp",
  telegram: "bg-app-telegram",
  instagram: "bg-app-instagram",
  messenger: "bg-app-messenger",
  messages: "bg-app-messages",
};

interface AppDotProps {
  app: SourceApp;
}

export function AppDot({ app }: AppDotProps) {
  return (
    <span
      className={`size-2 shrink-0 rounded-full ${APP_DOT_CLASS[app]}`}
      aria-hidden
    />
  );
}
