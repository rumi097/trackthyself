"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, RotateCcw, Coffee, Brain } from "lucide-react";
import { format } from "date-fns";

type PomodoroTimerProps = {
  compact?: boolean;
};

type PersistedTimerState = {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  timeLeft: number;
  isActive: boolean;
  mode: "FOCUS" | "BREAK" | "LONG_BREAK";
  completedFocusSessions: number;
  lastUpdated: number;
};

type FocusSummary = {
  today: { date: string; sessions: number; minutes: number };
  history: { date: string; sessions: number; minutes: number }[];
};

const POMODORO_STORAGE_KEY = "pomodoroTimerState";

export default function PomodoroTimer({ compact = false }: PomodoroTimerProps) {
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [shortBreakMinutes, setShortBreakMinutes] = useState(5);
  const [longBreakMinutes, setLongBreakMinutes] = useState(15);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<"FOCUS" | "BREAK" | "LONG_BREAK">("FOCUS");
  const [completedFocusSessions, setCompletedFocusSessions] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [focusSummary, setFocusSummary] = useState<FocusSummary | null>(null);
  const [todayTotalMinutes, setTodayTotalMinutes] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const modeTheme =
    mode === "FOCUS"
      ? {
          ring: "from-blue-500 via-indigo-500 to-cyan-400",
          text: "text-cyan-100",
          chip: "bg-indigo-500/20 text-indigo-100 border border-indigo-300/20",
        }
      : mode === "BREAK"
      ? {
          ring: "from-emerald-500 via-teal-500 to-lime-400",
          text: "text-emerald-100",
          chip: "bg-emerald-500/20 text-emerald-100 border border-emerald-300/20",
        }
      : {
          ring: "from-amber-500 via-orange-500 to-rose-400",
          text: "text-orange-100",
          chip: "bg-orange-500/20 text-orange-100 border border-orange-300/20",
        };

  useEffect(() => {
    const raw = localStorage.getItem(POMODORO_STORAGE_KEY);
    if (!raw) {
      setHasHydrated(true);
      return;
    }

    try {
      const saved: PersistedTimerState = JSON.parse(raw);
      const elapsedSeconds = saved.isActive
        ? Math.floor((Date.now() - saved.lastUpdated) / 1000)
        : 0;

      setFocusMinutes(saved.focusMinutes);
      setShortBreakMinutes(saved.shortBreakMinutes);
      setLongBreakMinutes(saved.longBreakMinutes);
      setMode(saved.mode);
      setCompletedFocusSessions(saved.completedFocusSessions || 0);

      const restoredTimeLeft = Math.max(saved.timeLeft - elapsedSeconds, 0);
      setTimeLeft(restoredTimeLeft);
      setIsActive(saved.isActive && restoredTimeLeft > 0);
    } catch (e) {
      console.error("Failed to restore timer state", e);
    } finally {
      setHasHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;

    const payload: PersistedTimerState = {
      focusMinutes,
      shortBreakMinutes,
      longBreakMinutes,
      timeLeft,
      isActive,
      mode,
      completedFocusSessions,
      lastUpdated: Date.now(),
    };

    localStorage.setItem(POMODORO_STORAGE_KEY, JSON.stringify(payload));
  }, [focusMinutes, shortBreakMinutes, longBreakMinutes, timeLeft, isActive, mode, completedFocusSessions, hasHydrated]);

  const fetchFocusSummary = useCallback(async () => {
    try {
      const res = await fetch("/api/student/focus", { cache: "no-store" });
      if (!res.ok) return;
      const data: FocusSummary = await res.json();
      setFocusSummary(data);
      setTodayTotalMinutes(data.today.minutes || 0);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const saveSession = useCallback(async (minutes: number) => {
    setIsSaving(true);
    try {
      await fetch("/api/student/focus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          durationMinutes: minutes,
        }),
      });
      await fetchFocusSummary();
    } catch (err) {
      console.error("Failed to save session", err);
    } finally {
      setIsSaving(false);
    }
  }, [fetchFocusSummary]);

  useEffect(() => {
    fetchFocusSummary();
  }, [fetchFocusSummary]);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      if (isActive) {
        setIsActive(false);
        if (timerRef.current) clearInterval(timerRef.current);
        
        let newSessionCount = completedFocusSessions;
        let newMode = mode;
        let newTimeLeft = timeLeft;

        if (mode === "FOCUS") {
          newSessionCount = completedFocusSessions + 1;
          setCompletedFocusSessions(newSessionCount);
          setTodayTotalMinutes((prev) => prev + focusMinutes);
          
          saveSession(focusMinutes);

          if (newSessionCount % 4 === 0) {
            newMode = "LONG_BREAK";
            newTimeLeft = longBreakMinutes * 60;
          } else {
            newMode = "BREAK";
            newTimeLeft = shortBreakMinutes * 60;
          }
        } else {
          newMode = "FOCUS";
          newTimeLeft = focusMinutes * 60;
        }

        setMode(newMode);
        setTimeLeft(newTimeLeft);
        alert(`${mode === "FOCUS" ? "Focus session complete!" : "Break is over!"}`);
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft, mode, completedFocusSessions, focusMinutes, shortBreakMinutes, longBreakMinutes, saveSession]);

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    if (timerRef.current) clearInterval(timerRef.current);

    switch (mode) {
      case "FOCUS":
        setTimeLeft(focusMinutes * 60);
        break;
      case "BREAK":
        setTimeLeft(shortBreakMinutes * 60);
        break;
      case "LONG_BREAK":
        setTimeLeft(longBreakMinutes * 60);
        break;
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const changeMode = (newMode: "FOCUS" | "BREAK" | "LONG_BREAK") => {
    setIsActive(false);
    setMode(newMode);
    switch (newMode) {
      case "FOCUS":
        setTimeLeft(focusMinutes * 60);
        break;
      case "BREAK":
        setTimeLeft(shortBreakMinutes * 60);
        break;
      case "LONG_BREAK":
        setTimeLeft(longBreakMinutes * 60);
        break;
    }
  };

  return (
    <div className={`${compact ? "max-w-sm" : "max-w-2xl"} mx-auto space-y-3 rounded-2xl border border-indigo-400/20 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-4 shadow-2xl`}>
      <div className="text-center mb-2">
        <h2 className={`${compact ? "text-base" : "text-2xl"} font-bold text-indigo-100`}>Focus Timer</h2>
        <p className={`${compact ? "text-xs" : "text-sm"} text-indigo-200/80`}>Pomodoro technique</p>
      </div>

      <div className={`grid grid-cols-3 gap-2 rounded-xl border border-indigo-300/20 bg-slate-900/60 ${compact ? "p-2" : "p-3"}`}>
        <label className="text-xs text-indigo-200/90">
          Focus
          <input
            type="number"
            min={1}
            max={120}
            value={focusMinutes}
            disabled={isActive}
            onChange={(e) => {
              const value = Number(e.target.value);
              setFocusMinutes(value);
              if (mode === "FOCUS" && !isActive) setTimeLeft(value * 60);
            }}
            className="mt-1 w-full rounded-md border border-indigo-300/30 bg-slate-950/80 px-2 py-1 text-sm text-indigo-100"
          />
        </label>
        <label className="text-xs text-indigo-200/90">
          Break
          <input
            type="number"
            min={1}
            max={60}
            value={shortBreakMinutes}
            disabled={isActive}
            onChange={(e) => {
              const value = Number(e.target.value);
              setShortBreakMinutes(value);
              if (mode === "BREAK" && !isActive) setTimeLeft(value * 60);
            }}
            className="mt-1 w-full rounded-md border border-indigo-300/30 bg-slate-950/80 px-2 py-1 text-sm text-indigo-100"
          />
        </label>
        <label className="text-xs text-indigo-200/90">
          Long
          <input
            type="number"
            min={1}
            max={90}
            value={longBreakMinutes}
            disabled={isActive}
            onChange={(e) => {
              const value = Number(e.target.value);
              setLongBreakMinutes(value);
              if (mode === "LONG_BREAK" && !isActive) setTimeLeft(value * 60);
            }}
            className="mt-1 w-full rounded-md border border-indigo-300/30 bg-slate-950/80 px-2 py-1 text-sm text-indigo-100"
          />
        </label>
      </div>

      {/* Mode Selector */}
      <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-900/70 p-2 border border-indigo-400/20">
        <button
          onClick={() => changeMode("FOCUS")}
          className={`px-2 py-2 text-xs font-semibold rounded-lg transition-colors ${
            mode === "FOCUS" ? "bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow" : "text-indigo-100/90 hover:bg-slate-800"
          }`}
        >
          <span className="flex items-center justify-center">
            <Brain className="w-3.5 h-3.5 mr-1" /> Focus
          </span>
        </button>
        <button
          onClick={() => changeMode("BREAK")}
          className={`px-2 py-2 text-xs font-semibold rounded-lg transition-colors ${
            mode === "BREAK" ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow" : "text-indigo-100/90 hover:bg-slate-800"
          }`}
        >
          <span className="flex items-center justify-center">
            <Coffee className="w-3.5 h-3.5 mr-1" /> Break
          </span>
        </button>
        <button
          onClick={() => changeMode("LONG_BREAK")}
          className={`px-2 py-2 text-xs font-semibold rounded-lg transition-colors ${
            mode === "LONG_BREAK" ? "bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow" : "text-indigo-100/90 hover:bg-slate-800"
          }`}
        >
          <span className="flex items-center justify-center">
            Long
          </span>
        </button>
      </div>

      {/* Main Timer Display */}
      <div className="flex justify-center py-2">
        <div className={`rounded-full bg-gradient-to-br ${modeTheme.ring} p-2 shadow-[0_0_30px_rgba(99,102,241,0.45)]`}>
          <div className={`${compact ? "w-36 h-36" : "w-64 h-64 sm:w-80 sm:h-80"} flex flex-col items-center justify-center bg-slate-950 rounded-full border-4 border-indigo-300/20 relative overflow-hidden`}>
            <div
              className="absolute bottom-0 w-full opacity-25 transition-all duration-1000 bg-gradient-to-t from-indigo-400 via-cyan-400 to-teal-300"
              style={{
                height: `${
                  100 -
                  (timeLeft /
                    ((mode === "FOCUS"
                      ? focusMinutes
                      : mode === "BREAK"
                      ? shortBreakMinutes
                      : longBreakMinutes) *
                      60)) *
                    100
                }%`,
              }}
            />
            <span
              className={`${compact ? "text-3xl" : "text-6xl sm:text-7xl"} font-bold tracking-tight z-10 ${modeTheme.text}`}
            >
              {formatTime(timeLeft)}
            </span>
            <span className={`mt-1 rounded-full px-2 py-0.5 text-xs font-semibold z-10 ${modeTheme.chip}`}>
              {mode === "FOCUS" ? "Stay focused" : "Time to relax"}
            </span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center space-x-3">
        <button
          onClick={toggleTimer}
          className={`${compact ? "p-2.5" : "p-4"} rounded-full shadow-lg text-white transition-transform transform active:scale-95 ${
            isActive
              ? "bg-gradient-to-br from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500"
              : "bg-gradient-to-br from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500"
          }`}
        >
          {isActive ? <Pause className={`${compact ? "w-5 h-5" : "w-8 h-8"}`} /> : <Play className={`${compact ? "w-5 h-5" : "w-8 h-8"} ml-0.5`} />}
        </button>
        <button
          onClick={resetTimer}
          className={`${compact ? "p-2.5" : "p-4"} rounded-full bg-slate-900 text-indigo-100 shadow-lg hover:bg-slate-800 transition-colors border border-indigo-300/20`}
        >
          <RotateCcw className={`${compact ? "w-5 h-5" : "w-8 h-8"}`} />
        </button>
      </div>

      {isSaving && (
        <p className="text-center text-xs text-cyan-300">Saving session...</p>
      )}

      {/* Gamification Stats */}
      <div className="flex justify-center mt-2">
        <div className="inline-flex items-center space-x-2 bg-slate-900/80 px-3 py-1.5 rounded-full border border-indigo-300/20">
          <span className="text-xs font-semibold text-indigo-100">
            Today&apos;s Focus: {todayTotalMinutes}m
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-indigo-300/20 bg-slate-900/70 p-3">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-200">Focus Summary</h4>
        <div className="mb-2 grid grid-cols-1 gap-2 text-xs">
          <div className="rounded-md bg-slate-950/70 p-2 text-indigo-100">
            <p className="text-indigo-300">Today Total Focus</p>
            <p className="text-base font-bold">{todayTotalMinutes}m</p>
          </div>
        </div>

        <div className="max-h-28 space-y-1 overflow-y-auto pr-1 text-xs">
          {(focusSummary?.history || []).map((h) => (
            <div key={h.date} className="flex items-center justify-between rounded-md bg-slate-950/60 px-2 py-1 text-indigo-100">
              <span>{format(new Date(h.date), "MMM d")}</span>
              <span>{h.minutes}m</span>
            </div>
          ))}
          {!focusSummary?.history?.length && <p className="text-indigo-300/70">No previous focus sessions.</p>}
        </div>
      </div>
    </div>
  );
}
