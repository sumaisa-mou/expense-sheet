import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import SanchayApp from "@/components/SanchayApp";

export const metadata = { title: "Sanchaypatro – Expense Sheet" };

export default async function SanchayPage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  return (
    <AppShell email={session.user.email ?? ""} error={Boolean(session.error)}>
      <SanchayApp />
    </AppShell>
  );
}
