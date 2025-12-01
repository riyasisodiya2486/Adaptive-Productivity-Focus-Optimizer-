import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import {
  Play, Square, Eye, EyeOff, Pause, ChevronRight, RefreshCw, AlertTriangle, Mouse, Keyboard, Clock
} from "lucide-react";
import { BACKEND_URL } from "./config";

// API endpoints
const API_BASE = BACKEND_URL + "/session";
const TRACKING_API_URL = BACKEND_URL + "/activities/batch";
const TRACKING_INTERVAL_MS = 60_000; 
type AppCategory = "productive" | "distraction" | "neutral";

interface ActivityDelta {
  keystrokes: number;
  mouseClicks: number;
  mouseMoves: number;
  scrolls: number;
  idleTime: number;
}

interface ActiveApp { name: string; title: string; category: AppCategory }
interface BrowserActivity {
  url: string; title: string; domain: string; category: AppCategory
}

interface EyeTracking {
  enabled: boolean; gazeY?: number; gazeX?: number; blinkRate?: number; focusedOnScreen?: boolean;
}

interface ContextData {
  activeApp: ActiveApp;
  browserActivity?: BrowserActivity;
  eyeTracking: EyeTracking;
}

interface ActivityPayload {
  sessionId: string;
  timestamp: Date;
  activityData: ActivityDelta;
  activeApp: ActiveApp;
  browserActivity?: BrowserActivity;
  eyeTracking?: EyeTracking;
  distractionDetected: string[];
}

const getJwtToken = (): string =>
  (typeof window !== "undefined" && window.localStorage)
    ? (window.localStorage.getItem("token") || "")
    : "";

