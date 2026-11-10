import { auth, signIn } from "@/lib/auth";
import SheetApp from "@/components/SheetApp";
import AppShell from "@/components/AppShell";

export default async function Home() {
  const session = await auth();

  async function handleSignIn() {
    "use server";
    await signIn("google", { redirectTo: "/" });
  }

  if (!session?.user) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-950">
        <div className="w-full max-w-sm rounded-3xl border border-zinc-200/90 bg-white p-8 text-center shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-zinc-900 to-zinc-700 text-white shadow-md dark:from-white dark:to-zinc-200 dark:text-zinc-900">
            <svg
              className="h-7 w-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Expense Sheet
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Add rows and track shared expenses directly in your Google Sheet.
          </p>
          <form action={handleSignIn} className="mt-6">
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-zinc-800 active:scale-[0.99] dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
            >
              <span>Sign in with Google</span>
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <AppShell email={session.user.email ?? ""} error={Boolean(session.error)}>
      <SheetApp
        sheetUrl={process.env.SHEET_URL ?? ""}
        userEmail={session.user.email ?? ""}
      />
    </AppShell>
  );
}
