import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return new NextResponse("Unauthorized", { status: 401 });

    const subjects = await prisma.subject.findMany({
      include: {
        chapters: {
          orderBy: { order: 'asc' }
        }
      }
    });

    return NextResponse.json(subjects);
  } catch (error) {
    return new NextResponse("Internal server error", { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return new NextResponse("Unauthorized", { status: 401 });

    const body = await request.json();
    const { subjectName, chapterName, subjectId } = body;

    let targetSubjectId = subjectId;

    if (subjectName && !targetSubjectId) {
      const newSub = await prisma.subject.create({
        data: { name: subjectName, isDefault: false },
      });
      targetSubjectId = newSub.id;
    }

    if (targetSubjectId && chapterName) {
      await prisma.chapter.create({
        data: {
          name: chapterName,
          subjectId: targetSubjectId,
          isDefault: false,
        },
      });
    }

    // Return the updated list
    const subjects = await prisma.subject.findMany({
      include: {
        chapters: {
          orderBy: { order: 'asc' }
        }
      }
    });

    return NextResponse.json(subjects);
  } catch (error) {
    return new NextResponse("Internal server error", { status: 500 });
  }
}
