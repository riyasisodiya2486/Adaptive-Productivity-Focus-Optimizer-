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

  const getJwtToken = () => localStorage.getItem("token") || "";

  // Parse markdown-style text to React elements
  const parseRecommendationText = (text: string) => {
    // Remove leading/trailing asterisks and emojis for cleaner display
    let cleaned = text.trim();
    
    // Remove wrapper asterisks like **text** or **"text"**
    cleaned = cleaned.replace(/^\*\*"?(.*?)"?\*\*$/g, '$1');
    cleaned = cleaned.replace(/^\*\*(.*?)\*\*$/g, '$1');
    
    // Split by lines for better formatting
    const lines = cleaned.split('\n').filter(line => line.trim());
    
    return lines.map((line, idx) => {
      // Remove leading emojis and asterisks
      let processedLine = line.trim().replace(/^[✨🎯💡⚡🔥]+\s*/g, '');
      processedLine = processedLine.replace(/^\*\*"?(.*?)"?\*\*$/g, '$1');
      processedLine = processedLine.replace(/^\*\*(.*?)\*\*$/g, '$1');
      
      // Handle bold text mid-sentence
      const parts = processedLine.split(/(\*\*.*?\*\*)/g);
      
      return (
        <p key={idx} className={idx > 0 ? "mt-2" : ""}>
          {parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              // Bold text
              return <strong key={i} className="font-semibold text-purple-600 dark:text-purple-400">{part.slice(2, -2)}</strong>;
            }
            return <span key={i}>{part}</span>;
          })}
        </p>
      );
    });
  };

  // Get short preview text (without markdown)
  const getPreviewText = (text: string, maxLength: number = 60) => {
    let cleaned = text.trim()
      .replace(/\*\*/g, '') // Remove bold markers
      .replace(/[✨🎯💡⚡🔥]/g, '') // Remove emojis
      .replace(/^["']|["']$/g, ''); // Remove quotes
    
    if (cleaned.length > maxLength) {
      return cleaned.slice(0, maxLength) + '...';
    }
    return cleaned;
  };

  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const jwt = getJwtToken();
      const res = await axios.get(`${API_BASE}/history`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      console.log('📊 Recommendations received:', res.data.history);
      if (res.data?.history) {
        setRecommendations(res.data.history);
      } else {
        setRecommendations([]);
      }
    } catch (err: any) {
      console.error("❌ Failed to fetch recommendations:", err);
      setRecommendations([]);
      setError("Failed to load recommendations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecommendations();
    const intervalId = setInterval(fetchRecommendations, 60000);
    return () => clearInterval(intervalId);
  }, [fetchRecommendations]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleRemove = (id: string) => {
    setRecommendations((prev) => prev.filter((r) => r._id !== id));
  };

  const handleComplete = (id: string) => {
    setRecommendations((prev) =>
      prev.map((r) => (r._id === id ? { ...r, completed: true } : r))
    );
  };

  const formatTime = (ts: string) => {
    try {
      const date = new Date(ts);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
      return date.toLocaleDateString();
    } catch {
      return "";
    }
  };

  // Get priority badge styling
  const getPriorityBadge = (priority: string) => {
    switch(priority) {
      case 'high':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">High Priority</span>;
      case 'medium':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400">Medium</span>;
      case 'low':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">Low</span>;
      default:
        return null;
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
            <p className="text-red-500 text-sm mt-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </p>
          )}
        </div>
        <button
          onClick={fetchRecommendations}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-600 to-purple-400 text-white font-medium hover:opacity-90 transition disabled:opacity-50"
          title="Refresh recommendations"
          disabled={loading}
        >
          <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
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
        ) : recommendations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
            <Lightbulb className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">No recommendations yet</p>
            <p className="text-sm">Complete a focus session to get personalized suggestions</p>
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
                  className={`relative rounded-2xl p-6 border transition-all duration-300 ${
                    rec.completed ? 'opacity-60' : ''
                  } ${
                    rec.type === "focus"
                      ? "bg-white dark:bg-[#121214] border-purple-200 dark:border-white/10 hover:shadow-[0_8px_30px_rgba(168,85,247,0.15)]"
                      : "bg-white dark:bg-[#1a1a1d] border-red-200 dark:border-red-500/20 hover:shadow-[0_8px_30px_rgba(239,68,68,0.15)]"
                  }`}
                >
                  {rec.completed && (
                    <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Completed
                    </div>
                  )}
                  
                  <div 
                    className="cursor-pointer"
                    onClick={() => toggleExpand(rec._id)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3 flex-1 pr-20">
                        {rec.type === "focus" ? (
                          <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <h2 className="font-semibold text-base leading-relaxed">
                            {getPreviewText(rec.recommendation, 80)}
                          </h2>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3 flex-wrap">
                      <div className="flex items-center gap-1">
                        <Tag className="w-4 h-4" />
                        {rec.type.charAt(0).toUpperCase() + rec.type.slice(1)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatTime(rec.timestamp)}
                      </div>
                      {getPriorityBadge(rec.priority)}
                    </div>

                    <AnimatePresence>
                      {expandedId === rec._id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed pt-3 border-t border-gray-200 dark:border-white/10"
                        >
                          {parseRecommendationText(rec.recommendation)}
                          
                          {rec.context && (
                            <div className="mt-4 p-4 bg-gray-50 dark:bg-[#1a1a1d] rounded-lg space-y-2">
                              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Context</p>
                              {rec.context.focusScore !== undefined && (
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  <span className="font-medium">Focus Score:</span> {rec.context.focusScore}%
                                </p>
                              )}
                              {rec.context.sessionDuration && (
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  <span className="font-medium">Session Duration:</span> {Math.floor(rec.context.sessionDuration / 60)} minutes
                                </p>
                              )}
                              {rec.context.distractions && rec.context.distractions.length > 0 && (
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  <span className="font-medium">Distractions:</span> {rec.context.distractions.join(', ')}
                                </p>
                              )}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-white/10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleComplete(rec._id);
                      }}
                      disabled={rec.completed}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                      title="Mark Complete"
                    >
                      <Check className="w-4 h-4" />
                      {rec.completed ? 'Completed' : 'Mark Complete'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(rec._id);
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition text-sm font-medium"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove
                    </button>
                  </div>
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
