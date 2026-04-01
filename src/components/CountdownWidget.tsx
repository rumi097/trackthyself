"use client";

import { useEffect, useMemo, useState } from "react";
import { Timer } from "lucide-react";
import { format } from "date-fns";

type ExamItem = {
  id: string;
  title: string;
  date: string;
  subject: { name: string };
};

type CustomCountdown = {
  id: string;
  title: string;
  targetDate: string;
};

type LegacyCustomCountdown = {
  id?: string;
  title?: string;
  targetDate?: string;
  date?: string;
  datetime?: string;
};

type CountdownItem = {
  id: string;
  title: string;
  targetDate: string;
  label: string;
};

const EXAM_COUNTDOWN_KEY = "examCountdownIds";
const CUSTOM_COUNTDOWNS_KEY = "customCountdowns";

function getTimeLeft(targetDate: string, nowTs: number) {
  const diff = new Date(targetDate).getTime() - nowTs;
  if (diff <= 0) {
    return {
      ended: true,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const mins = Math.floor((diff / (1000 * 60)) % 60);
  const secs = Math.floor((diff / 1000) % 60);

  return {
    ended: false,
    days,
    hours,
    minutes: mins,
    seconds: secs,
  };
}

export default function CountdownWidget() {
  const [examCountdownIds, setExamCountdownIds] = useState<string[]>([]);
  const [customCountdowns, setCustomCountdowns] = useState<CustomCountdown[]>([]);
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [nowTs, setNowTs] = useState(() => Date.now());

  const loadCountdownPrefs = () => {
    const examRaw = localStorage.getItem(EXAM_COUNTDOWN_KEY);
    const customRaw = localStorage.getItem(CUSTOM_COUNTDOWNS_KEY);

    try {
      setExamCountdownIds(examRaw ? JSON.parse(examRaw) : []);
    } catch {
      setExamCountdownIds([]);
    }

    try {
      const parsed = customRaw ? JSON.parse(customRaw) : [];
      const list = Array.isArray(parsed) ? parsed : [];
      const normalized: CustomCountdown[] = list
        .map((item: LegacyCustomCountdown, index: number) => {
          const targetDate = item.targetDate || item.datetime || item.date;
          if (!targetDate || !item.title) return null;
          return {
            id: item.id || `legacy-${index}-${item.title}`,
            title: item.title,
            targetDate,
          };
        })
        .filter((item: CustomCountdown | null): item is CustomCountdown => !!item);

      setCustomCountdowns(normalized);
    } catch {
      setCustomCountdowns([]);
    }
  };

  useEffect(() => {
    const loadExams = async () => {
      const res = await fetch("/api/student/exams", { cache: "no-store" });
      if (!res.ok) return;
      const data: ExamItem[] = await res.json();
      setExams(data);
    };

    const load = async () => {
      loadCountdownPrefs();
      await loadExams();
    };

    load();

    const syncHandler = () => {
      loadCountdownPrefs();
      void loadExams();
    };
    const focusHandler = () => {
      void loadExams();
    };
    const visibilityHandler = () => {
      if (document.visibilityState === "visible") {
        loadCountdownPrefs();
        void loadExams();
      }
    };

    window.addEventListener("countdownsUpdated", syncHandler);
    window.addEventListener("storage", syncHandler);
    window.addEventListener("focus", focusHandler);
    document.addEventListener("visibilitychange", visibilityHandler);
    return () => {
      window.removeEventListener("countdownsUpdated", syncHandler);
      window.removeEventListener("storage", syncHandler);
      window.removeEventListener("focus", focusHandler);
      document.removeEventListener("visibilitychange", visibilityHandler);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNowTs(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);

  const items = useMemo(() => {
    const examItems: CountdownItem[] = exams
      .filter((e) => examCountdownIds.includes(e.id) && new Date(e.date).getTime() > nowTs)
      .map((e) => ({
        id: `exam-${e.id}`,
        title: e.title,
        targetDate: e.date,
        label: `Exam • ${e.subject.name}`,
      }));

    const customItems: CountdownItem[] = customCountdowns
      .filter((c) => !!c.targetDate && new Date(c.targetDate).getTime() > nowTs)
      .map((c) => ({
        id: `custom-${c.id}`,
        title: c.title,
        targetDate: c.targetDate,
        label: "Countdown",
      }));

    return [...examItems, ...customItems].sort(
      (a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
    );
  }, [exams, examCountdownIds, customCountdowns, nowTs]);

  return (
    <div className="rounded-xl border border-cyan-400/20 bg-gradient-to-br from-slate-950 via-cyan-950/30 to-indigo-950 p-4 shadow-lg">
      <div className="mb-3 flex items-center gap-2">
        <Timer className="h-4 w-4 text-cyan-300" />
        <h3 className="text-sm font-semibold text-cyan-100">Upcoming Countdowns</h3>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-cyan-200/70">Enable exam countdowns or add custom countdowns in Exam Analytics.</p>
      ) : (
        <div className="space-y-3 max-h-[32rem] overflow-y-auto pr-1">
          {items.map((item) => (
            <div
              key={item.id}
              className="overflow-hidden rounded-lg border border-cyan-400/30 bg-gradient-to-b from-cyan-700 to-cyan-900 shadow-[0_0_0_1px_rgba(8,145,178,0.25)]"
            >
              <div className="border-b border-cyan-500/30 px-4 py-3 text-center">
                <p className="truncate text-2xl font-extrabold tracking-wide text-cyan-50">{item.title}</p>
              </div>

              {(() => {
                const t = getTimeLeft(item.targetDate, nowTs);
                if (t.ended) {
                  return (
                    <div className="px-4 py-5 text-center text-lg font-bold text-white">
                      Started
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-4 divide-x divide-cyan-400/30 px-2 py-4">
                    {[
                      { label: "days", value: t.days },
                      { label: "hours", value: t.hours },
                      { label: "minutes", value: t.minutes },
                      { label: "seconds", value: t.seconds },
                    ].map((seg) => (
                      <div key={seg.label} className="text-center">
                        <div className="text-4xl font-extrabold tracking-tight text-white">
                          {String(seg.value).padStart(2, "0")}
                        </div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-cyan-100/80">
                          {seg.label}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              <div className="flex items-center justify-between border-t border-cyan-500/30 bg-cyan-950/40 px-4 py-2 text-xs font-semibold text-cyan-100">
                <span>{item.label}</span>
                <span>{format(new Date(item.targetDate), "MMM d, yyyy h:mm a")}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
