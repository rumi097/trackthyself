import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return new NextResponse("Unauthorized", { status: 401 });

    const tasks = await prisma.task.findMany({
      where: {
        studentId: session.user.id,
      },
      orderBy: { startTime: 'asc' },
      include: { chapter: { include: { subject: true } } }
    });

    return NextResponse.json(tasks);
  } catch (error) {
    return new NextResponse("Internal server error", { status: 500 });
  }
}
