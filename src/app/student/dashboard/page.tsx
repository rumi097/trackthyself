import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import EditableName from "@/components/EditableName";
import MasterDashboardClient from "@/components/MasterDashboardClient";
import prisma from "@/lib/prisma";

export default async function StudentDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "STUDENT") {
    redirect("/login");
  }

  // Fetch the latest user data from DB directly to ensure name updates reflect without re-login
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  const currentName = user?.name || session.user.name || "Student";

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full overflow-y-auto pb-24 h-full hide-scrollbar">
        <EditableName initialName={currentName} />
        
        <div className="mt-8">
          <MasterDashboardClient />
        </div>

      </main>
    </div>
  );
}