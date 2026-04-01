"use client";

import { useState } from "react";
import { WeeklyPlanner } from "@/components/WeeklyPlanner";
import { DailyPlanner } from "@/components/DailyPlanner";

export default function RoutineTabs() {
  const [tab, setTab] = useState<"weekly" | "daily">("daily");

  const panelClass = (current: "weekly" | "daily") =>
    tab === current
      ? "block opacity-100 translate-y-0 transition-all duration-200"
      : "hidden";

  return (
    <div>
      <div className="flex border-b border-gray-700 mb-6">
        <button
          onClick={() => setTab("daily")}
          className={`py-3 px-6 text-lg font-medium transition ${
            tab === "daily" ? "border-b-2 border-blue-500 text-blue-400" : "text-gray-400 hover:text-gray-300"
          }`}
        >
          Daily Routine (Time Blocks)
        </button>
        <button
          onClick={() => setTab("weekly")}
          className={`py-3 px-6 text-lg font-medium transition ${
            tab === "weekly" ? "border-b-2 border-blue-500 text-blue-400" : "text-gray-400 hover:text-gray-300"
          }`}
        >
          Weekly Overview
        </button>
      </div>

      <div>
        <section className={panelClass("daily")}>
          <DailyPlanner />
        </section>

        <section className={panelClass("weekly")}>
          <WeeklyPlanner />
        </section>
      </div>
    </div>
  );
}