import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return new NextResponse("Unauthorized", { status: 401 });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 6);

    const sessions = await prisma.focusSession.findMany({
      where: {
        studentId: session.user.id,
        completedAt: { gte: startDate },
      },
      orderBy: { completedAt: "desc" },
    });

    const byDay = new Map<string, { date: string; sessions: number; minutes: number }>();

    for (const s of sessions) {
      const dayKey = s.completedAt.toISOString().slice(0, 10);
      const existing = byDay.get(dayKey) || { date: dayKey, sessions: 0, minutes: 0 };
      existing.sessions += 1;
      existing.minutes += s.durationMinutes;
      byDay.set(dayKey, existing);
    }

    const history = Array.from(byDay.values()).sort((a, b) => b.date.localeCompare(a.date));
    const todayKey = today.toISOString().slice(0, 10);
    const todaySummary = byDay.get(todayKey) || { date: todayKey, sessions: 0, minutes: 0 };

    return NextResponse.json({
      today: todaySummary,
      history,
    });
  } catch (error) {
    console.error("Focus session summary error:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return new NextResponse("Unauthorized", { status: 401 });

    const json = await request.json();
    const { taskId, durationMinutes } = json;

    if (!durationMinutes) {
      return new NextResponse("Missing duration", { status: 400 });
    }

    // 1. Create the Focus Session log
    const focusSession = await prisma.focusSession.create({
      data: {
        studentId: session.user.id,
        taskId: taskId || null,
        durationMinutes: Number(durationMinutes),
      },
    });

    // 2. Update Student Profile's total focus minutes (Upsert in case they don't have a profile yet)
    await prisma.studentProfile.upsert({
      where: { userId: session.user.id },
      update: {
        totalFocusMinutes: {
          increment: Number(durationMinutes),
        },
      },
      create: {
        userId: session.user.id,
        totalFocusMinutes: Number(durationMinutes),
      },
    });

    return NextResponse.json(focusSession);
  } catch (error) {
    console.error("Focus session save error:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
