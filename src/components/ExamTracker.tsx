"use client";

import { useEffect, useState, useMemo } from "react";
import { Plus, Trash2, TrendingUp, Calendar, Hash, Timer } from "lucide-react";
import { format, parseISO } from "date-fns";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

type Exam = {
  id: string;
  title: string;
  date: string;
  subjectId: string;
  subject: { name: string };
  totalMarks: number;
  obtainedMarks: number;
  notes?: string | null;
};

type SubjectItem = {
  id: string;
  name: string;
};

type CustomCountdown = {
  id: string;
  title: string;
  targetDate: string;
};

const PENDING_TAG = "__PENDING_RESULT__";
const EXAM_COUNTDOWN_KEY = "examCountdownIds";
const CUSTOM_COUNTDOWNS_KEY = "customCountdowns";

export function ExamTracker() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Exam form state
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [subjectId, setSubjectId] = useState("");
  const [totalMarks, setTotalMarks] = useState<number | "">("");
  const [obtainedMarks, setObtainedMarks] = useState<number | "">("");
  const [addMarksLater, setAddMarksLater] = useState(false);
  const [enableCountdownOnCreate, setEnableCountdownOnCreate] = useState(false);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Edit pending exam marks
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [editingObtainedMarks, setEditingObtainedMarks] = useState<number | "">("");

  // Countdown states
  const [enabledExamCountdownIds, setEnabledExamCountdownIds] = useState<string[]>([]);
  const [customCountdowns, setCustomCountdowns] = useState<CustomCountdown[]>([]);
  const [customTitle, setCustomTitle] = useState("");
  const [customDate, setCustomDate] = useState("");
  const [customCountdownMode, setCustomCountdownMode] = useState<"date" | "datetime">("date");

  const isPendingExam = (exam: Exam) => (exam.notes || "").startsWith(PENDING_TAG);
  const cleanNotes = (notesValue?: string | null) => {
    if (!notesValue) return "";
    return notesValue.startsWith(PENDING_TAG)
      ? notesValue.replace(PENDING_TAG, "").trim()
      : notesValue;
  };

  const persistExamCountdownIds = (ids: string[]) => {
    localStorage.setItem(EXAM_COUNTDOWN_KEY, JSON.stringify(ids));
    window.dispatchEvent(new Event("countdownsUpdated"));
  };

  const persistCustomCountdowns = (items: CustomCountdown[]) => {
    localStorage.setItem(CUSTOM_COUNTDOWNS_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event("countdownsUpdated"));
  };

  const fetchExams = async () => {
    const res = await fetch("/api/student/exams", { cache: "no-store" });
    if (!res.ok) return;
    const exms: Exam[] = await res.json();
    setExams(exms);
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/student/exams", { cache: "no-store" }).then((res) => res.json()),
      fetch("/api/syllabus", { cache: "no-store" }).then((res) => res.json())
    ]).then(([exms, subs]) => {
      setExams(exms);
      setSubjects(subs);
      if (subs.length > 0) setSubjectId(subs[0].id);
      setLoading(false);
    });

    const storedExamIds = localStorage.getItem(EXAM_COUNTDOWN_KEY);
    if (storedExamIds) {
      try {
        setEnabledExamCountdownIds(JSON.parse(storedExamIds));
      } catch {
        setEnabledExamCountdownIds([]);
      }
    }

    const storedCustom = localStorage.getItem(CUSTOM_COUNTDOWNS_KEY);
    if (storedCustom) {
      try {
        setCustomCountdowns(JSON.parse(storedCustom));
      } catch {
        setCustomCountdowns([]);
      }
    }
  }, []);

  const handleAddExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date || !subjectId || totalMarks === "") return;
    if (!addMarksLater && obtainedMarks === "") return;
    setIsSubmitting(true);

    try {
      const preparedNotes = addMarksLater
        ? `${PENDING_TAG}${notes ? `\n${notes}` : ""}`
        : notes;

      const res = await fetch("/api/student/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          date: new Date(date).toISOString(),
          subjectId,
          totalMarks: Number(totalMarks),
          obtainedMarks: addMarksLater ? 0 : Number(obtainedMarks),
          notes: preparedNotes
        }),
      });

      if (res.ok) {
        const newExam = await res.json();
        setExams((prev) => [...prev, newExam].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));

        if (enableCountdownOnCreate) {
          const next = [...new Set([...enabledExamCountdownIds, newExam.id])];
          setEnabledExamCountdownIds(next);
          persistExamCountdownIds(next);
        }
        
        setTitle("");
        setTotalMarks("");
        setObtainedMarks("");
        setAddMarksLater(false);
        setEnableCountdownOnCreate(false);
        setNotes("");
        
        setSuccessMsg(addMarksLater ? "Future exam saved. Add marks later anytime." : "Exam result saved successfully!");
        setTimeout(() => setSuccessMsg(""), 3000);

        await fetchExams();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExam = async (id: string) => {
    const previousExams = exams;
    setExams(exams.filter((e) => e.id !== id));

    try {
      const res = await fetch(`/api/student/exams/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) {
        throw new Error("Failed to delete exam");
      }

      const filteredIds = enabledExamCountdownIds.filter((examId) => examId !== id);
      setEnabledExamCountdownIds(filteredIds);
      persistExamCountdownIds(filteredIds);
      await fetchExams();
    } catch (e) {
      console.error(e);
      setExams(previousExams);
    }
  };

  const handleUpdateExamMarks = async (exam: Exam) => {
    if (editingObtainedMarks === "") return;

    const previousExams = exams;

    setExams((prev) =>
      prev.map((e) =>
        e.id === exam.id
          ? { ...e, obtainedMarks: Number(editingObtainedMarks), notes: cleanNotes(e.notes) || null }
          : e
      )
    );

    const res = await fetch(`/api/student/exams/${exam.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        obtainedMarks: Number(editingObtainedMarks),
        totalMarks: exam.totalMarks,
        notes: cleanNotes(exam.notes),
      }),
    });

    if (!res.ok) {
      setExams(previousExams);
      return;
    }

    const updatedExam = await res.json();
    setExams((prev) => prev.map((e) => (e.id === updatedExam.id ? updatedExam : e)));
    setEditingExamId(null);
    setEditingObtainedMarks("");

    await fetchExams();
  };

  const toggleExamCountdown = (examId: string) => {
    const next = enabledExamCountdownIds.includes(examId)
      ? enabledExamCountdownIds.filter((id) => id !== examId)
      : [...enabledExamCountdownIds, examId];
    setEnabledExamCountdownIds(next);
    persistExamCountdownIds(next);
  };

  const handleAddCustomCountdown = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle || !customDate) return;

    const targetDate =
      customCountdownMode === "datetime"
        ? new Date(customDate).toISOString()
        : new Date(`${customDate}T23:59:59`).toISOString();

    const newItem: CustomCountdown = {
      id: crypto.randomUUID(),
      title: customTitle,
      targetDate,
    };
    const next = [...customCountdowns, newItem].sort(
      (a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
    );
    setCustomCountdowns(next);
    persistCustomCountdowns(next);
    setCustomTitle("");
    setCustomDate("");
  };

  const removeCustomCountdown = (id: string) => {
    const next = customCountdowns.filter((c) => c.id !== id);
    setCustomCountdowns(next);
    persistCustomCountdowns(next);
  };

  const chartData = useMemo(() => {
    return exams
      .filter((e) => !isPendingExam(e))
      .map(e => ({
      name: e.title.length > 10 ? e.title.substring(0, 10) + "..." : e.title,
      fullTitle: e.title,
      subject: e.subject.name,
      marksStr: `${e.obtainedMarks}/${e.totalMarks}`,
      percentage: e.totalMarks > 0 ? parseFloat(((e.obtainedMarks / e.totalMarks) * 100).toFixed(1)) : 0,
      date: format(parseISO(e.date), "MMM d")
    }));
  }, [exams]);

  const now = new Date();
  const futureExams = exams.filter((e) => new Date(e.date).getTime() > now.getTime());
  const pastExams = exams.filter((e) => new Date(e.date).getTime() <= now.getTime());

  if (loading) return <div className="text-center mt-10">Loading your academic history...</div>;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
      
      {/* FORM: Add new Exam */}
      <div className="bg-gray-800 p-6 rounded-xl xl:col-span-1 shadow-lg h-fit relative border border-gray-700">
        {successMsg && (
          <div className="bg-emerald-500/20 text-emerald-400 p-3 rounded-lg border border-emerald-500/50 flex justify-center items-center mb-6 animate-pulse shadow-lg font-medium">
            <TrendingUp className="w-5 h-5 mr-2" />
            {successMsg}
          </div>
        )}
        <h2 className="text-xl font-bold mb-6 flex items-center"><Plus className="mr-2 text-emerald-400" /> Add / Plan Exam</h2>
        
        <form onSubmit={handleAddExam} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1 flex items-center"><Hash className="w-4 h-4 mr-1"/> Exam Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full bg-gray-700/50 rounded-lg p-2.5 border border-gray-600 focus:border-emerald-500 outline-none transition" placeholder="e.g. Physics Mid-Term" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1 flex items-center"><Calendar className="w-4 h-4 mr-1"/> Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="w-full bg-gray-700/50 rounded-lg p-2.5 border border-gray-600 focus:border-emerald-500 outline-none [color-scheme:dark] transition" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1 flex items-center">Subject</label>
              <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} required className="w-full bg-gray-700/50 rounded-lg p-2.5 border border-gray-600 focus:border-emerald-500 outline-none transition text-sm">
                <option value="">Select subject...</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Obtained Marks</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={obtainedMarks}
                onChange={(e) => setObtainedMarks(e.target.value ? Number(e.target.value) : "")}
                required={!addMarksLater}
                disabled={addMarksLater}
                className="w-full bg-gray-700/50 rounded-lg p-2.5 border border-gray-600 focus:border-emerald-500 outline-none transition font-mono disabled:opacity-50"
                placeholder={addMarksLater ? "Add later" : "85"}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Total Marks</label>
              <input type="number" min="1" step="0.5" value={totalMarks} onChange={(e) => setTotalMarks(e.target.value ? Number(e.target.value) : "")} required className="w-full bg-gray-700/50 rounded-lg p-2.5 border border-gray-600 focus:border-emerald-500 outline-none transition font-mono" placeholder="100" />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={addMarksLater}
              onChange={(e) => setAddMarksLater(e.target.checked)}
              className="h-4 w-4"
            />
            Add marks later (plan future exam now)
          </label>

          <label className="flex items-center gap-2 text-sm text-cyan-200">
            <input
              type="checkbox"
              checked={enableCountdownOnCreate}
              onChange={(e) => setEnableCountdownOnCreate(e.target.checked)}
              className="h-4 w-4"
            />
            Enable countdown on dashboard for this exam
          </label>

          <div>
             <label className="block text-sm text-gray-400 mb-1">Notes (Optional)</label>
             <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full bg-gray-700/50 rounded-lg p-2.5 border border-gray-600 focus:border-emerald-500 outline-none transition resize-none h-20" placeholder="e.g. Lost marks in vector math..." />
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white shadow-md font-bold py-3 rounded-lg transition disabled:opacity-50 mt-4">
            {isSubmitting ? "Saving..." : "Save Result"}
          </button>
        </form>

        <div className="mt-8 border-t border-gray-700 pt-6">
          <h3 className="text-sm font-semibold text-cyan-300 mb-3 flex items-center">
            <Timer className="w-4 h-4 mr-2" /> Other Countdowns
          </h3>
          <form onSubmit={handleAddCustomCountdown} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCustomCountdownMode("date")}
                className={`rounded-md px-2 py-1.5 text-xs font-semibold border ${
                  customCountdownMode === "date"
                    ? "bg-cyan-600/30 text-cyan-100 border-cyan-400/40"
                    : "bg-gray-800 text-gray-300 border-gray-600"
                }`}
              >
                Date
              </button>
              <button
                type="button"
                onClick={() => setCustomCountdownMode("datetime")}
                className={`rounded-md px-2 py-1.5 text-xs font-semibold border ${
                  customCountdownMode === "datetime"
                    ? "bg-cyan-600/30 text-cyan-100 border-cyan-400/40"
                    : "bg-gray-800 text-gray-300 border-gray-600"
                }`}
              >
                Date + Time
              </button>
            </div>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="e.g. College Fest"
              className="w-full bg-gray-700/50 rounded-lg p-2.5 border border-gray-600 focus:border-cyan-500 outline-none transition"
            />
            <input
              type={customCountdownMode === "datetime" ? "datetime-local" : "date"}
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="w-full bg-gray-700/50 rounded-lg p-2.5 border border-gray-600 focus:border-cyan-500 outline-none transition [color-scheme:dark]"
            />
            <button type="submit" className="w-full rounded-lg bg-cyan-600 hover:bg-cyan-500 py-2 text-sm font-semibold">
              Add Countdown
            </button>
          </form>
          {customCountdowns.length > 0 && (
            <div className="mt-3 space-y-2">
              {customCountdowns.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg bg-gray-900/60 px-3 py-2 text-sm">
                  <div>
                    <p className="text-gray-100 font-medium">{c.title}</p>
                    <p className="text-gray-400 text-xs">{format(new Date(c.targetDate), "MMM dd, yyyy")}</p>
                  </div>
                  <button onClick={() => removeCustomCountdown(c.id)} className="text-red-400 hover:text-red-300">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* DASHBOARD: Charts and Tables */}
      <div className="xl:col-span-2 flex flex-col gap-6">
        
        {/* Performance Chart */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 h-[400px] flex flex-col">
          <h2 className="text-xl font-bold mb-4 text-emerald-400">Overall Performance Trend</h2>
          {chartData.length > 0 ? (
             <div className="flex-1 min-h-0 w-full">
               <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(val) => `${val}%`}/>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff', borderRadius: '8px' }}
                    labelStyle={{ color: '#a7f3d0', fontWeight: 'bold', marginBottom: '4px' }}
                    formatter={(value, _name, props) => {
                      const percentage = typeof value === "number" ? value : Number(value ?? 0);
                      const marksStr =
                        props && typeof props === "object" && "payload" in props
                          ? (props.payload as { marksStr?: string }).marksStr || "-"
                          : "-";
                      return [`${percentage}% (${marksStr})`, "Score"];
                    }}
                  />
                  <Line type="monotone" dataKey="percentage" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#fff', stroke: '#10b981' }} />
                </LineChart>
              </ResponsiveContainer>
             </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 italic">
              Add exam results to unlock your performance curve!
            </div>
          )}
        </div>

        {/* Future Exams */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
          <h2 className="text-xl font-bold mb-4 text-cyan-300">Upcoming Exams</h2>
          {futureExams.length === 0 ? (
            <p className="text-sm text-gray-500">No upcoming exams scheduled.</p>
          ) : (
            <div className="space-y-3">
              {futureExams.map((exam) => (
                <div key={exam.id} className="rounded-lg border border-gray-700 bg-gray-900/50 p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">{exam.title}</p>
                    <p className="text-xs text-gray-400">{exam.subject.name} • {format(parseISO(exam.date), "MMM dd, yyyy")}</p>
                  </div>
                  <button
                    onClick={() => toggleExamCountdown(exam.id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
                      enabledExamCountdownIds.includes(exam.id)
                        ? "bg-cyan-600/30 text-cyan-200 border border-cyan-400/40"
                        : "bg-gray-700 text-gray-200 border border-gray-600"
                    }`}
                  >
                    {enabledExamCountdownIds.includes(exam.id) ? "Countdown On" : "Enable Countdown"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* History List */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 flex-1">
          <h2 className="text-xl font-bold mb-4">Exam History</h2>
          {pastExams.length === 0 ? (
            <p className="text-sm text-gray-500">No past exams yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-700 text-gray-400">
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Subject</th>
                    <th className="pb-3 font-medium">Exam Title</th>
                    <th className="pb-3 font-medium">Score</th>
                    <th className="pb-3 font-medium">Countdown</th>
                    <th className="pb-3 font-medium text-right">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {pastExams.map((exam) => {
                    const pending = isPendingExam(exam);
                    const isFuture = new Date(exam.date).getTime() > now.getTime();
                    const percentage = (exam.obtainedMarks / exam.totalMarks) * 100;
                    return (
                      <tr key={exam.id} className="hover:bg-gray-750 transition group">
                        <td className="py-4 text-gray-300 font-mono text-xs">{format(parseISO(exam.date), "MMM dd, yyyy")}</td>
                        <td className="py-4 text-blue-300">{exam.subject.name}</td>
                        <td className="py-4 text-white font-medium">
                          {exam.title}
                          {cleanNotes(exam.notes) && <div className="text-xs text-gray-500 font-normal mt-1 truncate max-w-[200px]">{cleanNotes(exam.notes)}</div>}
                        </td>
                        <td className="py-4">
                          {pending ? (
                            <div className="flex items-center gap-2">
                              {editingExamId === exam.id ? (
                                <>
                                  <input
                                    type="number"
                                    min={0}
                                    step={0.5}
                                    value={editingObtainedMarks}
                                    onChange={(e) => setEditingObtainedMarks(e.target.value ? Number(e.target.value) : "")}
                                    className="w-20 rounded-md border border-gray-600 bg-gray-900 px-2 py-1 text-xs"
                                  />
                                  <button
                                    onClick={() => handleUpdateExamMarks(exam)}
                                    className="rounded bg-emerald-600 px-2 py-1 text-xs"
                                  >
                                    Save
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingExamId(exam.id);
                                    setEditingObtainedMarks("");
                                  }}
                                  className="rounded bg-amber-600/30 border border-amber-500/40 px-2 py-1 text-xs text-amber-200"
                                >
                                  Add Marks
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col">
                              <span className="font-bold text-emerald-400">{percentage.toFixed(1)}%</span>
                              <span className="text-xs text-gray-500 font-mono">{exam.obtainedMarks}/{exam.totalMarks}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-4">
                          {isFuture ? (
                            <button
                              onClick={() => toggleExamCountdown(exam.id)}
                              className={`px-2 py-1 rounded text-xs ${
                                enabledExamCountdownIds.includes(exam.id)
                                  ? "bg-cyan-600/30 text-cyan-200 border border-cyan-400/40"
                                  : "bg-gray-700 text-gray-200 border border-gray-600"
                              }`}
                            >
                              {enabledExamCountdownIds.includes(exam.id) ? "On" : "Off"}
                            </button>
                          ) : (
                            <span className="text-xs text-gray-500">-</span>
                          )}
                        </td>
                        <td className="py-4 text-right">
                          <button onClick={() => handleDeleteExam(exam.id)} className="text-gray-600 hover:text-red-400 transition opacity-0 group-hover:opacity-100 p-2">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}