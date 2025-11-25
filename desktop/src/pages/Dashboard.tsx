import React, { useEffect, useState } from "react";
import ThemeToggle from "../components/ThemeToggle";
import {
  Activity,
  Clock,
  TrendingUp,
  Cpu,
  Sparkles,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import axios from "axios";
import { BACKEND_URL } from "./config";

function getTodayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return {
    start: start.toISOString(),
    end: now.toISOString(),
  };
}

interface Session {
  _id: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  status: string;
  focusTimeline: Array<{
    timestamp: string;
    focusScore: number;
    distractionDetected?: boolean;
  }>;
  statistics?: {
    totalBreaksTaken?: number;
    totalFocusTime?: number;
    averageFocusScore?: number;
  };
}

interface AppUsage {
  name: string;
  category: string;
  minutes: number;
}

export default function Dashboard() {
  const [focusScore, setFocusScore] = useState(0);
  const [focusStatus, setFocusStatus] = useState("Loading...");
  const [sessionDuration, setSessionDuration] = useState("-");
  const [sessionStart, setSessionStart] = useState("-");
  const [isActiveSession, setIsActiveSession] = useState(false);
  const [todaysHighlights, setTodaysHighlights] = useState({
    productiveTime: "--",
    distractingTime: "--",
    breaksTaken: "--",
    focusSessions: "--",
  });
  const [activeApps, setActiveApps] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [focusTrend, setFocusTrend] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    
    // Optional: Auto-refresh every 30 seconds for active sessions
    const interval = setInterval(() => {
      if (isActiveSession) {
        loadDashboardData();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const getJwtToken = () =>
    typeof window !== "undefined" && window.localStorage
      ? window.localStorage.getItem("token") || ""
      : "";

  async function loadDashboardData() {
    try {
      setError(null);
      const jwt = getJwtToken();

      if (!jwt) {
        setError("Not authenticated");
        setFocusStatus("Please log in");
        setLoading(false);
        return;
      }

      // 1. Try to get current active session
      let session: Session | null = null;
      let isActive = false;

      try {
        const { data: sessionRes } = await axios.get(
          `${BACKEND_URL}/session/current`,
          { headers: { Authorization: `Bearer ${jwt}` } }
        );
        session = sessionRes.session;
        isActive = true;
        console.log("✅ Active session found:", session?._id);
      } catch (err) {
        // No active session, fetch last completed session
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          console.log("⚠️ No active session, fetching last session...");
          
          try {
            const { data: lastSessionRes } = await axios.get(
              `${BACKEND_URL}/session/last`,
              { headers: { Authorization: `Bearer ${jwt}` } }
            );
            session = lastSessionRes.session;
            isActive = false;
            console.log("✅ Last session found:", session?._id);
          } catch (lastErr) {
            console.error("❌ No previous session found:", lastErr);
          }
        } else {
          throw err;
        }
      }

      setIsActiveSession(isActive);

      // If still no session (neither active nor previous)
      if (!session) {
        setFocusStatus("No sessions yet");
        setFocusScore(0);
        setSessionDuration("-");
        setSessionStart("-");
        setActiveApps([]);
        setFocusTrend([]);
        setRecommendations([
          {
            text: "🚀 Start your first session to begin tracking your productivity!",
            border: "border-l-4 border-purple-400",
          },
        ]);
        setLoading(false);
        return;
      }

      // 2. Set session duration and start time
      const sessionStartTime = new Date(session.startTime).toLocaleTimeString(
        [],
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      );

      const sessionDate = !isActive
        ? ` on ${new Date(session.startTime).toLocaleDateString()}`
        : "";

      setSessionStart(sessionStartTime + sessionDate);

      // Calculate duration properly
      let durationMinutes = 0;
      if (session.duration) {
        durationMinutes = session.duration;
      } else if (session.endTime && session.startTime) {
        const start = new Date(session.startTime).getTime();
        const end = new Date(session.endTime).getTime();
        durationMinutes = Math.floor((end - start) / 1000 / 60);
      } else if (isActive && session.startTime) {
        // For active session, calculate from start to now
        const start = new Date(session.startTime).getTime();
        const now = Date.now();
        durationMinutes = Math.floor((now - start) / 1000 / 60);
      }

      const hours = Math.floor(durationMinutes / 60);
      const mins = durationMinutes % 60;
      setSessionDuration(
        durationMinutes > 0 ? `${hours}h ${mins}m` : "Just started"
      );

      // 3. Focus Score and Status
      const timeline = session.focusTimeline ?? [];
      console.log(`📊 Focus timeline entries: ${timeline.length}`);

      const score =
        timeline.length > 0
          ? Math.round(
              timeline.reduce((a: number, b: any) => a + (b.focusScore || 0), 0) /
                timeline.length
            )
          : 0;

      setFocusScore(score);

      // Update status message
      const focusMessage =
        score >= 80
          ? "Excellent focus"
          : score >= 60
          ? "Good focus"
          : score > 0
          ? "Can improve"
          : "No data yet";

      setFocusStatus(isActive ? focusMessage : `${focusMessage} (Last session)`);

      // 4. Focus Trend for chart - FIXED to show proper timeline
      if (timeline.length > 0) {
        const trendData = timeline
          .map((f: any) => {
            const timestamp = new Date(f.timestamp);
            return {
              time: timestamp.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              focus: Math.round(f.focusScore || 0),
              fullTimestamp: timestamp.getTime(), // For sorting
            };
          })
          .sort((a, b) => a.fullTimestamp - b.fullTimestamp) // Sort chronologically
          .map(({ time, focus }) => ({ time, focus })); // Remove sorting field

        setFocusTrend(trendData);
        console.log(`📈 Focus trend data points: ${trendData.length}`);
      } else {
        setFocusTrend([]);
      }

      // 5. Per-session active app usage
      try {
        const { data: appUsageRes } = await axios.get(
          `${BACKEND_URL}/activities/session/${session._id}/app-usage`,
          { headers: { Authorization: `Bearer ${jwt}` } }
        );

        const appUsageData = appUsageRes.appUsage || [];
        console.log(`💻 App usage entries: ${appUsageData.length}`);

        setActiveApps(
          appUsageData.slice(0, 5).map((app: AppUsage) => {
            const category = app.category || "neutral";
            const categoryCapitalized =
              category.charAt(0).toUpperCase() + category.slice(1);

            return {
              name: app.name || "Unknown",
              status: categoryCapitalized,
              time: `${Math.round(app.minutes || 0)} min`,
              color:
                category === "productive"
                  ? "text-green-600 dark:text-green-400"
                  : category === "distraction"
                  ? "text-orange-600 dark:text-orange-400"
                  : "text-gray-500",
            };
          })
        );
      } catch (appErr) {
        console.error("⚠️ Failed to fetch app usage:", appErr);
        setActiveApps([]);
      }

      // 6. Today's highlights (aggregate activities)
      try {
        const { start, end } = getTodayRange();
        const { data: highlightsData } = await axios.get(
          `${BACKEND_URL}/activity?start=${start}&end=${end}`,
          { headers: { Authorization: `Bearer ${jwt}` } }
        );

        const allActs = highlightsData.activities || [];
        console.log(`📅 Today's activities: ${allActs.length}`);

        let prodSecs = 0;
        let distrSecs = 0;
        
        allActs.forEach((a: any) => {
          const interval = 5; // 5 seconds per activity log
          if (a.activeApp?.category === "productive") prodSecs += interval;
          if (a.activeApp?.category === "distraction") distrSecs += interval;
        });

        setTodaysHighlights({
          productiveTime: `${Math.round(prodSecs / 60)} min`,
          distractingTime: `${Math.round(distrSecs / 60)} min`,
          breaksTaken: String(session.statistics?.totalBreaksTaken ?? 0),
          focusSessions: String(highlightsData.total || 1),
        });
      } catch (highlightErr) {
        console.error("⚠️ Failed to fetch highlights:", highlightErr);
        setTodaysHighlights({
          productiveTime: "--",
          distractingTime: "--",
          breaksTaken: String(session.statistics?.totalBreaksTaken ?? 0),
          focusSessions: "1",
        });
      }

      // 7. Recommendations
      const recommendationText = isActive
        ? score >= 80
          ? "🎯 Amazing job! Keep using your top productive apps."
          : score >= 60
          ? "💪 Good progress! Try to maintain this momentum."
          : score > 0
          ? "📈 Try to limit distraction apps and stay focused."
          : "🚀 Keep working - data will appear soon!"
        : score >= 80
        ? "🏆 Your last session was excellent! Start a new one to continue."
        : score > 0
        ? "🔄 Ready for another session? Let's improve on your last one!"
        : "✨ Start a new session to track your productivity!";

      setRecommendations([
        {
          text: recommendationText,
          border:
            score >= 80
              ? "border-l-4 border-green-400"
              : score >= 60
              ? "border-l-4 border-blue-400"
              : "border-l-4 border-orange-400",
        },
      ]);

      setLoading(false);
    } catch (err) {
      console.error("❌ Dashboard load error:", err);

      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          setError("Authentication failed. Please log in again.");
        } else {
          setError(
            `Error loading dashboard: ${
              err.response?.data?.msg || err.response?.data?.error || err.message
            }`
          );
        }
      } else {
        setError("An unexpected error occurred while loading dashboard");
      }
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-[#0B0B0F] dark:to-[#151518]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-900 dark:from-[#0B0B0F] dark:to-[#151518] dark:text-gray-100 transition-colors duration-500">
      {/* Top bar */}
      <header className="flex items-center justify-between px-10 py-6 border-b border-gray-200 dark:border-white/10 transition-colors duration-500">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {isActiveSession
              ? "Monitor your productivity and focus in real-time"
              : "Review your last session's productivity"}
          </p>
        </div>
        <ThemeToggle />
      </header>

      {/* Error Display */}
      {error && (
        <div className="mx-10 mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 px-10 py-8">
        {/* Top Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Focus Score */}
          <div className="rounded-2xl p-6 border border-gray-100 dark:border-white/5 bg-white/80 dark:bg-[#121214] shadow transition-all duration-500">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-500" />
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Focus Score
                </h2>
              </div>
              {!isActiveSession && (
                <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-400">
                  Last Session
                </span>
              )}
            </div>
            <div className="flex items-center justify-between flex-col gap-3">
              <div className="relative w-24 h-24">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    className="text-gray-200 dark:text-gray-700"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="url(#gradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 - (focusScore / 100) * 251.2}
                    fill="none"
                    style={{ transition: "stroke-dashoffset 0.5s ease" }}
                  />
                  <defs>
                    <linearGradient
                      id="gradient"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-purple-500 dark:text-purple-400">
                    {focusScore}
                  </span>
                </div>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm text-center">
                {focusStatus}
              </p>
            </div>
          </div>

          {/* Session Duration */}
          <div className="rounded-2xl p-6 border border-gray-100 dark:border-white/5 bg-white/80 dark:bg-[#121214] shadow transition-all duration-500">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-purple-500" />
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Session Duration
              </h2>
            </div>
            <div className="flex items-center flex-col">
              <p className="text-4xl font-bold text-purple-500 dark:text-purple-400 mb-1">
                {sessionDuration}
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Started at {sessionStart}
              </p>
            </div>
          </div>

          {/* Today's Highlights */}
          <div className="rounded-2xl p-6 border border-gray-100 dark:border-white/5 bg-white/80 dark:bg-[#121214] shadow transition-all duration-500">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Today's Highlights
              </h2>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">
                  Productive Time
                </span>
                <span className="text-green-500 dark:text-green-400 font-medium">
                  {todaysHighlights.productiveTime}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">
                  Distracting Time
                </span>
                <span className="text-orange-500 dark:text-orange-400 font-medium">
                  {todaysHighlights.distractingTime}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">
                  Breaks Taken
                </span>
                <span className="text-gray-900 dark:text-white">
                  {todaysHighlights.breaksTaken}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">
                  Focus Sessions
                </span>
                <span className="text-gray-900 dark:text-white">
                  {todaysHighlights.focusSessions}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Active Applications */}
          <div className="rounded-2xl p-6 border border-gray-100 dark:border-white/5 bg-white/80 dark:bg-[#121214] shadow transition-all duration-500">
            <div className="flex items-center gap-2 mb-3">
              <Cpu className="w-4 h-4 text-purple-500" />
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Active Applications
              </h2>
            </div>
            <div className="space-y-3">
              {activeApps.length > 0 ? (
                activeApps.map((app, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-gray-100 dark:bg-[#18181B] rounded-xl px-4 py-3 hover:bg-gray-200 dark:hover:bg-[#202024] transition-all duration-300"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {app.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {app.status}
                      </p>
                    </div>
                    <p className={`font-semibold ${app.color}`}>{app.time}</p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                  No app activity tracked yet
                </p>
              )}
            </div>
          </div>

          {/* AI Recommendations */}
          <div className="rounded-2xl p-6 border border-gray-100 dark:border-white/5 bg-white/80 dark:bg-[#121214] shadow transition-all duration-500">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <h2 className="font-semibold text-gray-900 dark:text-white">
                AI Recommendations
              </h2>
            </div>
            <div className="space-y-3">
              {recommendations.map((rec, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-xl bg-gray-100 dark:bg-[#18181B] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#202024] transition-all duration-300 ${rec.border}`}
                >
                  {rec.text}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Focus Trend Chart */}
        <div className="rounded-2xl p-6 border border-gray-100 dark:border-white/5 bg-white/80 dark:bg-[#121214] shadow transition-all duration-500">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-purple-500" />
            <h2 className="font-semibold text-gray-900 dark:text-white">
              {isActiveSession ? "Today's" : "Session"} Focus Trend
            </h2>
          </div>
          {focusTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={focusTrend} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.1} />
                <XAxis 
                  dataKey="time" 
                  stroke="#666"
                  tick={{ fill: '#666', fontSize: 12 }}
                  tickLine={{ stroke: '#666' }}
                />
                <YAxis 
                  domain={[0, 100]}
                  stroke="#666"
                  tick={{ fill: '#666', fontSize: 12 }}
                  tickLine={{ stroke: '#666' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #a855f7",
                    borderRadius: "8px",
                    color: "#111",
                  }}
                  labelStyle={{ color: "#a855f7", fontWeight: "bold" }}
                  wrapperStyle={{
                    boxShadow: "0 5px 20px rgba(168,85,247,0.1)",
                  }}
                  formatter={(value: any) => [`${value}%`, "Focus Score"]}
                />
                <Line
                  type="monotone"
                  dataKey="focus"
                  stroke="#a855f7"
                  strokeWidth={3}
                  dot={{ fill: "#a855f7", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                  animationDuration={500}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-6xl mb-4">📊</div>
              <p className="text-gray-500 dark:text-gray-400 text-center">
                No focus data available yet.
                <br />
                <span className="text-sm">
                  {isActiveSession
                    ? "Data will appear as you work"
                    : "Start a session to see your trends"}
                </span>
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
