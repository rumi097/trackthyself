import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return new NextResponse("Unauthorized", { status: 401 });

    const json = await request.json();
    const { title, chapterId, type, dayOfWeek, date, startTime, endTime } = json;

    const task = await prisma.task.create({
      data: {
        studentId: session.user.id,
        title,
        chapterId: chapterId || null,
        type,
        dayOfWeek: dayOfWeek !== undefined ? dayOfWeek : null,
        date: date ? new Date(date) : null,
        startTime,
        endTime
      }
    });

    return NextResponse.json(task);
  } catch (error) {
    return new NextResponse("Internal server error", { status: 500 });
  }
}
