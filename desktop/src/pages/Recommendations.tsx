import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCcw,
  AlertCircle,
  CheckCircle,
  Tag,
  Clock,
  Trash2,
  Check,
  Lightbulb,
} from "lucide-react";
import axios from "axios";
import { BACKEND_URL } from "./config";

type Recommendation = {
  _id: string;
  recommendation: string;
  type: "focus" | "break" | string;
  context: {
    distractions: string[];
    recentActivity: string;
    focusScore: number;
    sessionDuration?: number;
  };
  timestamp: string;
  priority: "low" | "medium" | "high";
  completed?: boolean;
};

const API_BASE = BACKEND_URL + "/recommendations";

const Recommendations: React.FC = () => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Utility to get JWT from localStorage
  const getJwtToken = () => localStorage.getItem("token") || "";

  // Fetch latest active recommendations from backend
  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const jwt = getJwtToken();
      const res = await axios.get(`${API_BASE}/history`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      console.log(res.data.history);
      if (res.data?.history) {
        setRecommendations(res.data.history);
      } else {
        setRecommendations([]);
      }
    } catch (err: any) {
      console.error("Failed to fetch recommendations", err);
      setRecommendations([]);
      setError("Failed to load recommendations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecommendations();

    // Optional: Poll every 60 seconds for fresh recommendations
    const intervalId = setInterval(fetchRecommendations, 60000);

    return () => clearInterval(intervalId);
  }, [fetchRecommendations]);

  // Toggle expand/collapse recommendation description
  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Remove recommendation from list (frontend only)
  const handleRemove = (id: string) => {
    setRecommendations((prev) => prev.filter((r) => r._id !== id));
  };

  // Mark recommendation as completed (frontend only)
  const handleComplete = (id: string) => {
    setRecommendations((prev) =>
      prev.map((r) => (r._id === id ? { ...r, completed: true } : r))
    );
  };

  // Format timestamp nicely
  const formatTime = (ts: string) => {
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return "";
    }
  };

  return (
    <div className="flex flex-col min-h-screen transition-colors duration-300 bg-gray-50 dark:bg-[#0B0B0F] text-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="px-10 py-6 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-300 bg-clip-text text-transparent">
            AI Recommendations
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Personalized suggestions to improve your focus and productivity.
          </p>
          {error && (
            <p className="text-red-500 text-sm mt-2">
              {error}
            </p>
          )}
        </div>
        <button
          onClick={fetchRecommendations}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-600 to-purple-400 text-white font-medium hover:opacity-90 transition"
          title="Refresh recommendations"
          disabled={loading}
        >
          <RefreshCcw className="w-4 h-4" />
          Refresh
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-10 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Lightbulb className="w-6 h-6 text-purple-500" />
          <h2 className="text-2xl font-semibold">Active Suggestions</h2>
          <span className="text-gray-500 dark:text-gray-400 text-sm">
            ({recommendations.length} active)
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <motion.div
              className="w-10 h-10 border-4 border-purple-400 border-t-transparent rounded-full animate-spin"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-5 max-w-3xl">
            <AnimatePresence>
              {recommendations.map((rec) => (
                <motion.div
                  key={rec._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className={`relative rounded-2xl p-6 border transition-all duration-300 cursor-pointer ${
                    rec.type === "focus"
                      ? "bg-white dark:bg-[#121214] border-purple-200 dark:border-white/10 hover:shadow-[0_8px_30px_rgba(168,85,247,0.15)]"
                      : "bg-white dark:bg-[#1a1a1d] border-red-200 dark:border-red-500/20 hover:shadow-[0_8px_30px_rgba(239,68,68,0.15)]"
                  }`}
                  onClick={() => toggleExpand(rec._id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {rec.type === "focus" ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-400" />
                      )}
                      <h2 className="font-semibold text-lg">
                        {rec.recommendation.length > 40
                          ? rec.recommendation.slice(0, 40) + "..."
                          : rec.recommendation}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2 text-gray-400">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleComplete(rec._id);
                        }}
                        className="hover:text-green-500 transition"
                        title="Mark Complete"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(rec._id);
                        }}
                        className="hover:text-red-500 transition"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                    <div className="flex items-center gap-1">
                      <Tag className="w-4 h-4" />
                      {rec.type.charAt(0).toUpperCase() + rec.type.slice(1)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatTime(rec.timestamp)}
                    </div>
                  </div>

                  <AnimatePresence>
                    {expandedId === rec._id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.4 }}
                        className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed"
                      >
                        {rec.recommendation}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
};

export default Recommendations;