const FocusMode: React.FC = () => {
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [eyeEnabled, setEyeEnabled] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [lastApiStatus, setLastApiStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // UI display
  const [apiSuccessCount, setApiSuccessCount] = useState(0);
  const [score, setScore] = useState<number>(80);
  
  // ✅ NEW: Live focus score for current session
  const [liveFocusScore, setLiveFocusScore] = useState<number | null>(null);

  const activityState = useRef<ActivityDelta & { activeApp: ActiveApp }>({
    keystrokes: 0, mouseClicks: 0, mouseMoves: 0, scrolls: 0, idleTime: 0,
    activeApp: { name: "N/A", title: "N/A", category: "neutral" }
  });

  // Helper
  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3000);
  };

  // ✅ UPDATED: Fetch focus score from /current endpoint
  const fetchLiveFocusScore = useCallback(
    async (sessionId: string) => {
      try {
        const jwt = getJwtToken();
        if (!jwt || !sessionId) return;

        // ✅ Fetch from /current endpoint (gets full session with focusScore)
        const res = await axios.get(`${API_BASE}/current`, {
          headers: { Authorization: `Bearer ${jwt}` },
        });
        const focusScore = res.data?.session?.focusScore;

        if (typeof focusScore === "number" && !Number.isNaN(focusScore)) {
          const clampedScore = Math.max(0, Math.min(100, Math.round(focusScore)));
          setLiveFocusScore(clampedScore);
          setScore(clampedScore); // Update circle visualization
          console.log(`✅ Live focus score: ${clampedScore}% from current session`);
        } else {
          console.warn("❌ No focusScore in current session response:", res.data);
          setLiveFocusScore(null);
        }
      } catch (err: any) {
        console.error("❌ Failed to fetch live focus score", err?.response?.data?.msg || err.message);
        setLiveFocusScore(null);
      }
    },
    []
  );

  // --- Activity Data Collection ---
  const sendActivityData = useCallback(async () => {
    const jwt = getJwtToken();
    if (!jwt || !currentSessionId) {
      setError("Missing JWT token or session ID");
      return false;
    }

    try {
      const deltaData: ActivityDelta = await (window as any).electron?.getActivityDelta?.();
      const contextData: ContextData = await (window as any).electron?.getActivityContext?.(eyeEnabled);

      if (!deltaData || !contextData || !contextData.activeApp) {
        setError("Failed to get activity data from tracker");
        return false;
      }

      // UI display update
      activityState.current = {
        ...deltaData,
        activeApp: contextData.activeApp
      };

      // Build clean payload (no focusScore sent)
      const payload: ActivityPayload = {
        sessionId: currentSessionId,
        timestamp: new Date(),
        activityData: deltaData,
        activeApp: contextData.activeApp,
        browserActivity: contextData.browserActivity,
        eyeTracking: contextData.eyeTracking,
        distractionDetected:
          contextData.activeApp.category === "distraction" ? ["distraction_app_switch"] : []
      };

      await axios.post(TRACKING_API_URL, { sessionId: currentSessionId, activities: [payload] }, {
        headers: { Authorization: `Bearer ${jwt}` }
      });

      setLastApiStatus(`Data sent @ ${new Date().toLocaleTimeString()}`);
      setApiSuccessCount(c => c + 1);
      setError(null);
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.msg || err?.message || "Unknown tracking error";
      setError(`Tracking failed: ${msg}`);
      setLastApiStatus(null);
      return false;
    }
  }, [currentSessionId, eyeEnabled]);

  // ---- Session state restore and timer
  useEffect(() => {
    const runningLS = localStorage.getItem("focus_session_running") === "true";
    const pausedLS = localStorage.getItem("focus_session_paused") === "true";
    const sessionIdLS = localStorage.getItem("focus_session_id");
    const startTimeLS = Number(localStorage.getItem("focus_session_start_time"));
    const pausedElapsedLS = Number(localStorage.getItem("focus_session_elapsed")) || 0;
    if (runningLS && !pausedLS && startTimeLS) {
      setElapsed(Math.floor((Date.now() - startTimeLS) / 1000));
    } else {
      setElapsed(pausedElapsedLS);
    }
    setRunning(runningLS);
    setPaused(pausedLS);
    setCurrentSessionId(sessionIdLS ?? null);
  }, []);

  useEffect(() => {
    let tick: NodeJS.Timeout | null = null;
    if (running && !paused) {
      tick = setInterval(() => {
        const startTime = Number(localStorage.getItem("focus_session_start_time"));
        if (startTime) setElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => { if (tick) clearInterval(tick); };
  }, [running, paused]);

  // ✅ Poll live focus score while session is active
  useEffect(() => {
    if (!currentSessionId || !running || paused) {
      setLiveFocusScore(null);
      return;
    }

    // Initial fetch
    fetchLiveFocusScore(currentSessionId);

    // Poll every 30s while session is running
    const intervalId = setInterval(
      () => fetchLiveFocusScore(currentSessionId),
      30_000
    );

    return () => clearInterval(intervalId);
  }, [currentSessionId, running, paused, fetchLiveFocusScore]);

  useEffect(() => {
    let trackerInterval: NodeJS.Timeout | null = null;
    if (running && !paused) {
      sendActivityData();
      trackerInterval = setInterval(() => {
        sendActivityData();
      }, TRACKING_INTERVAL_MS);
    }
    return () => { if (trackerInterval) clearInterval(trackerInterval); };
  }, [running, paused, sendActivityData]);

  useEffect(() => {
    if (paused || !running)
      localStorage.setItem("focus_session_elapsed", String(elapsed));
  }, [elapsed, paused, running]);

  // ---- Session controls
  const startSession = async () => {
    setLoading(true);
    try {
      const jwt = getJwtToken();
      if (!jwt) { showToast("No token available!"); setLoading(false); return; }
      // Backend session create
      const { data } = await axios.post(`${API_BASE}/start`, {}, {
        headers: { Authorization: `Bearer ${jwt}` }
      });
      const sessionId = data.session?._id || data.sessionId;
      if (!sessionId) { showToast("No session ID returned!"); setLoading(false); return; }
      // Electron tracker
      await (window as any).electron?.startSession?.({
        userId: data.session?.userId || "unknown",
        sessionId,
        backendUrl: BACKEND_URL,
        authToken: jwt,
        updateInterval: TRACKING_INTERVAL_MS
      });
      setCurrentSessionId(sessionId);
      setRunning(true);
      setPaused(false);
      setElapsed(0);
      setLiveFocusScore(null); // Reset live score
      activityState.current = {
        keystrokes: 0, mouseClicks: 0, mouseMoves: 0, scrolls: 0, idleTime: 0,
        activeApp: { name: "N/A", title: "N/A", category: "neutral" }
      };
      const now = Date.now();
      localStorage.setItem("focus_session_running", "true");
      localStorage.setItem("focus_session_paused", "false");
      localStorage.setItem("focus_session_id", sessionId);
      localStorage.setItem("focus_session_start_time", String(now));
      localStorage.setItem("focus_session_elapsed", "0");
      showToast("Focus session started");
    } catch (err: any) {
      const msg = err?.response?.data?.msg || "Failed to start session";
      showToast(msg); console.error("startSession error:", err);
    } finally { setLoading(false); }
  };

  const pauseSession = async () => {
    if (!currentSessionId) return;
    setLoading(true);
    try {
      const jwt = getJwtToken();
      await sendActivityData();
      await axios.put(`${API_BASE}/${currentSessionId}/pause`, {}, {
        headers: { Authorization: `Bearer ${jwt}` }
      });
      await (window as any).electron?.pauseSession?.();
      setPaused(true); setRunning(false);
      setLiveFocusScore(null); // Reset live score
      localStorage.setItem("focus_session_paused", "true");
      localStorage.setItem("focus_session_running", "false");
      localStorage.setItem("focus_session_elapsed", String(elapsed));
      localStorage.removeItem("focus_session_start_time");
      showToast("Session paused");
    } catch (err: any) {
      const msg = err?.response?.data?.msg || "Failed to pause session";
      showToast(msg); console.error("pauseSession error:", err);
    } finally { setLoading(false); }
  };

  const resumeSession = async () => {
    if (!currentSessionId) return;
    setLoading(true);
    try {
      const jwt = getJwtToken();
      await axios.put(`${API_BASE}/${currentSessionId}/resume`, {}, {
        headers: { Authorization: `Bearer ${jwt}` }
      });
      await (window as any).electron?.resumeSession?.();
      setPaused(false); setRunning(true);
      const now = Date.now();
      localStorage.setItem("focus_session_start_time", String(now - elapsed * 1000));
      localStorage.setItem("focus_session_paused", "false");
      localStorage.setItem("focus_session_running", "true");
      showToast("Session resumed");
    } catch (err: any) {
      const msg = err?.response?.data?.msg || "Failed to resume session";
      showToast(msg); console.error("resumeSession error:", err);
    } finally { setLoading(false); }
  };

  const endSession = async () => {
    if (!currentSessionId) return;
    setLoading(true);
    const clearSessionState = () => {
      (window as any).electron?.endSession?.();
      setRunning(false); setPaused(false); setCurrentSessionId(null); setElapsed(0);
      setLiveFocusScore(null); // Reset live score
      localStorage.removeItem("focus_session_running");
      localStorage.removeItem("focus_session_paused");
      localStorage.removeItem("focus_session_id");
      localStorage.removeItem("focus_session_elapsed");
      localStorage.removeItem("focus_session_start_time");
      showToast("Session ended");
    };
    try {
      const jwt = getJwtToken();
      await sendActivityData();
      await axios.put(`${API_BASE}/${currentSessionId}/end`, {}, {
        headers: { Authorization: `Bearer ${jwt}` }
      });
      clearSessionState();
    } catch (err: any) {
      const msg = err?.response?.data?.msg || err.message || "Failed to end session";
      showToast(msg);
      if (
        typeof msg === "string" &&
        (msg.toLowerCase().includes("already ended") || msg.toLowerCase().includes("not found"))
      ) clearSessionState();
    } finally { setLoading(false); }
  };

  const toggleEye = () => {
    setEyeEnabled((prev) => !prev);
    showToast(!eyeEnabled ? "Eye tracking enabled" : "Eye tracking disabled");
  };

  // Time display
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Focus score visuals
  const r = 45;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference - ((liveFocusScore ?? score) / 100) * circumference;

  return (
    <div className="flex flex-col min-h-screen transition-colors duration-300 bg-gray-50 dark:bg-[#0B0B0F]">
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

      <main className="flex-1 px-10 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 bg-white dark:bg-[#121214] rounded-2xl p-8 border border-gray-200 dark:border-white/5 shadow-lg">
            <div className="flex flex-col items-center">
              <div className="text-6xl lg:text-7xl font-extrabold text-purple-600 dark:text-purple-400">
                {formatTime(elapsed)}
              </div>
              <div className="text-gray-600 dark:text-gray-400 mt-2">
                {running ? "Session in progress" : paused ? "Session paused" : "Ready to start"}
              </div>

              <div className="mt-6 flex gap-3 flex-wrap justify-center">
                {!running && !paused ? (
                  <button
                    onClick={startSession}
                    disabled={loading}
                    className="flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-purple-600 to-purple-400 text-white font-semibold shadow-md hover:shadow-lg transition disabled:opacity-50"
                  >
                    <Play className="w-5 h-5" />
                    Start Focus Session
                  </button>
                ) : running ? (
                  <>
                    <button
                      onClick={endSession}
                      disabled={loading}
                      className="flex items-center gap-3 px-6 py-3 rounded-full bg-red-500 text-white font-semibold shadow-md hover:brightness-95 transition disabled:opacity-50"
                    >
                      <Square className="w-4 h-4" />
                      End Session
                    </button>
                    <button
                      onClick={pauseSession}
                      disabled={loading}
                      className="flex items-center gap-3 px-6 py-3 rounded-full bg-yellow-500 text-white font-semibold shadow-md hover:brightness-95 transition disabled:opacity-50"
                    >
                      <Pause className="w-4 h-4" />
                      Pause
                    </button>
                  </>
                ) : paused && currentSessionId ? (
                  <button
                    onClick={resumeSession}
                    disabled={loading}
                    className="flex items-center gap-3 px-6 py-3 rounded-full bg-green-500 text-white font-semibold shadow-md hover:brightness-95 transition disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                    Resume
                  </button>
                ) : null}

                {running && (
                  <>
                    <button
                      onClick={() => {
                        showToast("Break feature not wired in this mock");
                      }}
                      className="flex items-center gap-3 px-6 py-3 rounded-full bg-blue-500 text-white font-semibold shadow-md hover:brightness-95 transition"
                    >
                      Start Break
                    </button>
                    <button
                      onClick={() => {
                        showToast("End Break - implement backend call if needed");
                      }}
                      className="flex items-center gap-3 px-6 py-3 rounded-full bg-indigo-500 text-white font-semibold shadow-md hover:brightness-95 transition"
                    >
                      End Break
                    </button>
                  </>
                )}
              </div>

              <hr className="my-6 w-full border-t border-gray-200 dark:border-white/5" />

              {((lastApiStatus) || (error)) && (
                <div className="mb-4 p-3 rounded-lg border w-full text-sm">
                  {error ? (
                    <div className="flex items-center text-red-700 bg-red-50">
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      <strong>Error:</strong> {error}
                    </div>
                  ) : (
                    <div className="flex items-center text-green-700 bg-green-50">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      <strong>Last Sent:</strong> {lastApiStatus} (Total: {apiSuccessCount})
                    </div>
                  )}
                </div>
              )}

              <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                <div className="p-3 bg-gray-50 dark:bg-[#111214] rounded-xl text-center shadow-inner">
                  <Keyboard className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                  <div className="font-semibold text-lg">{activityState.current.keystrokes ?? 0}</div>
                  <div className="text-xs text-gray-500">Keystrokes</div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-[#111214] rounded-xl text-center shadow-inner">
                  <Mouse className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                  <div className="font-semibold text-lg">{activityState.current.mouseClicks ?? 0}</div>
                  <div className="text-xs text-gray-500">Clicks</div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-[#111214] rounded-xl text-center shadow-inner">
                  <Clock className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
                  <div className="font-semibold text-lg">{formatTime(activityState.current.idleTime ?? 0)}</div>
                  <div className="text-xs text-gray-500">Idle Time</div>
                </div>
                <div className="flex flex-col items-center justify-center p-3 bg-gray-50 dark:bg-[#111214] rounded-xl shadow-inner">
                  <div className="font-medium text-gray-900 dark:text-white mb-1">Eye Tracking</div>
                  <button
                    onClick={toggleEye}
                    className={`mt-2 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${
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
            </div>
          </section>

          <aside className="bg-white dark:bg-[#121214] rounded-2xl p-6 border border-gray-200 dark:border-white/5 shadow-lg">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Live Session Metrics</h3>
            <div className="flex flex-col items-center">
              <div className="mt-6 w-full space-y-3">
                {[
                  {
                    label: "Session Status",
                    value: running && !paused ? "In Progress" : paused ? "Paused" : "Not Started",
                    valueClass: running && !paused ? "text-green-500" : paused ? "text-yellow-500" : "text-gray-600 dark:text-gray-400"
                  },
                  { label: "Active App", value: activityState.current.activeApp.title, valueClass: "text-purple-600 dark:text-purple-400" },
                  { label: "Distractions", value: "—", valueClass: "text-orange-500" },
                  { label: "Session ID", value: currentSessionId ? `${currentSessionId.substring(0, 8)}...` : "N/A", valueClass: "text-gray-600 dark:text-gray-400" }
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl bg-gray-50 dark:bg-[#111214] px-4 py-3 flex items-center justify-between border border-gray-200 dark:border-white/5"
                  >
                    <span className="text-gray-700 dark:text-gray-300">{item.label}</span>
                    <span className={`font-medium text-right truncate max-w-[60%] ${item.valueClass}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-8 bg-white dark:bg-[#121214] rounded-2xl p-6 border border-gray-200 dark:border-white/5 shadow-lg">
          <div className="font-semibold text-gray-900 dark:text-white mb-2">Debugging/System Logs</div>
          <pre className="text-gray-600 dark:text-gray-400 text-sm overflow-x-auto">
            Tracking Status: {running && !paused ? "ACTIVE" : paused ? "PAUSED" : "INACTIVE"} | Session ID: {currentSessionId ?? "N/A"}
            <br />
            Live Focus Score: {liveFocusScore !== null ? `${liveFocusScore}%` : "Calculating..."}
            <br />
            Last API Message: {lastApiStatus ?? (error ?? "Waiting for session start...")}
          </pre>
        </div>
      </main>

      {toast && (
        <div
          className={`fixed right-8 bottom-24 z-[9999] px-6 py-3 rounded-2xl flex items-center gap-3
            transition-all duration-700 ease-cubic-bezier
            backdrop-blur-2xl border shadow-[0_8px_35px_rgba(0,0,0,0.25)]
            ${toast ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}
            bg-white/80 dark:bg-[#121214]/90
            border-gray-200/60 dark:border-white/10
            text-gray-900 dark:text-white
          `}
          style={{ boxShadow: "0 8px 25px rgba(0,0,0,0.25), 0 0 18px rgba(168,85,247,0.35), inset 0 0 2px rgba(255,255,255,0.1)" }}
        >
          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-400 shadow-[0_0_12px_rgba(168,85,247,0.7)]" />
          <span className="font-semibold tracking-wide text-[0.95rem]">{toast}</span>
        </div>
      )}
    </div>
  );
};

export default FocusMode;