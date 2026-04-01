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
    const { isCompleted } = json;
    const taskId = getTaskId(request, { id });

    if (!taskId) {
      return new NextResponse("Task ID is required", { status: 400 });
    }

    if (typeof isCompleted !== "boolean") {
      return new NextResponse("Invalid payload", { status: 400 });
    }

    const result = await prisma.task.updateMany({
      where: { id: taskId, studentId: session.user.id },
      data: { isCompleted },
    });

    if (result.count === 0) {
      return new NextResponse("Not found", { status: 404 });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

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
