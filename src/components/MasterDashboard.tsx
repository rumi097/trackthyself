"use client";

import { useState } from "react";
import TodayRoutine from "@/components/TodayRoutine";
import RoutineTabs from "@/components/RoutineTabs";
import { ExamTracker } from "@/components/ExamTracker";
import PomodoroTimer from "@/components/PomodoroTimer";
import CountdownWidget from "@/components/CountdownWidget";
import { CalendarRange, TrendingUp, Presentation } from "lucide-react";

export default function MasterDashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "planner" | "exams">("overview");

  const panelClass = (tab: "overview" | "planner" | "exams") =>
    activeTab === tab
      ? "block opacity-100 translate-y-0 transition-all duration-200"
      : "hidden";

  return (
    <div className="w-full">
      <div className="flex border-b border-gray-700 mb-8 overflow-x-auto hide-scrollbar">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center py-3 px-6 text-sm font-medium transition whitespace-nowrap ${
            activeTab === "overview" ? "border-b-2 border-blue-500 text-blue-400" : "text-gray-400 hover:text-gray-300"
          }`}
        >
          <Presentation className="w-4 h-4 mr-2" />
          Today&apos;s Dashboard
        </button>

        <button
          onClick={() => setActiveTab("planner")}
          className={`flex items-center py-3 px-6 text-sm font-medium transition whitespace-nowrap ${
            activeTab === "planner" ? "border-b-2 border-blue-500 text-blue-400" : "text-gray-400 hover:text-gray-300"
          }`}
        >
          <CalendarRange className="w-4 h-4 mr-2" />
          Routine Planner
        </button>

        <button
          onClick={() => setActiveTab("exams")}
          className={`flex items-center py-3 px-6 text-sm font-medium transition whitespace-nowrap ${
            activeTab === "exams" ? "border-b-2 border-emerald-500 text-emerald-400" : "text-gray-400 hover:text-gray-300"
          }`}
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          Exam Analytics
        </button>

      </div>

      <div>
        <section className={panelClass("overview")}>
          <p className="mb-6 text-gray-400">Track and manage what&apos;s on your plate for today.</p>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
            <div className="xl:col-span-2">
              <TodayRoutine />
            </div>
            <div className="space-y-4 sticky top-4">
              <CountdownWidget />
              <PomodoroTimer compact />
            </div>
          </div>
        </section>

        <section className={panelClass("planner")}>
          <p className="mb-6 text-gray-400">Map out your week and schedule your daily study chunks.</p>
          <RoutineTabs />
        </section>

        <section className={panelClass("exams")}>
          <p className="mb-6 text-gray-400">Log your marks and track your progress over time visually.</p>
          <ExamTracker />
        </section>
      </div>
    </div>
  );
}