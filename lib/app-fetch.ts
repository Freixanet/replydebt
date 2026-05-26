import { isStaticHosting } from "./runtime-config";

export async function appFetch(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  if (isStaticHosting()) {
    const { handleStaticRequest } = await import(
      "./static-hosting/handle-request"
    );
    return handleStaticRequest(input, init);
  }

  return fetch(input, init);
}
