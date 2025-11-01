// src/pages/FocusMode.tsx
import React, { useEffect, useRef, useState } from "react";
import { Play, Square, Eye, EyeOff } from "lucide-react";

export default function FocusMode() {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [score, setScore] = useState(0);
  const [eyeEnabled, setEyeEnabled] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const toastLock = useRef(false); // prevents double toasts
  const toastTimeout = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  const r = 48;
  const circumference = 2 * Math.PI * r;

  // 🕒 Start focus session
  function startSession() {
    if (running) return;
    setRunning(true);
    showToast("Focus session started!");
    intervalRef.current = window.setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
  }

  // 🛑 End focus session
  function endSession() {
    if (!running) return;
    setRunning(false);
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    showToast(`Focus session ended — final score: ${score}`);
  }

  // 👁️ Toggle eye tracking
  function toggleEye() {
    setEyeEnabled((prev) => {
      const next = !prev;
      showToast(next ? "Eye tracking enabled" : "Eye tracking disabled");
      return next;
    });
  }

  // 🧠 Toast logic — prevent duplicates
  function showToast(message: string) {
    if (toastLock.current) return;
    toastLock.current = true;
    setToast(message);
    if (toastTimeout.current) window.clearTimeout(toastTimeout.current);
    toastTimeout.current = window.setTimeout(() => {
      setToast(null);
      toastLock.current = false;
    }, 2500);
  }

  // 🎯 Focus score simulation 
  useEffect(() => {
    let scoreTimer: number | null = null;

    if (running) {
      setScore((s) => Math.min(100, Math.max(s, 10)));

      scoreTimer = window.setInterval(() => {
        setScore((prev) => {
          const base = 40 + elapsed * 0.4;
          const fluct = (Math.random() - 0.5) * (eyeEnabled ? 4 : 2);
          const target = Math.min(100, Math.max(0, Math.round(base + fluct)));
          const delta = Math.sign(target - prev) * Math.min(3, Math.abs(target - prev));
          return Math.min(100, Math.max(0, prev + delta));
        });
      }, 1000);
    }

    // ✅ Proper cleanup
    return () => {
      if (scoreTimer !== null) window.clearInterval(scoreTimer);
    };
  }, [running, elapsed, eyeEnabled]);

  // 🧹 Cleanup intervals & timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (toastTimeout.current) {
        window.clearTimeout(toastTimeout.current);
        toastTimeout.current = null;
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const percent = Math.min(100, Math.max(0, score));
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex flex-col min-h-screen transition-colors duration-300 bg-gray-50 dark:bg-[#0B0B0F]">
      {/* Header */}
      <header className="px-10 py-6 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">
            Focus Mode
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Start a focused work session and track your productivity
          </p>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 px-10 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Timer section */}
          <section className="lg:col-span-2 bg-white dark:bg-[#121214] rounded-2xl p-8 border border-gray-200 dark:border-white/5 shadow-lg">
            <div className="flex flex-col items-center">
              <div className="text-6xl lg:text-7xl font-extrabold text-purple-600 dark:text-purple-400">
                {formatTime(elapsed)}
              </div>
              <div className="text-gray-600 dark:text-gray-400 mt-2">
                {running ? "Session in progress" : "Ready to start"}
              </div>

              <div className="mt-6">
                {!running ? (
                  <button
                    onClick={startSession}
                    className="flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-purple-600 to-purple-400 text-white font-semibold shadow-md hover:shadow-lg transition"
                  >
                    <Play className="w-5 h-5" />
                    Start Focus Session
                  </button>
                ) : (
                  <button
                    onClick={endSession}
                    className="flex items-center gap-3 px-6 py-3 rounded-full bg-red-500 text-white font-semibold shadow-md hover:brightness-95 transition"
                  >
                    <Square className="w-4 h-4" />
                    End Session
                  </button>
                )}
              </div>

              <hr className="my-6 w-full border-t border-gray-200 dark:border-white/5" />

              {/* Eye tracking */}
              <div className="w-full flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Eye Tracking</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Enhanced focus monitoring
                  </div>
                  <div
                    className={`text-xs mt-2 ${
                      eyeEnabled ? "text-green-500" : "text-gray-500 dark:text-gray-500"
                    }`}
                  >
                    {eyeEnabled ? "Active and monitoring" : "Not monitoring"}
                  </div>
                </div>

                <button
                  onClick={toggleEye}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition ${
                    eyeEnabled
                      ? "bg-gradient-to-r from-purple-600 to-purple-400 text-white shadow-md"
                      : "bg-gray-100 dark:bg-[#1f1f24] text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/6"
                  }`}
                >
                  {eyeEnabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  <span>{eyeEnabled ? "Enabled" : "Disabled"}</span>
                </button>
              </div>
            </div>
          </section>

          {/* Metrics */}
          <aside className="bg-white dark:bg-[#121214] rounded-2xl p-6 border border-gray-200 dark:border-white/5 shadow-lg">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Live Session Metrics
            </h3>

            <div className="flex flex-col items-center">
              <div className="relative w-36 h-36">
                <svg
                  width="100%"
                  height="100%"
                  viewBox="0 0 110 110"
                  className="transform -rotate-90"
                >
                  <defs>
                    <linearGradient id="focus-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#34D399" />
                      <stop offset="60%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                  <circle
                    cx="55"
                    cy="55"
                    r={r}
                    stroke="#e5e7eb"
                    strokeWidth="10"
                    fill="none"
                    className="dark:stroke-[#2b2b2d]"
                  />
                  <circle
                    cx="55"
                    cy="55"
                    r={r}
                    stroke="url(#focus-gradient)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    style={{ transition: "stroke-dashoffset 700ms ease" }}
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{score}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Focus Score</div>
                </div>
              </div>

              {/* Metrics list */}
              <div className="mt-6 w-full space-y-3">
                {[
                  {
                    label: "Session Status",
                    value: running ? "In Progress" : "Not Started",
                    valueClass: running ? "text-green-500" : "text-gray-600 dark:text-gray-400",
                  },
                  {
                    label: "Current Score",
                    value: score.toString(),
                    valueClass: "text-purple-600 dark:text-purple-400",
                  },
                  { label: "Distractions", value: "—", valueClass: "text-orange-500" },
                  {
                    label: "Recommended Break",
                    value: "In 90 min",
                    valueClass: "text-gray-600 dark:text-gray-400",
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl bg-gray-50 dark:bg-[#111214] px-4 py-3 flex items-center justify-between border border-gray-200 dark:border-white/5"
                  >
                    <span className="text-gray-700 dark:text-gray-300">{item.label}</span>
                    <span className={`font-medium ${item.valueClass}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>

        {/* Notes Section */}
        <div className="mt-8 bg-white dark:bg-[#121214] rounded-2xl p-6 border border-gray-200 dark:border-white/5 shadow-lg">
          <div className="font-semibold text-gray-900 dark:text-white mb-2">Session Notes</div>
          <div className="text-gray-600 dark:text-gray-400">
            Quick notes you take during the session will appear here.
          </div>
        </div>
      </main>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed right-8 bottom-24 z-[9999] px-6 py-3 rounded-2xl flex items-center gap-3
          transition-all duration-700 ease-[cubic-bezier(0.25,0.8,0.25,1)]
          backdrop-blur-2xl border 
          shadow-[0_8px_35px_rgba(0,0,0,0.25)]
          ${toast ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}
          bg-white/80 dark:bg-[#121214]/90
          border-gray-200/60 dark:border-white/10
          text-gray-900 dark:text-white
        `}
          style={{
            boxShadow:
              "0 8px 25px rgba(0,0,0,0.25), 0 0 18px rgba(168,85,247,0.35), inset 0 0 2px rgba(255,255,255,0.1)",
            animation: "toastPop 0.55s ease-out",
          }}
        >
          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-400 shadow-[0_0_12px_rgba(168,85,247,0.7)]"></div>
          <span className="font-semibold tracking-wide text-[0.95rem]">{toast}</span>
          <div className="absolute inset-0 rounded-2xl border border-transparent bg-gradient-to-r from-purple-400/30 to-fuchsia-400/30 opacity-0 hover:opacity-100 transition-opacity duration-500"></div>
        </div>
      )}

      {/* Toast Animation Keyframes */}
      <style>
        {`
        @keyframes toastPop {
          0% {
            opacity: 0;
            transform: translateY(12px) scale(0.95);
            filter: blur(4px);
          }
          70% {
            opacity: 1;
            transform: translateY(-2px) scale(1.02);
            filter: blur(0);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        `}
      </style>
    </div>
  );
}
