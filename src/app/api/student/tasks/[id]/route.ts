import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

function getTaskId(request: NextRequest, params?: { id?: string }) {
  return params?.id || request.nextUrl.pathname.split("/").pop() || "";
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return new NextResponse("Unauthorized", { status: 401 });

    const json = await request.json();
    const { isCompleted, title, startTime, endTime, chapterId, date, completionPercent } = json;
    const taskId = getTaskId(request, { id });

    if (!taskId) {
      return new NextResponse("Task ID is required", { status: 400 });
    }

    const updateData: {
      isCompleted?: boolean;
      title?: string;
      startTime?: string;
      endTime?: string;
      chapterId?: string | null;
      date?: Date | null;
      completionPercent?: number;
    } = {};

    if (typeof isCompleted === "boolean") {
      updateData.isCompleted = isCompleted;
      updateData.completionPercent = isCompleted ? 100 : 0;
    }

    if (typeof completionPercent === "number") {
      const normalizedPercent = Math.min(100, Math.max(0, completionPercent));
      updateData.completionPercent = normalizedPercent;
      updateData.isCompleted = normalizedPercent >= 100;
    }

    if (typeof title === "string") {
      updateData.title = title.trim();
    }

    if (typeof startTime === "string") {
      updateData.startTime = startTime;
    }

    if (typeof endTime === "string") {
      updateData.endTime = endTime;
    }

    if (chapterId === null || typeof chapterId === "string") {
      updateData.chapterId = chapterId;
    }

    if (date === null || typeof date === "string") {
      updateData.date = date ? new Date(date) : null;
    }

    if (Object.keys(updateData).length === 0) {
      return new NextResponse("Invalid payload", { status: 400 });
    }

    const result = await prisma.task.updateMany({
      where: { id: taskId, studentId: session.user.id },
      data: updateData,
    });

    if (result.count === 0) {
      return new NextResponse("Not found", { status: 404 });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (task && task.type === "SINGLE_DAY" && task.date && task.completionPercent < 100) {
      const nextDayStart = new Date(task.date);
      nextDayStart.setDate(nextDayStart.getDate() + 1);
      nextDayStart.setHours(0, 0, 0, 0);

      const nextDayEnd = new Date(nextDayStart);
      nextDayEnd.setHours(23, 59, 59, 999);

      const existingNextDay = await prisma.task.findFirst({
        where: {
          studentId: session.user.id,
          type: "SINGLE_DAY",
          title: task.title,
          chapterId: task.chapterId,
          date: { gte: nextDayStart, lte: nextDayEnd },
        },
      });

      if (!existingNextDay) {
        await prisma.task.create({
          data: {
            studentId: task.studentId,
            title: task.title,
            chapterId: task.chapterId,
            type: "SINGLE_DAY",
            date: nextDayStart,
            startTime: task.startTime,
            endTime: task.endTime,
            completionPercent: task.completionPercent,
            isCompleted: false,
          },
        });
      }
    }

    return NextResponse.json(task);
  } catch {
    return new NextResponse("Internal server error", { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return new NextResponse("Unauthorized", { status: 401 });

    const taskId = getTaskId(request, { id });

    if (!taskId) {
      return new NextResponse("Task ID is required", { status: 400 });
    }

    const result = await prisma.task.deleteMany({
      where: { id: taskId, studentId: session.user.id },
    });

    if (result.count === 0) {
      return new NextResponse("Not found", { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse("Internal server error", { status: 500 });
  }
}
