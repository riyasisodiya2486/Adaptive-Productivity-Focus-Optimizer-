import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid,
} from "recharts";
import { Calendar, Download, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import toast, { Toaster } from "react-hot-toast";
import axios from "axios"; 
// Assuming a config file exports BACKEND_URL, e.g., "http://localhost:5000/api/v1"
import { BACKEND_URL } from "./config"; 

// --- Interfaces matching the CORRECTED Backend Controller Returns ---
interface OverviewData {
  totalProductiveTime: number; // in minutes
  totalDistractingTime: number; // in minutes
  averageFocusScore: number;
  productivityRate: number; // in percent
  productiveChange: number; // minute change from previous period
  distractingChange: number; // minute change from previous period
  scoreChange: number; // percent change from previous period
  rateChange: number; // percent change from previous period
}

interface TrendData {
  label: string;
  productive: number;
  distracting: number;
}

interface FocusTrendData {
  label: string;
  score: number;
}

interface AppCategoryData {
    category: string;
    time: number; // in minutes
}

type ViewPeriod = "day" | "week" | "month";

// --- Helper Functions ---

// Helper to convert minutes to a human-readable string (e.g., 65 -> "1h 5m")
const formatMinutes = (minutes: number): string => {
    if (minutes === 0) return "0 min";
    const absMinutes = Math.abs(minutes);
    const h = Math.floor(absMinutes / 60);
    const m = Math.round(absMinutes % 60);
    return `${h > 0 ? h + "h " : ""}${m}m`;
};

// Helper to get JWT token from localStorage
const getJwtToken = () =>
  typeof window !== "undefined" && window.localStorage
    ? window.localStorage.getItem("token") || ""
    : "";

// Helper for dynamic trend text color
const getTrendColor = (change: number): string => 
  change > 0 ? "text-green-500" : change < 0 ? "text-red-500" : "text-gray-500";
const getTrendSign = (change: number): string => (change > 0 ? "+" : "");


// --- Main Component ---
export default function Analytics() {
  const [view, setView] = useState<ViewPeriod>("week");
  const [loading, setLoading] = useState(true); 
  const [error, setError] = useState<string | null>(null); 

  // States for fetched data
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [timeTrends, setTimeTrends] = useState<TrendData[]>([]);
  const [focusTrends, setFocusTrends] = useState<FocusTrendData[]>([]);
  const [categoryTime, setCategoryTime] = useState<AppCategoryData[]>([]);

  // Data Fetching Logic
  const loadAnalyticsData = useCallback(async (period: ViewPeriod) => {
    setLoading(true);
    setError(null);
    const jwt = getJwtToken();
    if (!jwt) {
      setError("Authentication required. Please log in.");
      setLoading(false);
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${jwt}` };
      const apiBase = `${BACKEND_URL}/analytics`;

      // Use Promise.all to fetch data concurrently
      const [overviewRes, focusRes, appRes, distractionRes] = await Promise.all([
        axios.get<OverviewData>(`${apiBase}/overview?period=${period}`, { headers }),
        axios.get<FocusTrendData[]>(`${apiBase}/focus-trends?period=${period}`, { headers }),
        axios.get<{ trends: TrendData[] }>(`${apiBase}/apps?period=${period}`, { headers }),
        axios.get<{ appCategories: AppCategoryData[] }>(`${apiBase}/distractions?period=${period}`, { headers }),
      ]);
      
      setOverviewData(overviewRes.data);
      setFocusTrends(focusRes.data);
      setTimeTrends(appRes.data.trends); 
      setCategoryTime(distractionRes.data.appCategories); 

    } catch (err: any) {
      console.error("Error loading analytics data:", err);
      // Check for common error status codes (e.g., 404, 401)
      const status = err.response?.status;
      if (status === 401 || status === 403) {
          setError("Session expired or unauthorized. Please re-login.");
      } else if (status === 404) {
          setError("No data found for this period or API endpoints not found.");
      } else {
          setError("Failed to load analytics data. Server error or network issue.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalyticsData(view);
  }, [view, loadAnalyticsData]);


  // Export Report Logic (Client-Side Screenshot)
  const exportReport = async () => {
    try {
      const element = document.getElementById("analytics-report"); 
      if (!element) return;

      const canvas = await html2canvas(element, { scale: 2, useCORS: true }); 
      const pdf = new jsPDF("p", "mm", "a4");
      const imgData = canvas.toDataURL("image/png");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let position = 0;
      let heightLeft = pdfHeight;
      
      // Handle multi-page content
      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();

      while (heightLeft >= 0) {
          position = heightLeft - pdfHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
          heightLeft -= pdf.internal.pageSize.getHeight();
      }

      pdf.save(`Productivity_Report_${view}_${new Date().toISOString().slice(0, 10)}.pdf`);

      const isDark = document.documentElement.classList.contains("dark");
      toast.success("📄 Report downloaded successfully!", {
          // Toast styling for success
          duration: 3000, position: "bottom-right", 
          style: { background: isDark ? "linear-gradient(135deg, #18181b, #1f1f24)" : "linear-gradient(135deg, #fafafa, #f3e8ff)", color: isDark ? "#f3f3f3" : "#1a1a1a", border: isDark ? "1px solid rgba(168,85,247,0.4)" : "1px solid rgba(147,51,234,0.3)", boxShadow: isDark ? "0 8px 25px rgba(0,0,0,0.4)" : "0 8px 25px rgba(147,51,234,0.15)", borderRadius: "12px", fontWeight: 500, padding: "12px 16px", }, iconTheme: { primary: isDark ? "#a855f7" : "#9333ea", secondary: "#fff", },
      });
    } catch (error) {
      console.error("Error exporting report:", error);
      toast.error("❌ Failed to export report. Try again.", {
          // Toast styling for error
          duration: 3000, position: "bottom-right", style: { background: "#ffeded", color: "#7f1d1d", borderRadius: "10px", fontWeight: 500, },
      });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-[#0B0B0F]">
        <Loader2 className="animate-spin h-16 w-16 text-purple-500 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400 text-lg">Loading analytics for the **{view}**...</p>
      </div>
    );
  }

  if (error) {
    return (
        <div className="px-10 py-8 text-center min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0B0B0F]">
            <div className="bg-red-50 dark:bg-red-900/20 p-8 rounded-xl border border-red-300 dark:border-red-700 shadow-lg">
                <h2 className="text-3xl font-bold mb-4 text-red-600 dark:text-red-400">🚨 Data Error</h2>
                <p className="text-lg text-red-700 dark:text-red-300">{error}</p>
                <p className="text-sm text-red-500 dark:text-red-500 mt-2">Check console for details and ensure the backend is running and URL is correct.</p>
            </div>
        </div>
    );
  }

  const productiveTimeFormatted = formatMinutes(overviewData?.totalProductiveTime ?? 0);
  const distractingTimeFormatted = formatMinutes(overviewData?.totalDistractingTime ?? 0);
  
  return (
    <div className="flex flex-col min-h-screen transition-colors duration-300 bg-gray-50 dark:bg-[#0B0B0F] text-gray-900 dark:text-gray-100">
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
              onClick={() => setView(label as ViewPeriod)}
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
      
      {/* --- Main Section --- */}
      <main id="analytics-report" className="flex-1 px-10 py-8 space-y-8">
        
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Card 1: Total Productive */}
          <div className="bg-white dark:bg-[#121214] rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-white/10 hover:shadow-purple-700/10 transition">
            <h3 className="text-lg font-semibold text-purple-500 dark:text-purple-400">Total Productive</h3>
            <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-white">{productiveTimeFormatted}</p>
            <p className="text-sm mt-1" style={{ color: getTrendColor(overviewData?.productiveChange ?? 0) }}>
                {getTrendSign(overviewData?.productiveChange ?? 0)}{formatMinutes(overviewData?.productiveChange ?? 0)} this {view}
            </p>
          </div>

          {/* Card 2: Total Distracting */}
          <div className="bg-white dark:bg-[#121214] rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-white/10 hover:shadow-purple-700/10 transition">
            <h3 className="text-lg font-semibold text-purple-500 dark:text-purple-400">Total Distracting</h3>
            <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-white">{distractingTimeFormatted}</p>
            <p className="text-sm mt-1" style={{ color: getTrendColor(-(overviewData?.distractingChange ?? 0)) }}> {/* Inverted color logic: less distraction is good */}
                {getTrendSign(overviewData?.distractingChange ?? 0)}{formatMinutes(overviewData?.distractingChange ?? 0)} this {view}
            </p>
          </div>

          {/* Card 3: Average Focus Score */}
          <div className="bg-white dark:bg-[#121214] rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-white/10 hover:shadow-purple-700/10 transition">
            <h3 className="text-lg font-semibold text-purple-500 dark:text-purple-400">Average Focus Score</h3>
            <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-white">{overviewData?.averageFocusScore ?? "--"}</p>
            <p className="text-sm mt-1" style={{ color: getTrendColor(overviewData?.scoreChange ?? 0) }}>
                {getTrendSign(overviewData?.scoreChange ?? 0)}{Math.abs(overviewData?.scoreChange ?? 0)}% from last {view}
            </p>
          </div>

          {/* Card 4: Productivity Rate */}
          <div className="bg-white dark:bg-[#121214] rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-white/10 hover:shadow-purple-700/10 transition">
            <h3 className="text-lg font-semibold text-purple-500 dark:text-purple-400">Productivity Rate</h3>
            <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-white">{overviewData?.productivityRate ?? "--"}%</p>
            <p className="text-sm mt-1" style={{ color: getTrendColor(overviewData?.rateChange ?? 0) }}>
                {getTrendSign(overviewData?.rateChange ?? 0)}{Math.abs(overviewData?.rateChange ?? 0)}% improvement
            </p>
          </div>
        </div>

        {/* Weekly Bar Chart */}
        <div className="bg-white dark:bg-[#121214] rounded-2xl p-6 shadow-md border border-gray-200 dark:border-white/10">
          <h3 className="text-xl font-semibold mb-4 text-purple-500 dark:text-purple-400">
            {view.charAt(0).toUpperCase() + view.slice(1)} Time Usage
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={timeTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2d" vertical={false} />
              <XAxis dataKey="label" stroke="#9CA3AF" />
              <YAxis domain={[0, 'auto']} stroke="#9CA3AF" tickFormatter={(value) => `${value}m`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1d",
                  border: "1px solid #a855f7",
                  borderRadius: "10px",
                  color: "#fff",
                }}
                formatter={(value: any, name: string) => [`${value} min`, name]}
              />
              <Bar dataKey="productive" fill="#a855f7" name="Productive Min" stackId="a" radius={[6, 6, 0, 0]} />
              <Bar dataKey="distracting" fill="#f97316" name="Distracting Min" stackId="a" radius={[6, 6, 0, 0]} />
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
              <LineChart data={focusTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2d" />
                <XAxis dataKey="label" stroke="#9CA3AF" />
                <YAxis domain={[0, 100]} stroke="#9CA3AF" tickFormatter={(value) => `${value}%`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1a1d",
                    border: "1px solid #a855f7",
                    borderRadius: "10px",
                    color: "#fff",
                  }}
                  formatter={(value: any) => [`${value}%`, "Focus Score"]}
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
              Top Time Categories ({view})
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={categoryTime} layout="vertical" margin={{ top: 5, right: 10, left: 50, bottom: 5 }}>
                <XAxis type="number" stroke="#9CA3AF" tickFormatter={(value) => `${value}m`} />
                <YAxis dataKey="category" type="category" stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1a1d",
                    border: "1px solid #a855f7",
                    borderRadius: "10px",
                    color: "#fff",
                  }}
                  formatter={(value: any) => [`${value} min`, "Time"]}
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