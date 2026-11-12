import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canUseOther } from "@/lib/other";
import AppShell from "@/components/AppShell";
import OtherApp from "@/components/OtherApp";

export const metadata = { title: "Other – Expense Sheet" };

export default async function OtherPage() {
  const session = await auth();
  if (!session?.user || !canUseOther(session.user.email)) redirect("/");

  return (
    <AppShell email={session.user.email ?? ""} error={Boolean(session.error)}>
      <OtherApp />
    </AppShell>
  );
}
