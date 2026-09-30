import { auth, signIn, signOut } from "@/lib/auth";
import SheetApp from "@/components/SheetApp";

export default async function Home() {
  const session = await auth();

  async function handleSignIn() {
    "use server";
    await signIn("google", { redirectTo: "/" });
  }

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
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
    <div className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col p-4 sm:p-6 lg:p-8">
      {/* Top Navbar */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200/70 pb-5 dark:border-zinc-800/70">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-zinc-900 to-zinc-700 text-white shadow-xs dark:from-white dark:to-zinc-200 dark:text-zinc-900">
            <svg
              className="h-5 w-5"
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
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-zinc-900 sm:text-lg dark:text-zinc-100">
                Expense Sheet
              </h1>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800">
                Live Ledger
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Household & shared expense manager
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-600 sm:flex dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
            <span>{session.user.email}</span>
          </div>

          <form action={handleSignOut}>
            <button
              type="submit"
              className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-2xs transition hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-750"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      {session.error ? (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Your Google access needs renewing. Sign out and sign in again to continue.
        </div>
      ) : null}

      <SheetApp
        sheetUrl={process.env.SHEET_URL ?? ""}
        userEmail={session.user.email ?? ""}
      />
    </div>
  );
}
