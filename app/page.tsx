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
      <main className="flex min-h-dvh items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h1 className="text-xl font-semibold">Expense Sheet</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Add rows to any Google Sheet you own, from anywhere.
          </p>
          <form action={handleSignIn} className="mt-6">
            <button
              type="submit"
              className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Sign in with Google
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col p-4 sm:p-6">
      <header className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-lg font-semibold">Expense Sheet</h1>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-zinc-500 sm:inline dark:text-zinc-400">
            {session.user.email}
          </span>
          <form action={handleSignOut}>
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      {session.error ? (
        <p className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Your Google access needs renewing. Sign out and sign in again to
          continue.
        </p>
      ) : null}

      <SheetApp />
    </div>
  );
}
