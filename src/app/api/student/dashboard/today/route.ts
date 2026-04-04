import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    // Carry forward yesterday's incomplete daily tasks without mutating historical records.
    const pendingCarry = await prisma.task.findMany({
      where: {
        studentId: session.user.id,
        type: "SINGLE_DAY",
        completionPercent: { lt: 100 },
        date: { gte: yesterday, lt: today },
      },
      orderBy: { date: "asc" },
    });

    if (pendingCarry.length > 0) {
      await prisma.$transaction(async (tx) => {
        for (const task of pendingCarry) {
          const carryLinkKey = task.linkKey?.trim() || `carry:${task.id}`;

          if (!task.linkKey) {
            await tx.task.update({
              where: { id: task.id },
              data: { linkKey: carryLinkKey },
            });
          }

          const existingTodayCarry = await tx.task.findFirst({
            where: {
              studentId: session.user.id,
              type: "SINGLE_DAY",
              date: { gte: today, lte: endOfDay },
              OR: [
                { linkKey: carryLinkKey },
                {
                  linkKey: null,
                  title: task.title,
                  chapterId: task.chapterId,
                  startTime: task.startTime,
                  endTime: task.endTime,
                },
              ],
            },
          });

          if (!existingTodayCarry) {
            await tx.task.create({
              data: {
                studentId: session.user.id,
                title: task.title,
                chapterId: task.chapterId,
                linkKey: carryLinkKey,
                type: "SINGLE_DAY",
                date: today,
                startTime: task.startTime,
                endTime: task.endTime,
                completionPercent: task.completionPercent,
                isCompleted: task.completionPercent >= 100,
              },
            });
          }
        }
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
    const completed = tasks.filter((t) => t.completionPercent >= 100).length;
    const percentage = total > 0 ? tasks.reduce((acc, t) => acc + t.completionPercent, 0) / total : 0;

    return NextResponse.json({ tasks, percentage, total, completed });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
