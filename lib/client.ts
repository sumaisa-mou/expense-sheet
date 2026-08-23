/** Fetch JSON and turn a non-2xx into a thrown Error carrying the API message. */
export async function fetchJson<T>(
  input: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, init);

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // Fall through to the status-based message below.
  }

  if (!response.ok) {
    const message =
      (payload as { error?: string } | null)?.error ??
      `Request failed (${response.status}).`;
    throw new Error(message);
  }

  return payload as T;
}
