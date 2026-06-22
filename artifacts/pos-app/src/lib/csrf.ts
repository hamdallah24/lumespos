import { setCsrfTokenGetter } from "@workspace/api-client-react";

let _token: string | null = null;
let _fetching: Promise<string | null> | null = null;

export async function initCsrf(): Promise<string | null> {
  if (_fetching) return _fetching;
  _fetching = fetch("/api/csrf-token", { credentials: "include" })
    .then((r) => r.json())
    .then((data) => {
      _token = data.token ?? null;
      return _token;
    })
    .catch(() => {
      _token = null;
      return null;
    })
    .finally(() => {
      _fetching = null;
    });
  return _fetching;
}

export function getCsrfToken(): string | null {
  return _token;
}

setCsrfTokenGetter(() => _token);

export async function apiFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers = { ...(options.headers as Record<string, string> | undefined) };
  const method = (options.method ?? "GET").toUpperCase();

  if (!["GET", "HEAD", "OPTIONS"].includes(method) && _token) {
    headers["x-csrf-token"] = _token;
  }

  return fetch(url, {
    ...options,
    credentials: "include",
    headers,
  });
}
