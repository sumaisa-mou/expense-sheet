"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether the Other tab is revealed in the nav. Hidden by default; kept for
 * the browser tab's lifetime only, so a fresh open of the app starts hidden.
 * Only ever rendered for the Other owner (decided on the server).
 */
const KEY = "other-nav";
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useOtherRevealed(): boolean {
  return useSyncExternalStore(subscribe, read, () => false);
}

function toggle() {
  try {
    if (read()) sessionStorage.removeItem(KEY);
    else sessionStorage.setItem(KEY, "1");
  } catch {
    // Storage blocked: the tab simply stays hidden.
  }
  listeners.forEach((l) => l());
}

/** The navbar email chip, acting as the show/hide switch for the Other tab. */
export default function OtherToggle({ email }: { email: string }) {
  const revealed = useOtherRevealed();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={revealed}
      className="flex max-w-[45vw] cursor-default items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-600 sm:max-w-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400" />
      <span className="truncate">{email}</span>
    </button>
  );
}
