"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Clock, CalendarDays, CheckCircle, Circle, Pencil } from "lucide-react";
import { format, parseISO } from "date-fns";

type SubjectItem = {
  id: string;
  name: string;
  chapters: { id: string; name: string }[];
};

type PlannerTask = {
  id: string;
  title: string;
  type: "SINGLE_DAY" | "WEEKLY_RECURRING";
  date?: string;
  dayOfWeek?: number;
  startTime: string;
  endTime: string;
  completionPercent: number;
  isCompleted: boolean;
  chapter?: {
    id: string;
    name: string;
    subject: { name: string };
  };
};

export function DailyPlanner() {
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Daily Form State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("16:00");
  const [endTime, setEndTime] = useState("17:30");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [alsoAddWeekly, setAlsoAddWeekly] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Syllabus add state
  const [showAddChapter, setShowAddChapter] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newChapterName, setNewChapterName] = useState("");
  const [targetSubjectId, setTargetSubjectId] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingStartTime, setEditingStartTime] = useState("");
  const [editingEndTime, setEditingEndTime] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/syllabus", { cache: "no-store" }).then((res) => res.json()),
      fetch("/api/student/tasks/all", { cache: "no-store" }).then((res) => res.json())
    ]).then(([subs, tsks]) => {
      setSubjects(subs);
      if (subs.length > 0) setSelectedSubjectId(subs[0].id);
      setTasks(tsks);
      setLoading(false);
    });
  }, []);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !startTime || !endTime) return;
    setIsSubmitting(true);
    const selectedDayOfWeek = new Date(selectedDate).getDay();

    try {
      const dailyRes = await fetch("/api/student/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          chapterId: chapterId || null,
          type: "SINGLE_DAY",
          date: new Date(selectedDate).toISOString(),
          startTime,
          endTime
        }),
      });

      let weeklyCreated = false;

      if (dailyRes.ok && alsoAddWeekly) {
        const weeklyRes = await fetch("/api/student/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            chapterId: chapterId || null,
            type: "WEEKLY_RECURRING",
            dayOfWeek: selectedDayOfWeek,
            startTime,
            endTime,
          }),
        });
        weeklyCreated = weeklyRes.ok;
      }

      if (dailyRes.ok) {
        const refreshedTasks = await fetch("/api/student/tasks/all", { cache: "no-store" }).then((r) => r.json());
        setTasks(refreshedTasks);
        setTitle("");
        setChapterId("");
        setAlsoAddWeekly(false);
        
        setSuccessMsg(
          weeklyCreated
            ? `Daily + weekly task added for ${selectedDate}.`
            : `Task scheduled on ${selectedDate}!`
        );
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

  const handleUpdateCompletion = async (task: PlannerTask, nextPercent: number) => {
    const safePercent = Math.max(0, Math.min(100, nextPercent));
    const previousTasks = tasks;
    setTasks(
      tasks.map((t) =>
        t.id === task.id ? { ...t, completionPercent: safePercent, isCompleted: safePercent >= 100 } : t
      )
    );
    try {
      const res = await fetch(`/api/student/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completionPercent: safePercent })
      });
      if (!res.ok) {
        throw new Error("Failed to update task status");
      }
    } catch (e) {
      console.error(e);
      setTasks(previousTasks);
    }
  };

  const handleToggleComplete = async (task: PlannerTask) => {
    await handleUpdateCompletion(task, task.completionPercent >= 100 ? 0 : 100);
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
        if (targetSubjectId) {
          setSelectedSubjectId(targetSubjectId);
        } else if (newSubjectName) {
          const created = updatedSubjects.find((s: SubjectItem) => s.name === newSubjectName);
          if (created) setSelectedSubjectId(created.id);
        }
        setChapterId("");
        setShowAddChapter(false);
        setNewSubjectName("");
        setNewChapterName("");
        setTargetSubjectId("");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const beginEditTaskTime = (task: PlannerTask) => {
    setEditingTaskId(task.id);
    setEditingStartTime(task.startTime);
    setEditingEndTime(task.endTime);
  };

  const cancelEditTaskTime = () => {
    setEditingTaskId(null);
    setEditingStartTime("");
    setEditingEndTime("");
  };

  const saveTaskTime = async (task: PlannerTask) => {
    if (!editingStartTime || !editingEndTime) return;

    const previousTasks = tasks;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, startTime: editingStartTime, endTime: editingEndTime } : t
      )
    );

    try {
      const res = await fetch(`/api/student/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startTime: editingStartTime,
          endTime: editingEndTime,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update task time");
      }

      setEditingTaskId(null);
      setEditingStartTime("");
      setEditingEndTime("");
    } catch (e) {
      console.error(e);
      setTasks(previousTasks);
    }
  };

  // Combine Daily tasks for this Date + Weekly tasks for this Day of the Week
  const targetDayOfWeek = new Date(selectedDate).getDay();

  const formatTime12h = (time24: string) => {
    if (!time24) return "";
    const [h, m] = time24.split(":");
    const d = new Date();
    d.setHours(parseInt(h, 10), parseInt(m, 10));
    return format(d, "h:mm a");
  };

  const daySpecificTasks = tasks
    .filter((t) => t.type === "SINGLE_DAY" && t.date && t.date.startsWith(selectedDate))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const weeklyTasksToday = tasks
    .filter((t) => t.type === "WEEKLY_RECURRING" && t.dayOfWeek === targetDayOfWeek);

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  if (loading) return <div className="text-center py-10">Loading daily planner...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="bg-gray-800 p-6 rounded-xl lg:col-span-1 h-fit">
        {successMsg && (
          <div className="bg-green-500/20 text-green-400 p-3 rounded-lg border border-green-500/50 flex justify-center items-center mb-6 animate-pulse shadow-lg font-medium">
            <CheckCircle className="w-5 h-5 mr-2" />
            {successMsg}
          </div>
        )}
        <h2 className="text-lg font-bold mb-4 flex items-center"><Plus className="mr-2" /> Detail a Daily Task</h2>
        
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
                <input type="text" value={newChapterName} onChange={e => setNewChapterName(e.target.value)} placeholder="e.g. Differentiation" className="w-full bg-gray-700 rounded-md p-1.5 outline-none text-sm" required />
             </div>
             <div className="flex gap-2">
               <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 py-1.5 rounded text-sm transition">Save</button>
               <button type="button" onClick={() => setShowAddChapter(false)} className="flex-1 bg-gray-600 hover:bg-gray-500 py-1.5 rounded text-sm transition">Cancel</button>
             </div>
          </form>
        ) : (
          <form onSubmit={handleAddTask} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1 flex items-center"><CalendarDays className="w-4 h-4 mr-1"/> Date</label>
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} required className="w-full bg-gray-700 rounded-md p-2 outline-none [color-scheme:dark]" />
            </div>
            <div>
               <label className="block text-sm text-gray-400 mb-1">Task Title</label>
               <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full bg-gray-700 rounded-md p-2 outline-none" placeholder="e.g. Read Physics Chapter 3" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1 flex items-center"><Clock className="w-4 h-4 mr-1"/> Start Time</label>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required className="w-full bg-gray-700 rounded-md p-2 outline-none [color-scheme:dark]" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1 flex items-center"><Clock className="w-4 h-4 mr-1"/> End Time</label>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required className="w-full bg-gray-700 rounded-md p-2 outline-none [color-scheme:dark]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-end mb-1">
                <label className="block text-sm text-gray-400">Subject & Chapter</label>
                <button
                  type="button"
                  onClick={() => {
                    setTargetSubjectId(selectedSubjectId);
                    setShowAddChapter(true);
                  }}
                  className="text-xs bg-blue-600/30 text-blue-300 hover:bg-blue-600/50 px-2 py-0.5 rounded transition flex items-center"
                >
                  <Plus className="w-3 h-3 mr-1"/> New
                </button>
              </div>
              <div className="space-y-2">
                <select
                  value={selectedSubjectId}
                  onChange={(e) => {
                    setSelectedSubjectId(e.target.value);
                    setChapterId("");
                  }}
                  className="w-full bg-gray-700 rounded-md p-2 outline-none"
                >
                  <option value="">-- Select Subject --</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>

                <select
                  value={chapterId}
                  onChange={(e) => setChapterId(e.target.value)}
                  disabled={!selectedSubjectId}
                  className="w-full bg-gray-700 rounded-md p-2 outline-none disabled:opacity-60"
                >
                  <option value="">{selectedSubject ? `Full Subject: ${selectedSubject.name}` : "Select subject first"}</option>
                  {(selectedSubject?.chapters || []).map((chap) => (
                    <option key={chap.id} value={chap.id}>{chap.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-md font-bold mt-2">
              Schedule Chunk
            </button>
            <label className="mt-2 flex items-center gap-2 text-sm text-blue-200">
              <input
                type="checkbox"
                checked={alsoAddWeekly}
                onChange={(e) => setAlsoAddWeekly(e.target.checked)}
                className="h-4 w-4"
              />
              Also add this as weekly recurring task for this weekday
            </label>
          </form>
        )}
      </div>

      <div className="bg-gray-800 p-6 rounded-xl lg:col-span-2 min-h-[60vh]">
        
        {/* WEEKLY OVERARCHING GOALS */}
        {weeklyTasksToday.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold mb-4 text-purple-400 border-b border-gray-700 pb-2">Weekly Goals Linked to Today</h2>
            <div className="grid grid-cols-1 gap-3">
              {weeklyTasksToday.map((task) => (
                 <div key={task.id} className={`p-3 flex gap-3 border rounded-lg transition items-center ${task.completionPercent >= 100 ? 'bg-green-900/10 border-green-500/30 opacity-75' : 'bg-gray-750 border-gray-600'}`}>
                   <button onClick={() => handleToggleComplete(task)} className="flex-shrink-0 text-gray-400 hover:text-green-400 transition">
                     {task.completionPercent >= 100 ? <CheckCircle className="w-6 h-6 text-green-500" /> : <Circle className="w-6 h-6" />}
                   </button>
                   <div className="flex-1">
                     <h4 className={`font-semibold ${task.completionPercent >= 100 ? 'line-through text-gray-500' : 'text-white'}`}>{task.title}</h4>
                     <p className="text-xs text-cyan-300">{Math.round(task.completionPercent || 0)}%</p>
                     {task.chapter && (
                        <div className="text-xs text-blue-300 mt-1">
                          {task.chapter.subject.name}: {task.chapter.name}
                        </div>
                     )}
                   </div>
                   <input
                     type="range"
                     min={0}
                     max={100}
                     value={Math.round(task.completionPercent || 0)}
                     onChange={(e) => handleUpdateCompletion(task, Number(e.target.value))}
                     className="w-24"
                   />
                 </div>
              ))}
            </div>
          </div>
        )}

        {/* DAILY TIMETABLE CHUNKS */}
        <h2 className="text-xl font-bold mb-6 text-green-400">
          Timetable for {format(parseISO(selectedDate), "MMM d, yyyy")}
        </h2>
        
        {daySpecificTasks.length === 0 ? (
           <div className="text-center py-10 text-gray-500">
             Your schedule is cleared for this date. Set a time block!
           </div>
        ) : (
          <div className="space-y-4">
             {daySpecificTasks.map((task) => (
               <div key={task.id} className={`p-4 flex gap-4 border rounded-xl transition items-center ${task.completionPercent >= 100 ? 'bg-green-900/10 border-green-500/30 opacity-75' : 'bg-gray-750 hover:bg-gray-700 border-gray-600'}`}>
                   <div className="flex-shrink-0 text-center justify-center items-center flex flex-col font-mono bg-gray-900 border border-gray-600 p-3 rounded-lg text-sm min-w-28 text-orange-200">
                     {editingTaskId === task.id ? (
                      <div className="space-y-1">
                        <input
                          type="time"
                          value={editingStartTime}
                          onChange={(e) => setEditingStartTime(e.target.value)}
                          className="w-full bg-gray-800 rounded px-1 py-0.5 text-xs outline-none"
                        />
                        <span className="block text-gray-500 text-xs">to</span>
                        <input
                          type="time"
                          value={editingEndTime}
                          onChange={(e) => setEditingEndTime(e.target.value)}
                          className="w-full bg-gray-800 rounded px-1 py-0.5 text-xs outline-none"
                        />
                      </div>
                     ) : (
                      <>
                        <span>{formatTime12h(task.startTime)}</span>
                        <span className="text-gray-500 text-xs my-0.5">to</span>
                        <span>{formatTime12h(task.endTime)}</span>
                      </>
                     )}
                   </div>
                   
                   <button onClick={() => handleToggleComplete(task)} className="ml-2 flex-shrink-0 text-gray-400 hover:text-green-400 transition">
                     {task.completionPercent >= 100 ? <CheckCircle className="w-8 h-8 text-green-500" /> : <Circle className="w-8 h-8" />}
                   </button>
                   
                   <div className="flex-1 ml-2">
                     <h4 className={`text-lg font-bold ${task.completionPercent >= 100 ? 'line-through text-gray-500' : 'text-white'}`}>{task.title}</h4>
                     <p className="text-xs text-cyan-300 mt-1">Completion: {Math.round(task.completionPercent || 0)}%</p>
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
                     onChange={(e) => handleUpdateCompletion(task, Number(e.target.value))}
                     className="w-24"
                   />
                     {editingTaskId === task.id ? (
                      <div className="flex gap-2">
                        <button onClick={() => saveTaskTime(task)} className="text-emerald-300 hover:text-emerald-200 bg-emerald-500/10 p-2 rounded-md">
                          Save
                        </button>
                        <button onClick={cancelEditTaskTime} className="text-gray-300 hover:text-white bg-gray-600/30 p-2 rounded-md">
                          Cancel
                        </button>
                      </div>
                     ) : (
                      <button onClick={() => beginEditTaskTime(task)} className="text-blue-400 hover:text-blue-300 bg-blue-500/10 p-2 rounded-md">
                        <Pencil className="w-4 h-4" />
                      </button>
                     )}
                   <button onClick={() => handleDeleteTask(task.id)} className="text-red-500 hover:text-red-400 bg-red-500/10 p-2 rounded-md">
                     <Trash2 className="w-5 h-5" />
                   </button>
                </div>
             ))}
          </div>
        )}
      </div>
    </div>
  );
}