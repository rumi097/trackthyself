import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return new NextResponse("Unauthorized", { status: 401 });

    const exams = await prisma.exam.findMany({
      where: { studentId: session.user.id },
      include: {
        subject: true
      },
      orderBy: { date: 'asc' }
    });

    return NextResponse.json(exams);
  } catch (error) {
    return new NextResponse("Internal server error", { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return new NextResponse("Unauthorized", { status: 401 });

    const json = await request.json();
    const { title, date, subjectId, totalMarks, obtainedMarks, notes } = json;

    if (!title || !date || !subjectId || isNaN(totalMarks)) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const exam = await prisma.exam.create({
      data: {
        studentId: session.user.id,
        title,
        date: new Date(date),
        subjectId,
        totalMarks: Number(totalMarks),
        obtainedMarks: isNaN(Number(obtainedMarks)) ? 0 : Number(obtainedMarks),
        notes: notes || null
      },
      include: {
        subject: true
      }
    });

    return NextResponse.json(exam);
  } catch (error) {
    return new NextResponse("Internal server error", { status: 500 });
  }
}