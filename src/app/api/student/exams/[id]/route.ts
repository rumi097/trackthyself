import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return new NextResponse("Unauthorized", { status: 401 });

    const existing = await prisma.exam.findUnique({
      where: { id },
      select: { id: true, studentId: true },
    });

    if (!existing || existing.studentId !== session.user.id) {
      return new NextResponse("Not found", { status: 404 });
    }

    const json = await request.json();
    const { obtainedMarks, totalMarks, notes } = json;

    const exam = await prisma.exam.update({
      where: { id },
      data: {
        obtainedMarks: typeof obtainedMarks === "number" ? obtainedMarks : undefined,
        totalMarks: typeof totalMarks === "number" ? totalMarks : undefined,
        notes: typeof notes === "string" ? notes : undefined,
      },
      include: { subject: true },
    });

    return NextResponse.json(exam);
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

    // Idempotent delete scoped to current student to avoid stale-client race errors.
    await prisma.exam.deleteMany({
      where: {
        id,
        studentId: session.user.id,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse("Internal server error", { status: 500 });
  }
}