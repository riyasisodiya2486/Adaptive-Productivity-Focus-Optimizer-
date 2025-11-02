import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCcw,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Tag,
  Trash2,
  Check,
  Lightbulb,
} from "lucide-react";

type Recommendation = {
  id: number;
  title: string;
  description: string;
  type: "positive" | "warning";
  category: string;
  time: string;
};

const Recommendations: React.FC = () => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Mock backend fetch
  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setRecommendations([
        {
          id: 1,
          title: "Take a short 5-minute walk 🌿",
          description:
            "A quick walk helps refresh your mind and reduce eye strain after long sessions.",
          type: "positive",
          category: "Health",
          time: "2 mins ago",
        },
        {
          id: 2,
          title: "Too many distractions detected ⚠️",
          description:
            "You’ve been switching apps frequently. Try enabling Focus Mode or muting notifications.",
          type: "warning",
          category: "Focus",
          time: "5 mins ago",
        },
        {
          id: 3,
          title: "Your focus consistency improved by 12% 🎯",
          description:
            "Impressive! Keep up your current pace and maintain the same working rhythm.",
          type: "positive",
          category: "Productivity",
          time: "10 mins ago",
        },
      ]);
      setLoading(false);
    }, 1200);
  }, []);

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleRemove = (id: number) => {
    setRecommendations((prev) => prev.filter((r) => r.id !== id));
  };

  const handleComplete = (id: number) => {
    setRecommendations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, completed: true } : r))
    );
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
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-600 to-purple-400 text-white font-medium hover:opacity-90 transition"
        >
          <RefreshCcw className="w-4 h-4" />
          Refresh
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-10 py-8">
        {/* Section Title */}
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
                  key={rec.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className={`relative rounded-2xl p-6 border transition-all duration-300 cursor-pointer ${
                    rec.type === "positive"
                      ? "bg-white dark:bg-[#121214] border-purple-200 dark:border-white/10 hover:shadow-[0_8px_30px_rgba(168,85,247,0.15)]"
                      : "bg-white dark:bg-[#1a1a1d] border-red-200 dark:border-red-500/20 hover:shadow-[0_8px_30px_rgba(239,68,68,0.15)]"
                  }`}
                  onClick={() => toggleExpand(rec.id)}
                >
                  {/* Top Row */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {rec.type === "positive" ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-400" />
                      )}
                      <h2 className="font-semibold text-lg">{rec.title}</h2>
                    </div>

                    <div className="flex items-center gap-2 text-gray-400">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleComplete(rec.id);
                        }}
                        className="hover:text-green-500 transition"
                        title="Mark Complete"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(rec.id);
                        }}
                        className="hover:text-red-500 transition"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Sub Info Row */}
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                    <div className="flex items-center gap-1">
                      <Tag className="w-4 h-4" />
                      {rec.category}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {rec.time}
                    </div>
                  </div>

                  {/* Expandable Description */}
                  <AnimatePresence>
                    {expandedId === rec.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.4 }}
                        className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed"
                      >
                        {rec.description}
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
