import React, { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid,
} from "recharts";
import { Calendar, Download } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import toast, { Toaster } from "react-hot-toast";

const weeklyData = [
  { day: "Mon", productive: 240, distracting: 60 },
  { day: "Tue", productive: 200, distracting: 80 },
  { day: "Wed", productive: 280, distracting: 90 },
  { day: "Thu", productive: 220, distracting: 70 },
  { day: "Fri", productive: 300, distracting: 50 },
  { day: "Sat", productive: 180, distracting: 100 },
  { day: "Sun", productive: 100, distracting: 140 },
];

const focusScoreData = [
  { day: "Mon", score: 70 },
  { day: "Tue", score: 72 },
  { day: "Wed", score: 75 },
  { day: "Thu", score: 78 },
  { day: "Fri", score: 82 },
  { day: "Sat", score: 76 },
  { day: "Sun", score: 74 },
];

const categoryData = [
  { category: "Development", time: 300 },
  { category: "Communication", time: 180 },
  { category: "Design", time: 150 },
  { category: "Social Media", time: 90 },
  { category: "Entertainment", time: 120 },
  { category: "News", time: 60 },
];

export default function Analytics() {
  const [view, setView] = useState<"day" | "week" | "month">("week");

  const exportReport = async () => {
    try {
      const element = document.getElementById("analytics-report"); 
      if (!element) return;

      const canvas = await html2canvas(element, { scale: 2, useCORS: true }); 
      const pdf = new jsPDF("p", "mm", "a4");
      const imgData = canvas.toDataURL("image/png");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save("Productivity_Report.pdf");

      const isDark = document.documentElement.classList.contains("dark");

      toast.success("📄 Report downloaded successfully!", {
        duration: 3000,
        position: "bottom-right",
        style: {
          background: isDark
            ? "linear-gradient(135deg, #18181b, #1f1f24)"
            : "linear-gradient(135deg, #fafafa, #f3e8ff)",
          color: isDark ? "#f3f3f3" : "#1a1a1a",
          border: isDark
            ? "1px solid rgba(168,85,247,0.4)"
            : "1px solid rgba(147,51,234,0.3)",
          boxShadow: isDark
            ? "0 8px 25px rgba(0,0,0,0.4)"
            : "0 8px 25px rgba(147,51,234,0.15)",
          borderRadius: "12px",
          fontWeight: 500,
          padding: "12px 16px",
        },
        iconTheme: {
          primary: isDark ? "#a855f7" : "#9333ea",
          secondary: "#fff",
        },
      });
    } catch (error) {
      console.error("Error exporting report:", error);
      toast.error("❌ Failed to export report. Try again.", {
        duration: 3000,
        position: "bottom-right",
        style: {
          background: "#ffeded",
          color: "#7f1d1d",
          borderRadius: "10px",
          fontWeight: 500,
        },
      });
    }
  };

  return (
    <div className="flex flex-col min-h-screen transition-colors duration-300 bg-gray-50 dark:bg-[#0B0B0F] text-gray-900 dark:text-gray-100">
      {/* ✅ Toaster for toast notifications */}
      <Toaster position="bottom-right" />

      {/* Header */}
      <header className="px-10 py-6 border-b border-gray-200 dark:border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">
            Productivity Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
            Detailed insights into your work patterns
          </p>
        </div>

        <div className="flex gap-3 mt-4 md:mt-0">
          {["day", "week", "month"].map((label) => (
            <button
              key={label}
              onClick={() => setView(label as "day" | "week" | "month")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium border transition-all ${
                view === label
                  ? "bg-gradient-to-r from-purple-600 to-purple-400 text-white shadow-md"
                  : "bg-gray-100 dark:bg-[#1a1a1d] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-[#222]"
              }`}
            >
              <Calendar className="w-4 h-4" />
              {label.charAt(0).toUpperCase() + label.slice(1)}
            </button>
          ))}

          <button
            onClick={exportReport}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-400 text-white font-medium shadow-md hover:shadow-lg transition"
          >
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>
      </header>

      {/* Main Section */}
      <main id="analytics-report" className="flex-1 px-10 py-8 space-y-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1 */}
          <div className="bg-white dark:bg-[#121214] rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-white/10 hover:shadow-purple-700/10 transition">
            <h3 className="text-lg font-semibold text-purple-500 dark:text-purple-400">Total Productive</h3>
            <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-white">29 hrs</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">+17h 15m this week</p>
          </div>

          {/* Card 2 */}
          <div className="bg-white dark:bg-[#121214] rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-white/10 hover:shadow-purple-700/10 transition">
            <h3 className="text-lg font-semibold text-purple-500 dark:text-purple-400">Total Distracting</h3>
            <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-white">4 hrs</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">+255 min this week</p>
          </div>

          {/* Card 3 */}
          <div className="bg-white dark:bg-[#121214] rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-white/10 hover:shadow-purple-700/10 transition">
            <h3 className="text-lg font-semibold text-purple-500 dark:text-purple-400">Average Focus Score</h3>
            <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-white">76</p>
            <p className="text-sm text-green-500 mt-1">+5% from last week</p>
          </div>

          {/* Card 4 */}
          <div className="bg-white dark:bg-[#121214] rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-white/10 hover:shadow-purple-700/10 transition">
            <h3 className="text-lg font-semibold text-purple-500 dark:text-purple-400">Productivity Rate</h3>
            <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-white">87%</p>
            <p className="text-sm text-green-500 mt-1">+8% improvement</p>
          </div>
        </div>

        {/* Weekly Bar Chart */}
        <div className="bg-white dark:bg-[#121214] rounded-2xl p-6 shadow-md border border-gray-200 dark:border-white/10">
          <h3 className="text-xl font-semibold mb-4 text-purple-500 dark:text-purple-400">
            Weekly Time Usage
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyData}>
              <XAxis dataKey="day" stroke="#9CA3AF" />
              <YAxis domain={[0, 320]} stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1d",
                  border: "1px solid #a855f7",
                  borderRadius: "10px",
                  color: "#fff",
                }}
              />
              <Bar dataKey="productive" fill="#a855f7" name="Productive Min" radius={[6, 6, 0, 0]} />
              <Bar dataKey="distracting" fill="#f97316" name="Distracting Min" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-3">
            <span className="text-purple-400">■ Productive Min</span> &nbsp;&nbsp;
            <span className="text-orange-400">■ Distracting Min</span>
          </div>
        </div>

        {/* Bottom Row: 2 Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Focus Score Trend */}
          <div className="bg-white dark:bg-[#121214] rounded-2xl p-6 border border-gray-200 dark:border-white/10 shadow-md">
            <h3 className="text-xl font-semibold mb-4 text-purple-500 dark:text-purple-400">
              Focus Score Trend
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={focusScoreData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2d" />
                <XAxis dataKey="day" stroke="#9CA3AF" />
                <YAxis domain={[0, 100]} stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1a1d",
                    border: "1px solid #a855f7",
                    borderRadius: "10px",
                    color: "#fff",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#a855f7"
                  strokeWidth={3}
                  dot={{ fill: "#a855f7", r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Time by Category */}
          <div className="bg-white dark:bg-[#121214] rounded-2xl p-6 border border-gray-200 dark:border-white/10 shadow-md">
            <h3 className="text-xl font-semibold mb-4 text-purple-500 dark:text-purple-400">
              Time by Category
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={categoryData} layout="vertical" margin={{ top: 5, right: 10, left: 50, bottom: 5 }}>
                <XAxis type="number" stroke="#9CA3AF" />
                <YAxis dataKey="category" type="category" stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1a1d",
                    border: "1px solid #a855f7",
                    borderRadius: "10px",
                    color: "#fff",
                  }}
                />
                <Bar dataKey="time" fill="#a855f7" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </main>
    </div>
  );
}
