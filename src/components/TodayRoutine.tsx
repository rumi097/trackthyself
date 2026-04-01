"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { format, subDays } from "date-fns";

type Task = {
  id: string;
  title: string;
  type?: "SINGLE_DAY" | "WEEKLY_RECURRING";
  date?: string;
  startTime: string;
  endTime: string;
  completionPercent: number;
  isCompleted: boolean;
  chapter?: {
    name: string;
    subject: { name: string };
  };
};

export default function TodayRoutine() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allDailyTasks, setAllDailyTasks] = useState<Task[]>([]);
  const [percentage, setPercentage] = useState(0);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isLoading, setIsLoading] = useState(true);

  const dateWindow = Array.from({ length: 14 }, (_, i) => format(subDays(new Date(), i), "yyyy-MM-dd")).reverse();

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const [todayRes, allRes] = await Promise.all([
        fetch("/api/student/dashboard/today", { cache: "no-store" }),
        fetch("/api/student/tasks/all", { cache: "no-store" }),
      ]);

      if (todayRes.ok) {
        const data = await todayRes.json();
        setTasks(data.tasks);
        setPercentage(data.percentage);
      }

      if (allRes.ok) {
        const data: Task[] = await allRes.json();
        setAllDailyTasks(data.filter((t) => t.type === "SINGLE_DAY" && !!t.date));
      }
    } catch (e) {
      console.error("Failed to fetch today's tasks", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const updateTaskPercent = async (id: string, nextPercent: number) => {
    const safePercent = Math.max(0, Math.min(100, nextPercent));
    const previousTasks = tasks;
    const previousAllDailyTasks = allDailyTasks;
    const previousPercentage = percentage;

    try {
      const updatedTasks = tasks.map((t) =>
        t.id === id ? { ...t, completionPercent: safePercent, isCompleted: safePercent >= 100 } : t
      );
      setTasks(updatedTasks);
      setAllDailyTasks((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, completionPercent: safePercent, isCompleted: safePercent >= 100 } : t
        )
      );

      const total = updatedTasks.length;
      const avg = total > 0 ? updatedTasks.reduce((acc, t) => acc + (t.completionPercent || 0), 0) / total : 0;
      setPercentage(avg);

      const res = await fetch(`/api/student/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completionPercent: safePercent }),
      });

      if (!res.ok) {
        throw new Error("Failed to update task status");
      }
    } catch (e) {
      console.error(e);
      // Revert on failure without reloading whole widget
      setTasks(previousTasks);
      setAllDailyTasks(previousAllDailyTasks);
      setPercentage(previousPercentage);
    }
  };

  const toggleTask = async (id: string, currentPercent: number) => {
    await updateTaskPercent(id, currentPercent >= 100 ? 0 : 100);
  };

  const getDateProgress = (dateKey: string) => {
    const dateTasks = allDailyTasks.filter((task) => task.date && task.date.startsWith(dateKey));
    if (dateTasks.length === 0) return null;
    const totalPercent = dateTasks.reduce((acc, task) => acc + (task.completionPercent || 0), 0);
    return Math.round(totalPercent / dateTasks.length);
  };

  const selectedDateTasks = allDailyTasks
    .filter((task) => task.date && task.date.startsWith(selectedDate))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  if (isLoading) return <div className="animate-pulse h-32 bg-gray-700/50 rounded-xl mt-4"></div>;

  return (
    <>
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-gray-800 p-6 shadow-md border-l-4 border-blue-500">
          <h2 className="text-gray-400 font-semibold text-sm">Today&apos;s Progress</h2>
          <p className="mt-2 text-4xl font-bold">{Math.round(percentage)}%</p>
        </div>
        <div className="rounded-xl bg-gray-800 p-6 shadow-md border-l-4 border-green-500">
          <h2 className="text-gray-400 font-semibold text-sm">Current Streak</h2>
          <p className="mt-2 text-4xl font-bold">1🔥</p>
        </div>
      </div>

      <div className="mt-10 rounded-xl bg-gray-800 p-6 shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Today&apos;s Routine</h2>
        </div>
        
        {tasks.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <p>Your day is completely free.</p>
            <p className="text-sm mt-2">Go to the Routine planner to add some tasks!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <div 
                key={task.id} 
                className={`flex items-center justify-between p-4 rounded-lg border border-gray-700 transition-colors ${
                  task.completionPercent >= 100 ? "bg-gray-800/50 opacity-60" : "bg-gray-750 hover:border-gray-500"
                }`}
              >
                <div className="flex items-center gap-4">
                  <button onClick={() => toggleTask(task.id, task.completionPercent)}>
                    {task.completionPercent >= 100 ? (
                      <CheckCircle2 className="w-8 h-8 text-green-500" />
                    ) : (
                      <Circle className="w-8 h-8 text-gray-500 hover:text-blue-400" />
                    )}
                  </button>
                  <div>
                    <h3 className={`text-lg font-semibold ${task.completionPercent >= 100 ? "line-through text-gray-500" : "text-white"}`}>
                      {task.title}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {task.startTime} - {task.endTime}
                      {task.chapter && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-900/40 text-blue-300">
                          {task.chapter.subject.name}: {task.chapter.name}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-cyan-300 mt-1">Completion: {Math.round(task.completionPercent || 0)}%</p>
                  </div>
                </div>
                <div className="w-28">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(task.completionPercent || 0)}
                    onChange={(e) => updateTaskPercent(task.id, Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 rounded-xl bg-gray-800 p-6 shadow-md">
        <h3 className="text-lg font-bold mb-4">Progress Calendar</h3>
        <div className="grid grid-cols-4 md:grid-cols-7 gap-2 mb-6">
          {dateWindow.map((dateKey) => {
            const progress = getDateProgress(dateKey);
            const isActive = selectedDate === dateKey;
            return (
              <button
                key={dateKey}
                onClick={() => setSelectedDate(dateKey)}
                className={`rounded-lg border p-2 text-left transition ${
                  isActive ? "border-blue-500 bg-blue-900/30" : "border-gray-700 bg-gray-900/50 hover:border-gray-500"
                }`}
              >
                <div className="text-xs text-gray-400">{format(new Date(dateKey), "MMM d")}</div>
                <div className="text-sm font-semibold text-white mt-1">{progress === null ? "-" : `${progress}%`}</div>
              </button>
            );
          })}
        </div>

        <h4 className="text-sm text-gray-300 mb-3">Tasks on {format(new Date(selectedDate), "MMM d, yyyy")}</h4>
        {selectedDateTasks.length === 0 ? (
          <p className="text-sm text-gray-500">No daily tasks on this date.</p>
        ) : (
          <div className="space-y-3">
            {selectedDateTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-900/50 p-3">
                <div className="flex items-center gap-3">
                  <button onClick={() => toggleTask(task.id, task.completionPercent)}>
                    {task.completionPercent >= 100 ? (
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    ) : (
                      <Circle className="w-6 h-6 text-gray-500 hover:text-blue-400" />
                    )}
                  </button>
                  <div>
                    <p className={`font-medium ${task.completionPercent >= 100 ? "line-through text-gray-500" : "text-white"}`}>{task.title}</p>
                    <p className="text-xs text-gray-400">{task.startTime} - {task.endTime}</p>
                    <p className="text-xs text-cyan-300">{Math.round(task.completionPercent || 0)}%</p>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(task.completionPercent || 0)}
                  onChange={(e) => updateTaskPercent(task.id, Number(e.target.value))}
                  className="w-24"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}