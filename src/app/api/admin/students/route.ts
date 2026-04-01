import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const students = await prisma.user.findMany({
      where: { role: "STUDENT" },
      select: {
        id: true,
        name: true,
        identifier: true,
        profile: {
          select: {
            targetUniversity: true,
            totalFocusMinutes: true,
            currentStreak: true,
          },
        },
        tasks: {
          select: {
            id: true,
            isCompleted: true,
          },
        },
        exams: {
          select: {
            id: true,
            totalMarks: true,
            obtainedMarks: true,
            subject: {
              select: { name: true },
            },
          },
        },
      },
    });

    const enrichedStudents = students.map((student) => {
      const totalTasks = student.tasks.length;
      const completedTasks = student.tasks.filter((t) => t.isCompleted).length;
      const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      const totalExams = student.exams.length;
      const avgExamScore =
        totalExams > 0
          ? student.exams.reduce(
              (acc, exam) => acc + (exam.obtainedMarks / exam.totalMarks) * 100,
              0
            ) / totalExams
          : 0;

      return {
        id: student.id,
        name: student.name,
        identifier: student.identifier,
        targetUniversity: student.profile?.targetUniversity || "Not set",
        totalFocusMinutes: student.profile?.totalFocusMinutes || 0,
        currentStreak: student.profile?.currentStreak || 0,
        taskStats: {
          total: totalTasks,
          completed: completedTasks,
          completionRate: Math.round(taskCompletionRate),
        },
        examStats: {
          total: totalExams,
          avgScore: Math.round(avgExamScore),
        },
      };
    });

    return NextResponse.json(enrichedStudents);
  } catch (error) {
    console.error("Error fetching students for admin:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
