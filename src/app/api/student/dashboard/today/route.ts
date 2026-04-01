import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    // Carry over at most one past incomplete daily task to today.
    const pendingCarry = await prisma.task.findFirst({
      where: {
        studentId: session.user.id,
        type: "SINGLE_DAY",
        isCompleted: false,
        date: { lt: today },
      },
      orderBy: { date: "asc" },
    });

    if (pendingCarry) {
      await prisma.task.update({
        where: { id: pendingCarry.id },
        data: { date: today },
      });
    }

    const tasks = await prisma.task.findMany({
      where: {
        studentId: session.user.id,
        type: "SINGLE_DAY",
        date: { gte: today, lte: endOfDay },
      },
      orderBy: { startTime: 'asc' },
      include: { chapter: { include: { subject: true } } }
    });

    const total = tasks.length;
    const completed = tasks.filter(t => t.isCompleted).length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;

    return NextResponse.json({ tasks, percentage, total, completed });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
