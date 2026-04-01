"use client";

import { useState, useEffect } from "react";
import { Users, BookOpen, Brain, TrendingUp, Search, Award } from "lucide-react";

type StudentSummary = {
  id: string;
  name: string;
  identifier: string;
  targetUniversity: string;
  totalFocusMinutes: number;
  currentStreak: number;
  taskStats: {
    total: number;
    completed: number;
    completionRate: number;
  };
  examStats: {
    total: number;
    avgScore: number;
  };
};

export default function AdminDashboard() {
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await fetch("/api/admin/students");
      if (res.ok) {
        const data = await res.json();
        setStudents(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.identifier.toLowerCase().includes(search.toLowerCase()) ||
      s.targetUniversity.toLowerCase().includes(search.toLowerCase())
  );

  const getPerformanceColor = (rate: number) => {
    if (rate >= 80) return "text-emerald-600 bg-emerald-50";
    if (rate >= 50) return "text-amber-600 bg-amber-50";
    return "text-rose-600 bg-rose-50";
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Stats Summary */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Users className="w-6 h-6 mr-2 text-indigo-600" />
            Student Cohort
          </h2>
          <p className="text-gray-500">Track and monitor all registered students.</p>
        </div>

        <div className="relative w-full md:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 sm:text-sm"
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex items-center">
          <div className="p-3 rounded-full bg-blue-50 text-blue-600 mr-4">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Students</p>
            <p className="text-2xl font-bold text-gray-900">{students.length}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex items-center">
          <div className="p-3 rounded-full bg-emerald-50 text-emerald-600 mr-4">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Avg Completion</p>
            <p className="text-2xl font-bold text-gray-900">
              {students.length > 0
                ? Math.round(
                    students.reduce((acc, s) => acc + s.taskStats.completionRate, 0) /
                      students.length
                  )
                : 0}
              %
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex items-center">
          <div className="p-3 rounded-full bg-indigo-50 text-indigo-600 mr-4">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Avg Focus Time</p>
            <p className="text-2xl font-bold text-gray-900">
              {students.length > 0
                ? Math.round(
                    students.reduce((acc, s) => acc + s.totalFocusMinutes, 0) /
                      students.length
                  )
                : 0}
              m
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex items-center">
          <div className="p-3 rounded-full bg-orange-50 text-orange-600 mr-4">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Avg Exam Score</p>
            <p className="text-2xl font-bold text-gray-900">
              {students.length > 0
                ? Math.round(
                    students.reduce((acc, s) => acc + s.examStats.avgScore, 0) /
                      students.length
                  )
                : 0}
              %
            </p>
          </div>
        </div>
      </div>

      {/* Cohort Core Table */}
      <div className="bg-white shadow overflow-hidden border border-gray-200 sm:rounded-lg">
        <ul className="divide-y divide-gray-200">
          <li className="px-6 py-4 bg-gray-50 grid grid-cols-12 gap-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <div className="col-span-3">Student</div>
            <div className="col-span-2 text-center">Focus Time</div>
            <div className="col-span-3 text-center">Task Completion</div>
            <div className="col-span-2 text-center">Avg Exam Submissions</div>
            <div className="col-span-2 text-center">Streak</div>
          </li>
          
          {filteredStudents.length === 0 ? (
            <li className="px-6 py-8 text-center text-gray-500">
              No students matched your search.
            </li>
          ) : (
            filteredStudents.map((student) => {
              const taskStats = student.taskStats;
              const examStats = student.examStats;
              return (
              <li key={student.id} className="px-6 py-4 grid grid-cols-12 gap-4 items-center hover:bg-gray-50 transition">
                <div className="col-span-3">
                  <p className="text-sm font-bold text-gray-900 truncate">{student.name}</p>
                  <p className="text-xs text-gray-500 truncate">{student.targetUniversity}</p>
                </div>
                
                <div className="col-span-2 text-center flex flex-col justify-center items-center">
                  <div className="text-lg font-semibold text-indigo-600">
                    {Math.floor(student.totalFocusMinutes / 60)}h {student.totalFocusMinutes % 60}m
                  </div>
                </div>

                <div className="col-span-3">
                  <div className="flex flex-col justify-center items-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPerformanceColor(
                        taskStats.completionRate
                      )}`}
                    >
                      {taskStats.completionRate}%
                    </span>
                    <span className="text-xs text-gray-400 mt-1">
                      {taskStats.completed} / {taskStats.total} Tasks
                    </span>
                  </div>
                </div>

                <div className="col-span-2 text-center flex flex-col justify-center items-center">
                  <div className={`text-lg font-bold ${getPerformanceColor(examStats.avgScore) } bg-transparent p-0`}>
                    {examStats.avgScore}%
                  </div>
                  <span className="text-xs text-gray-400">
                    from {examStats.total} exams
                  </span>
                </div>

                <div className="col-span-2 text-center flex flex-col justify-center items-center">
                  <div className="flex items-center space-x-1 text-orange-500">
                    <Award className="w-5 h-5" />
                    <span className="font-bold text-gray-900">{student.currentStreak} Days</span>
                  </div>
                </div>
              </li>
            )})
          )}
        </ul>
      </div>
    </div>
  );
}
