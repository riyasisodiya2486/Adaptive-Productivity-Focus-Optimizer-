import ThemeToggle from "../components/ThemeToggle";
import { Activity, Clock, TrendingUp, Cpu, Sparkles } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useDashboard } from "../context/DashboardContext";

export default function Dashboard() {
  const {
    focusScore,
    focusStatus,
    sessionDuration,
    sessionStart,
    todaysHighlights,
    activeApps,
    recommendations,
    focusTrend,
  } = useDashboard();

  return (
    <div
      className="flex flex-col min-h-screen 
      bg-gradient-to-b from-gray-50 to-white text-gray-900 
      dark:from-[#0B0B0F] dark:to-[#151518] dark:text-gray-100 
      transition-colors duration-500"
    >
      {/* Top bar */}
      <header
        className="flex items-center justify-between px-10 py-6 border-b 
        border-gray-200 dark:border-white/10 transition-colors duration-500"
      >
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Monitor your productivity and focus in real-time
          </p>
        </div>
        <ThemeToggle />
      </header>

      {/* Main Content */}
      <main className="flex-1 px-10 py-8">
        {/* Top Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Focus Score */}
          <div
            className="rounded-2xl p-6 border border-gray-100 dark:border-white/5 
            bg-white/80 dark:bg-[#121214] shadow-[0_8px_30px_rgba(168,85,247,0.05)] 
            dark:shadow-lg dark:hover:shadow-purple-700/10 
            hover:shadow-[0_8px_35px_rgba(168,85,247,0.15)] 
            transition-all duration-500"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-500" />
                <h2 className="font-semibold text-gray-900 dark:text-white">Focus Score</h2>
              </div>
            </div>
            <div className="flex items-center justify-between flex-col gap-3">
              <div className="relative w-24 h-24">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="rgba(0,0,0,0.1)"
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
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-purple-500 dark:text-purple-400">{focusScore}</span>
                </div>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">{focusStatus}</p>
            </div>
          </div>

          {/* Session Duration */}
          <div
            className="rounded-2xl p-6 border border-gray-100 dark:border-white/5 
            bg-white/80 dark:bg-[#121214] shadow-[0_8px_30px_rgba(168,85,247,0.05)] 
            dark:shadow-lg hover:shadow-[0_8px_35px_rgba(168,85,247,0.15)] 
            dark:hover:shadow-purple-700/10 transition-all duration-500"
          >
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-purple-500" />
              <h2 className="font-semibold text-gray-900 dark:text-white">Session Duration</h2>
            </div>
            <div className="flex items-center flex-col">
              <p className="text-4xl font-bold text-purple-500 dark:text-purple-400 mb-1">{sessionDuration}</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Started at {sessionStart}</p>
            </div>
          </div>

          {/* Today's Highlights */}
          <div
            className="rounded-2xl p-6 border border-gray-100 dark:border-white/5 
            bg-white/80 dark:bg-[#121214] shadow-[0_8px_30px_rgba(168,85,247,0.05)] 
            dark:shadow-lg hover:shadow-[0_8px_35px_rgba(168,85,247,0.15)] 
            dark:hover:shadow-purple-700/10 transition-all duration-500"
          >
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              <h2 className="font-semibold text-gray-900 dark:text-white">Today's Highlights</h2>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Productive Time</span>
                <span className="text-green-500 font-medium">{todaysHighlights.productiveTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Distracting Time</span>
                <span className="text-orange-500 font-medium">{todaysHighlights.distractingTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Breaks Taken</span>
                <span className="text-gray-900 dark:text-white">{todaysHighlights.breaksTaken}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Focus Sessions</span>
                <span className="text-gray-900 dark:text-white">{todaysHighlights.focusSessions}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Active Applications */}
          <div
            className="rounded-2xl p-6 border border-gray-100 dark:border-white/5 
            bg-white/80 dark:bg-[#121214] shadow-[0_8px_30px_rgba(168,85,247,0.05)] 
            dark:shadow-lg hover:shadow-[0_8px_35px_rgba(168,85,247,0.15)] 
            dark:hover:shadow-purple-700/10 transition-all duration-500"
          >
            <div className="flex items-center gap-2 mb-3">
              <Cpu className="w-4 h-4 text-purple-500" />
              <h2 className="font-semibold text-gray-900 dark:text-white">Active Applications</h2>
            </div>
            <div className="space-y-3">
              {activeApps.map((app, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-gray-100 dark:bg-[#18181B] 
                    rounded-xl px-4 py-3 hover:bg-gray-200 dark:hover:bg-[#202024] 
                    transition-all duration-300"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{app.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">{app.status}</p>
                  </div>
                  <p className={`font-semibold ${app.color}`}>{app.time}</p>
                </div>
              ))}
            </div>
          </div>

          {/* AI Recommendations */}
          <div
            className="rounded-2xl p-6 border border-gray-100 dark:border-white/5 
            bg-white/80 dark:bg-[#121214] shadow-[0_8px_30px_rgba(168,85,247,0.05)] 
            dark:shadow-lg hover:shadow-[0_8px_35px_rgba(168,85,247,0.15)] 
            dark:hover:shadow-purple-700/10 transition-all duration-500"
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <h2 className="font-semibold text-gray-900 dark:text-white">AI Recommendations</h2>
            </div>
            <div className="space-y-3">
              {recommendations.map((rec, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-xl bg-gray-100 dark:bg-[#18181B] text-gray-700 dark:text-gray-300 
                    hover:bg-gray-200 dark:hover:bg-[#202024] transition-all duration-300 ${rec.border}`}
                >
                  {rec.text}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Focus Trend Chart */}
        <div
          className="rounded-2xl p-6 border border-gray-100 dark:border-white/5 
          bg-white/80 dark:bg-[#121214] shadow-[0_8px_30px_rgba(168,85,247,0.05)] 
          dark:shadow-lg hover:shadow-[0_8px_35px_rgba(168,85,247,0.15)] 
          dark:hover:shadow-purple-700/10 transition-all duration-500"
        >
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-purple-500" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Today's Focus Trend</h2>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={focusTrend}>
              <XAxis dataKey="time" stroke="#666" />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #a855f7",
                  borderRadius: "8px",
                  color: "#111",
                }}
                labelStyle={{ color: "#a855f7" }}
                wrapperStyle={{
                  boxShadow: "0 5px 20px rgba(168,85,247,0.1)",
                }}
              />
              <Line
                type="monotone"
                dataKey="focus"
                stroke="#a855f7"
                strokeWidth={3}
                dot={{ fill: "#a855f7", strokeWidth: 2, r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </main>
    </div>
  );
}
