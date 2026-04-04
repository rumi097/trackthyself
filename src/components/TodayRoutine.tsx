"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Circle, ChevronLeft, ChevronRight } from "lucide-react";
import { eachDayOfInterval, format, parseISO } from "date-fns";

type Task = {
  id: string;
  title: string;
  type?: "SINGLE_DAY" | "WEEKLY_RECURRING";
  linkKey?: string | null;
  date?: string;
  dayOfWeek?: number;
  createdAt?: string;
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
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedMonthKey, setSelectedMonthKey] = useState(format(new Date(), "yyyy-MM"));
  const [isLoading, setIsLoading] = useState(true);

  const toDateKey = (dateValue?: string) => {
    if (!dateValue) return "";
    try {
      return format(parseISO(dateValue), "yyyy-MM-dd");
    } catch {
      return format(new Date(dateValue), "yyyy-MM-dd");
    }
  };

  const dailyTaskIdentity = (task: Task) => {
    const dateKey = toDateKey(task.date);
    const fallbackIdentity = `${task.title}|${task.startTime}|${task.endTime}|${task.chapter?.subject?.name || ""}|${task.chapter?.name || ""}`;
    return `${dateKey}|${task.linkKey || fallbackIdentity}`;
  };

  const dedupeDailyTasks = (tasks: Task[]) => {
    const map = new Map<string, Task>();
    for (const task of tasks) {
      if (task.type !== "SINGLE_DAY" || !task.date) continue;
      const key = dailyTaskIdentity(task);
      const existing = map.get(key);
      if (!existing) {
        map.set(key, task);
        continue;
      }

      // Keep the task with higher completion to avoid under-reporting progress.
      map.set(
        key,
        (task.completionPercent || 0) >= (existing.completionPercent || 0) ? task : existing
      );
    }
    return Array.from(map.values());
  };

  const allDailyTasks = dedupeDailyTasks(allTasks);

  const dailyTaskDateKeys = Array.from(
    new Set(allDailyTasks.map((task) => toDateKey(task.date)).filter(Boolean))
  ).sort();

  const todayKey = format(new Date(), "yyyy-MM-dd");
  const calendarStart = dailyTaskDateKeys.length > 0 ? new Date(dailyTaskDateKeys[0]) : new Date();
  const calendarEnd = new Date(todayKey);

  const dateWindow = eachDayOfInterval({ start: calendarStart, end: calendarEnd }).map((d) =>
    format(d, "yyyy-MM-dd")
  );

  const monthOptions = Array.from(new Set(dateWindow.map((d) => d.slice(0, 7)))).sort();
  const filteredDateWindow = dateWindow.filter((d) => d.startsWith(selectedMonthKey));

  const setMonthAndFocusDate = (monthKey: string) => {
    setSelectedMonthKey(monthKey);
    const lastDateOfMonth = dateWindow.filter((d) => d.startsWith(monthKey)).slice(-1)[0];
    if (lastDateOfMonth) setSelectedDate(lastDateOfMonth);
  };

  const currentMonthIndex = monthOptions.indexOf(selectedMonthKey);
  const hasPrevMonth = currentMonthIndex > 0;
  const hasNextMonth = currentMonthIndex >= 0 && currentMonthIndex < monthOptions.length - 1;

  useEffect(() => {
    if (monthOptions.length === 0) return;
    if (!monthOptions.includes(selectedMonthKey)) {
      setSelectedMonthKey(monthOptions[0]);
    }
  }, [monthOptions, selectedMonthKey]);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const todayRes = await fetch("/api/student/dashboard/today", { cache: "no-store" });

      if (!todayRes.ok) {
        throw new Error("Failed to prepare today's task list");
      }

      const allRes = await fetch("/api/student/tasks/all", { cache: "no-store" });

      if (allRes.ok) {
        const data: Task[] = await allRes.json();
        setAllTasks(data);
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

  const computeTodayDailyPercentage = (tasksToMeasure: Task[]) => {
    const todaysDailyTasks = dedupeDailyTasks(tasksToMeasure).filter((task) => toDateKey(task.date) === todayKey);
    if (todaysDailyTasks.length === 0) return 0;
    return (
      todaysDailyTasks.reduce((acc, task) => acc + (task.completionPercent || 0), 0) /
      todaysDailyTasks.length
    );
  };

  const updateTaskPercent = async (id: string, nextPercent: number) => {
    const safePercent = Math.max(0, Math.min(100, nextPercent));
    const previousAllTasks = allTasks;

    try {
      const updatedTasks = allTasks.map((t) =>
        t.id === id ? { ...t, completionPercent: safePercent, isCompleted: safePercent >= 100 } : t
      );
      setAllTasks(updatedTasks);

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
      setAllTasks(previousAllTasks);
    }
  };

  const toggleTask = async (id: string, currentPercent: number) => {
    await updateTaskPercent(id, currentPercent >= 100 ? 0 : 100);
  };

  const getDateProgress = (targetDateKey: string) => {
    const dateTasks = allDailyTasks.filter((task) => targetDateKey === toDateKey(task.date));
    if (dateTasks.length === 0) return null;
    const totalPercent = dateTasks.reduce((acc, task) => acc + (task.completionPercent || 0), 0);
    return Math.round(totalPercent / dateTasks.length);
  };

  const selectedDateTasks = allDailyTasks
    .filter((task) => toDateKey(task.date) === selectedDate)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const todayDailyTasks = allDailyTasks
    .filter((task) => toDateKey(task.date) === todayKey)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const todayPercentage = Math.round(computeTodayDailyPercentage(allTasks));

  const formatTime12h = (time24: string) => {
    if (!time24) return "";
    const [h, m] = time24.split(":");
    const d = new Date();
    d.setHours(parseInt(h, 10), parseInt(m, 10));
    return format(d, "h:mm a");
  };

  const getCarryFromLabel = (task: Task) => {
    if (task.type !== "SINGLE_DAY") return null;
    const taskDateKey = toDateKey(task.date);
    if (!taskDateKey) return null;
    const createdKey = toDateKey(task.createdAt);
    if (!createdKey || createdKey >= taskDateKey) return null;
    return `From ${format(parseISO(task.createdAt as string), "EEE, MMM d")}`;
  };

  if (isLoading) return <div className="animate-pulse h-32 bg-gray-700/50 rounded-xl mt-4"></div>;

  return (
    <>
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-gray-800 p-6 shadow-md border-l-4 border-blue-500">
          <h2 className="text-gray-400 font-semibold text-sm">Today&apos;s Progress</h2>
          <p className="mt-2 text-4xl font-bold">{todayPercentage}%</p>
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
        
        {todayDailyTasks.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <p>Your day is completely free.</p>
            <p className="text-sm mt-2">Go to the Routine planner to add some tasks!</p>
          </div>
        ) : (
          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-bold mb-6 text-green-400">
                Timetable for {format(new Date(todayKey), "MMM d, yyyy")}
              </h3>

              {todayDailyTasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Your schedule is cleared for today.</div>
              ) : (
                <div className="space-y-4">
                  {todayDailyTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`p-4 flex gap-4 border rounded-xl transition items-center ${
                        task.completionPercent >= 100
                          ? "bg-green-900/10 border-green-500/30 opacity-75"
                          : "bg-gray-750 hover:bg-gray-700 border-gray-600"
                      }`}
                    >
                      <div className="shrink-0 text-center justify-center items-center flex flex-col font-mono bg-gray-900 border border-gray-600 p-3 rounded-lg text-sm min-w-28 text-orange-200">
                        <span>{formatTime12h(task.startTime)}</span>
                        <span className="text-gray-500 text-xs my-0.5">to</span>
                        <span>{formatTime12h(task.endTime)}</span>
                      </div>

                      <button
                        onClick={() => toggleTask(task.id, task.completionPercent)}
                        className="ml-2 shrink-0 text-gray-400 hover:text-green-400 transition"
                      >
                        {task.completionPercent >= 100 ? (
                          <CheckCircle2 className="w-8 h-8 text-green-500" />
                        ) : (
                          <Circle className="w-8 h-8" />
                        )}
                      </button>

                      <div className="flex-1 ml-2">
                        <div className="flex items-center gap-2">
                          <h4
                            className={`text-lg font-bold ${
                              task.completionPercent >= 100 ? "line-through text-gray-500" : "text-white"
                            }`}
                          >
                            {task.title}
                          </h4>
                          {getCarryFromLabel(task) && (
                            <span className="rounded-full border border-amber-400/40 bg-amber-900/30 px-2 py-0.5 text-[11px] text-amber-200">
                              {getCarryFromLabel(task)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-cyan-300 mt-1">
                          Completion: {Math.round(task.completionPercent || 0)}%
                        </p>
                        {task.chapter && (
                          <span className="bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded text-xs mt-1 inline-block">
                            {task.chapter.subject.name}: {task.chapter.name}
                          </span>
                        )}
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
          </div>
        )}
      </div>

      <div className="mt-8 rounded-xl bg-gray-800 p-6 shadow-md">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold">Progress Calendar</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => hasPrevMonth && setMonthAndFocusDate(monthOptions[currentMonthIndex - 1])}
              disabled={!hasPrevMonth}
              className="rounded-md border border-gray-700 bg-gray-900 p-2 text-gray-200 disabled:opacity-40"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <select
              value={selectedMonthKey}
              onChange={(e) => setMonthAndFocusDate(e.target.value)}
              className="rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 outline-none"
            >
              {monthOptions.map((monthKey) => (
                <option key={monthKey} value={monthKey}>
                  {format(new Date(`${monthKey}-01`), "MMMM yyyy")}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => hasNextMonth && setMonthAndFocusDate(monthOptions[currentMonthIndex + 1])}
              disabled={!hasNextMonth}
              className="rounded-md border border-gray-700 bg-gray-900 p-2 text-gray-200 disabled:opacity-40"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-4 md:grid-cols-7 gap-2 mb-6">
          {filteredDateWindow.map((dateKey) => {
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
                    <div className="flex items-center gap-2">
                      <p className={`font-medium ${task.completionPercent >= 100 ? "line-through text-gray-500" : "text-white"}`}>{task.title}</p>
                      {getCarryFromLabel(task) && (
                        <span className="rounded-full border border-amber-400/40 bg-amber-900/30 px-2 py-0.5 text-[11px] text-amber-200">
                          {getCarryFromLabel(task)}
                        </span>
                      )}
                    </div>
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