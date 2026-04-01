import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const userRole = (session.user as { role?: string }).role || "STUDENT";

  if (userRole === "ADMIN") {
    redirect("/admin/dashboard");
  }

  redirect("/student/dashboard");
}

