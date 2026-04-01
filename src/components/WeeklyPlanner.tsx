"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, BookOpen, CheckCircle, Circle } from "lucide-react";

type SubjectItem = {
  id: string;
  name: string;
  chapters: { id: string; name: string }[];
};

type WeeklyTask = {
  id: string;
  title: string;
  type: "WEEKLY_RECURRING" | "SINGLE_DAY";
  dayOfWeek?: number;
  isCompleted: boolean;
  chapter?: {
    id: string;
    name: string;
    subject: { name: string };
  };
};

// Similar to previous RoutinePlanner but simplified time to broader overview
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function WeeklyPlanner() {
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [tasks, setTasks] = useState<WeeklyTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [title, setTitle] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState(new Date().getDay());
  const [chapterId, setChapterId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Quick Add Syllabus State
  const [showAddChapter, setShowAddChapter] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newChapterName, setNewChapterName] = useState("");
  const [targetSubjectId, setTargetSubjectId] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/syllabus", { cache: "no-store" }).then((res) => res.json()),
      fetch("/api/student/tasks/all", { cache: "no-store" }).then((res) => res.json())
    ]).then(([subs, tsks]) => {
      setSubjects(subs);
      setTasks(tsks.filter((t: WeeklyTask) => t.type === "WEEKLY_RECURRING"));
      setLoading(false);
    });
  }, []);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
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
          startTime: "00:00", // Broad coverage for weekly assignment
          endTime: "23:59"
        }),
      });

      if (res.ok) {
        const refreshedTasks = await fetch("/api/student/tasks/all", { cache: "no-store" }).then((r) => r.json());
        setTasks(refreshedTasks.filter((t: WeeklyTask) => t.type === "WEEKLY_RECURRING"));
        setTitle("");
        setChapterId("");
        
        // Give success feedback
        setSuccessMsg(`Task successfully assigned to ${DAYS[dayOfWeek]}!`);
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = async (id: string) => {
    const previousTasks = tasks;
    setTasks(tasks.filter((t) => t.id !== id));
    try {
      const res = await fetch(`/api/student/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Failed to delete task");
      }
    } catch (e) {
      console.error(e);
      setTasks(previousTasks);
    }
  };

  const handleToggleComplete = async (task: WeeklyTask) => {
    const updatedStatus = !task.isCompleted;
    const previousTasks = tasks;
    setTasks(tasks.map(t => t.id === task.id ? { ...t, isCompleted: updatedStatus } : t));
    try {
      const res = await fetch(`/api/student/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: updatedStatus })
      });
      if (!res.ok) {
        throw new Error("Failed to update task status");
      }
    } catch (e) {
      console.error(e);
      setTasks(previousTasks);
    }
  };

  const handleAddSyllabus = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newSubjectName && !targetSubjectId) || !newChapterName) return;
    try {
      const res = await fetch("/api/syllabus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectName: newSubjectName,
          subjectId: targetSubjectId,
          chapterName: newChapterName
        })
      });
      if (res.ok) {
        const updatedSubjects = await res.json();
        setSubjects(updatedSubjects);
        setShowAddChapter(false);
        setNewSubjectName("");
        setNewChapterName("");
        setTargetSubjectId("");
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="text-center py-10">Loading weekly overview...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="bg-gray-800 p-6 rounded-xl lg:col-span-1 h-fit">
        {successMsg && (
          <div className="bg-green-500/20 text-green-400 p-3 rounded-lg border border-green-500/50 flex justify-center items-center mb-6 animate-pulse shadow-lg font-medium">
            <CheckCircle className="w-5 h-5 mr-2" />
            {successMsg}
          </div>
        )}
        <h2 className="text-lg font-bold mb-4 flex items-center"><Plus className="mr-2" /> Add Weekly Target</h2>
        
        {showAddChapter ? (
          <form onSubmit={handleAddSyllabus} className="space-y-4 mb-6 p-4 bg-gray-750 border border-blue-500/30 rounded-lg">
             <h3 className="text-sm font-semibold text-blue-300">Add Subject / Chapter</h3>
             <div>
                <label className="block text-xs text-gray-400 mb-1">Subject (Select existing OR Create new)</label>
                <select value={targetSubjectId} onChange={(e) => setTargetSubjectId(e.target.value)} className="w-full bg-gray-700 rounded-md p-1.5 outline-none mb-2 text-sm">
                  <option value="">-- Create New Subject --</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {!targetSubjectId && (
                  <input type="text" value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} placeholder="New Subject Name" className="w-full bg-gray-700 rounded-md p-1.5 outline-none text-sm" required />
                )}
             </div>
             <div>
                <label className="block text-xs text-gray-400 mb-1">Chapter Name</label>
                <input type="text" value={newChapterName} onChange={e => setNewChapterName(e.target.value)} placeholder="e.g. Thermodynamics" className="w-full bg-gray-700 rounded-md p-1.5 outline-none text-sm" required />
             </div>
             <div className="flex gap-2">
               <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 py-1.5 rounded text-sm transition">Save</button>
               <button type="button" onClick={() => setShowAddChapter(false)} className="flex-1 bg-gray-600 hover:bg-gray-500 py-1.5 rounded text-sm transition">Cancel</button>
             </div>
          </form>
        ) : (
          <form onSubmit={handleAddTask} className="space-y-4">
            <div>
               <label className="block text-sm text-gray-400 mb-1">Subject/Goal</label>
               <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full bg-gray-700 rounded-md p-2 outline-none" placeholder="e.g. Physics Paper 1 Focus" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Target Day</label>
              <select value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value))} className="w-full bg-gray-700 rounded-md p-2 outline-none">
                {DAYS.map((d, i) => (
                  <option key={i} value={i}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="flex justify-between items-end mb-1">
                <label className="block text-sm text-gray-400 flex items-center"><BookOpen className="w-4 h-4 mr-1" /> Focus Chapter</label>
                <button type="button" onClick={() => setShowAddChapter(true)} className="text-xs bg-blue-600/30 text-blue-300 hover:bg-blue-600/50 px-2 py-0.5 rounded transition flex items-center">
                  <Plus className="w-3 h-3 mr-1"/> New
                </button>
              </div>
              <select value={chapterId} onChange={(e) => setChapterId(e.target.value)} className="w-full bg-gray-700 rounded-md p-2 outline-none">
                <option value="">-- General Overview --</option>
                {subjects.map((sub) => (
                  <optgroup key={sub.id} label={sub.name}>
                    {sub.chapters.map((chap) => (
                      <option key={chap.id} value={chap.id}>{chap.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-md font-bold mt-2">
              Assign to Day
            </button>
          </form>
        )}
      </div>

      <div className="bg-gray-800 p-6 rounded-xl lg:col-span-2 overflow-y-auto max-h-[75vh]">
        <h2 className="text-xl font-bold mb-6 text-blue-400">Weekly Bird&apos;s-eye View</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DAYS.map((dayName, dayIndex) => {
            const dayTasks = tasks.filter((t) => t.dayOfWeek === dayIndex);
            return (
              <div key={dayName} className="border border-gray-700 rounded-lg bg-gray-900/50 p-4">
                <h3 className="font-semibold border-b border-gray-700 pb-2 mb-3">{dayName}</h3>
                {dayTasks.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No primary focus set</p>
                ) : (
                  <ul className="space-y-2">
                     {dayTasks.map(task => (
                       <li key={task.id} className={`flex justify-between items-center text-sm p-2 rounded border border-transparent transition ${task.isCompleted ? 'bg-green-900/20 border-green-500/30 opacity-70' : 'bg-gray-800'}`}>
                         <div className="flex items-start gap-3">
                           <button onClick={() => handleToggleComplete(task)} className="mt-0.5 text-gray-400 hover:text-green-400 transition">
                             {task.isCompleted ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Circle className="w-5 h-5" />}
                           </button>
                           <div>
                             <span className={`font-medium ${task.isCompleted ? 'line-through text-gray-500' : 'text-gray-200'}`}>{task.title}</span>
                             {task.chapter && <div className="text-xs text-blue-300 mt-0.5">{task.chapter.subject.name}: {task.chapter.name}</div>}
                           </div>
                         </div>
                         <button onClick={() => handleDeleteTask(task.id)} className="text-red-400/50 hover:text-red-400 ml-2">
                           <Trash2 className="w-4 h-4" />
                         </button>
                       </li>
                     ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}