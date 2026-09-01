import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { getSession } from "@/lib/auth";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/admin/dashboard");
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <LoginForm />
    </div>
  );
}
