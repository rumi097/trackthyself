"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, BookOpen } from "lucide-react";
import { useRouter } from "next/navigation";

type Subject = {
  id: string;
  name: string;
  chapters: { id: string; name: string }[];
};

type Task = {
  id: string;
  title: string;
  type: "WEEKLY_RECURRING" | "SINGLE_DAY";
  dayOfWeek: number | null;
  startTime: string;
  endTime: string;
  chapter?: { name: string; subject: { name: string } };
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function RoutinePlanner() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [title, setTitle] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState(new Date().getDay());
  const [startTime, setStartTime] = useState("14:00");
  const [endTime, setEndTime] = useState("15:00");
  const [chapterId, setChapterId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/syllabus").then((res) => res.json()),
      fetch("/api/student/tasks/all").then((res) => res.json())
    ]).then(([subs, tsks]) => {
      setSubjects(subs);
      setTasks(tsks);
      setLoading(false);
    });
  }, []);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !startTime || !endTime) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/student/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          chapterId: chapterId || null,
          type: "WEEKLY_RECURRING",
          dayOfWeek: Number(dayOfWeek),
          startTime,
          endTime
        }),
      });

      if (res.ok) {
        const newTask = await res.json();
        // Since the backend doesn't return full nested objects right away, we refresh the page to keep it simple, or refetch
        const refreshedTasks = await fetch("/api/student/tasks/all").then((r) => r.json());
        setTasks(refreshedTasks);
        setTitle("");
        setChapterId("");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = async (id: string) => {
    // Optimistic UI
    setTasks(tasks.filter((t) => t.id !== id));
    await fetch(`/api/student/tasks/${id}`, { method: "DELETE" });
  };

  if (loading) return <div className="text-center mt-10">Loading planner...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* ADD TASK FORM */}
      <div className="bg-gray-800 p-6 rounded-xl shadow-lg lg:col-span-1 h-fit">
        <h2 className="text-xl font-bold mb-4 flex items-center"><Plus className="mr-2" /> Add Weekly Task</h2>
        <form onSubmit={handleAddTask} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Task Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full bg-gray-700 rounded-md p-2 border border-gray-600 focus:border-blue-500 outline-none" placeholder="e.g. Study Physics" />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Day of the Week</label>
            <select value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value))} className="w-full bg-gray-700 rounded-md p-2 border border-gray-600 focus:border-blue-500 outline-none">
              {DAYS.map((d, i) => (
                <option key={i} value={i}>{d}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Start Time</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required className="w-full bg-gray-700 rounded-md p-2 border border-gray-600 outline-none [color-scheme:dark]" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">End Time</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required className="w-full bg-gray-700 rounded-md p-2 border border-gray-600 outline-none [color-scheme:dark]" />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1 flex items-center"><BookOpen className="w-4 h-4 mr-1" /> Chapter (Optional)</label>
            <select value={chapterId} onChange={(e) => setChapterId(e.target.value)} className="w-full bg-gray-700 rounded-md p-2 border border-gray-600 focus:border-blue-500 outline-none">
              <option value="">-- No specific chapter --</option>
              {subjects.map((sub) => (
                <optgroup key={sub.id} label={sub.name}>
                  {sub.chapters.map((chap) => (
                    <option key={chap.id} value={chap.id}>{chap.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-md transition disabled:opacity-50 mt-4">
            {isSubmitting ? "Adding..." : "Add to Routine"}
          </button>
        </form>
      </div>

      {/* WEEKLY PLANNER VIEW */}
      <div className="bg-gray-800 p-6 rounded-xl shadow-lg lg:col-span-2 overflow-y-auto max-h-[80vh]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Your Week at a Glance</h2>
          <button onClick={() => router.push('/student/dashboard')} className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-md transition">Back to Dashboard</button>
        </div>
        
        <div className="space-y-6">
          {DAYS.map((dayName, dayIndex) => {
            const dayTasks = tasks.filter((t) => t.dayOfWeek === dayIndex);
            
            if (dayTasks.length === 0) return null;

            return (
              <div key={dayName} className="border border-gray-700 rounded-lg overflow-hidden">
                <div className="bg-gray-700/50 px-4 py-2 font-semibold text-blue-400">{dayName}</div>
                <div className="divide-y divide-gray-700">
                  {dayTasks.map((task) => (
                    <div key={task.id} className="p-4 flex justify-between items-center bg-gray-750 hover:bg-gray-700 transition">
                      <div>
                        <h4 className="font-bold text-white">{task.title}</h4>
                        <div className="text-sm text-gray-400 flex items-center gap-2 mt-1">
                          <span>{task.startTime} - {task.endTime}</span>
                          {task.chapter && (
                            <span className="bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded text-xs ml-2">
                              {task.chapter.subject.name}: {task.chapter.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => handleDeleteTask(task.id)} className="text-red-500 hover:text-red-400 bg-red-500/10 p-2 rounded-md transition">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          
          {tasks.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              Your week is empty. Add tasks from the sidebar to build your routine!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}