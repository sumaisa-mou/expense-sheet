import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import LoanApp from "@/components/LoanApp";

export const metadata = { title: "Repayments – Expense Sheet" };

export default async function LoanPage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  return (
    <AppShell email={session.user.email ?? ""} error={Boolean(session.error)}>
      <LoanApp />
    </AppShell>
  );
}
