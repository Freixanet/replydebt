export function isStaticHosting(): boolean {
  return process.env.NEXT_PUBLIC_STATIC_HOSTING === "1";
}

export const GITHUB_PAGES_BASE_PATH = "/replydebt";
