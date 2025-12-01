import React, { useEffect, useState, useCallback, createContext, useContext } from "react";
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
  Bell,
  X,
} from "lucide-react";
import axios from "axios";
import { BACKEND_URL } from "./config";

// --- Types ---
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
  isNew?: boolean;
};

type Toast = {
  id: string;
  message: string;
  type: "success" | "info" | "warning" | "error";
  recommendation?: Recommendation;
};

const API_BASE = BACKEND_URL + "/recommendations";

// --- Context ---
type NotificationContextType = {
  addToast: (message: string, type: "success" | "info" | "warning" | "error", recommendation?: Recommendation) => void;
  toasts: Toast[];
  removeToast: (id: string) => void;
  setPopupRec: (rec: Recommendation | null) => void;
  popupRec: Recommendation | null;
};

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// ✅ SAFE HOOK: Uses context if available, or throws specific error
export const useNotification = () => {
  const context = useContext(NotificationContext);
  // If we are outside a provider, we can't use global notifications easily.
  // However, to prevent crash, we can return a dummy or throw a clear error.
  // For this fix, we'll assume the component is wrapped. 
  if (!context) {
    console.warn("useNotification used outside NotificationProvider! Notifications won't appear.");
    return {
      addToast: () => {}, 
      toasts: [], 
      removeToast: () => {}, 
      setPopupRec: () => {}, 
      popupRec: null
    };
  }
  return context;
};

// --- Components ---

const ToastNotification: React.FC<{
  toast: Toast;
  onDismiss: (id: string) => void;
}> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 6000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const bgColor = {
    success: "bg-green-50 dark:bg-green-900/30",
    info: "bg-blue-50 dark:bg-blue-900/30",
    warning: "bg-yellow-50 dark:bg-yellow-900/30",
    error: "bg-red-50 dark:bg-red-900/30",
  }[toast.type];

  const borderColor = {
    success: "border-green-200 dark:border-green-800",
    info: "border-blue-200 dark:border-blue-800",
    warning: "border-yellow-200 dark:border-yellow-800",
    error: "border-red-200 dark:border-red-800",
  }[toast.type];

  const textColor = {
    success: "text-green-800 dark:text-green-200",
    info: "text-blue-800 dark:text-blue-200",
    warning: "text-yellow-800 dark:text-yellow-200",
    error: "text-red-800 dark:text-red-200",
  }[toast.type];

  const iconColor = {
    success: "text-green-600 dark:text-green-400",
    info: "text-blue-600 dark:text-blue-400",
    warning: "text-yellow-600 dark:text-yellow-400",
    error: "text-red-600 dark:text-red-400",
  }[toast.type];

  const Icon = {
    success: CheckCircle,
    info: AlertCircle,
    warning: AlertCircle,
    error: AlertCircle,
  }[toast.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, x: 400 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, y: -20, x: 400 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`${bgColor} ${borderColor} border rounded-lg shadow-lg p-4 flex items-start gap-3 mb-3 max-w-md pointer-events-auto`}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColor}`} />
      <div className="flex-1">
        <p className={`${textColor} text-sm font-medium`}>{toast.message}</p>
        {toast.recommendation && (
          <p className={`${textColor} text-xs mt-1 opacity-75`}>
            {toast.recommendation.recommendation.slice(0, 80)}...
          </p>
        )}
      </div>
      <button onClick={() => onDismiss(toast.id)} className={`${textColor} hover:opacity-70 transition`}>
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
};

const PopupAlert: React.FC<{
  recommendation: Recommendation;
  onClose: () => void;
}> = ({ recommendation, onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 pointer-events-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#121214] rounded-2xl shadow-2xl max-w-md w-full p-6 border border-purple-200 dark:border-purple-500/30"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full"
            >
              <Lightbulb className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                ✨ New Recommendation
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {recommendation.priority.toUpperCase()} PRIORITY
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm">
            {recommendation.recommendation}
          </p>
          {recommendation.context && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-[#1a1a1d] rounded-lg space-y-2">
              {recommendation.context.focusScore !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Focus Score:</span>
                  <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold">{recommendation.context.focusScore}%</span>
                </div>
              )}
              {recommendation.context.sessionDuration && (
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-gray-500" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">Session: {Math.floor(recommendation.context.sessionDuration / 60)} min</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition font-medium text-sm">
            Later
          </button>
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-500 text-white hover:opacity-90 transition font-medium text-sm">
            Got It
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ✅ Provider
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [popupRec, setPopupRec] = useState<Recommendation | null>(null);

  const addToast = useCallback((message: string, type: "success" | "info" | "warning" | "error", recommendation?: Recommendation) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type, recommendation }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ addToast, toasts, removeToast, setPopupRec, popupRec }}>
      <div className="fixed top-6 right-6 z-[9999] space-y-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <ToastNotification key={toast.id} toast={toast} onDismiss={removeToast} />
          ))}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {popupRec && <PopupAlert recommendation={popupRec} onClose={() => setPopupRec(null)} />}
      </AnimatePresence>
      {children}
    </NotificationContext.Provider>
  );
};

// --- Internal Recommendation Page Component ---
const RecommendationsContent: React.FC = () => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // This is safe now because if context is missing, useNotification returns dummy functions
  const { addToast, setPopupRec } = useNotification();

  const getJwtToken = () => localStorage.getItem("token") || "";

  const parseRecommendationText = (text: string) => {
    let cleaned = text.trim();
    cleaned = cleaned.replace(/^\*\*"?(.*?)"?\*\*$/g, '$1');
    cleaned = cleaned.replace(/^\*\*(.*?)\*\*$/g, '$1');
    const lines = cleaned.split('\n').filter(line => line.trim());
    
    return lines.map((line, idx) => {
      let processedLine = line.trim().replace(/^[✨🎯💡⚡🔥]+\s*/g, '');
      processedLine = processedLine.replace(/^\*\*"?(.*?)"?\*\*$/g, '$1');
      processedLine = processedLine.replace(/^\*\*(.*?)\*\*$/g, '$1');
      const parts = processedLine.split(/(\*\*.*?\*\*)/g);
      
      return (
        <p key={`text-${idx}`} className={idx > 0 ? "mt-2" : ""}>
          {parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={`bold-${i}`} className="font-semibold text-purple-600 dark:text-purple-400">{part.slice(2, -2)}</strong>;
            }
            return <span key={`span-${i}`}>{part}</span>;
          })}
        </p>
      );
    });
  };

  const getPreviewText = (text: string, maxLength: number = 60) => {
    let cleaned = text.trim().replace(/\*\*/g, '').replace(/[✨🎯💡⚡🔥]/g, '').replace(/^["']|["']$/g, '');
    if (cleaned.length > maxLength) return cleaned.slice(0, maxLength) + '...';
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
      
      if (res.data?.history) {
        const newRecs = res.data.history;
        setRecommendations(prev => {
          const prevIds = new Set(prev.map(r => r._id));
          newRecs.forEach((rec: Recommendation) => {
            if (!prevIds.has(rec._id)) {
              // Use safe addToast
              addToast(`🎯 New ${rec.type} recommendation!`, rec.priority === 'high' ? 'warning' : 'info', rec);
              if (rec.priority === 'high') setPopupRec(rec);
            }
          });
          return newRecs;
        });
      } else {
        setRecommendations([]);
      }
    } catch (err: any) {
      setRecommendations([]);
      setError("Failed to load recommendations.");
      addToast("Failed to load recommendations", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast, setPopupRec]);

  useEffect(() => {
    fetchRecommendations();
    const intervalId = setInterval(fetchRecommendations, 30000);
    return () => clearInterval(intervalId);
  }, [fetchRecommendations]);

  const toggleExpand = (id: string) => setExpandedId(expandedId === id ? null : id);

  const handleRemove = (id: string) => {
    setRecommendations((prev) => prev.filter((r) => r._id !== id));
    addToast("Recommendation removed", "success");
  };

  const handleComplete = (id: string) => {
    setRecommendations((prev) => prev.map((r) => (r._id === id ? { ...r, completed: true } : r)));
    addToast("✅ Great job! Recommendation marked complete", "success");
  };

  const formatTime = (ts: string) => {
    try {
      const date = new Date(ts);
      const now = new Date();
      const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
      return date.toLocaleDateString();
    } catch {
      return "";
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch(priority) {
      case 'high': return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">High Priority</span>;
      case 'medium': return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400">Medium</span>;
      case 'low': return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">Low</span>;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col min-h-screen transition-colors duration-300 bg-gray-50 dark:bg-[#0B0B0F] text-gray-900 dark:text-gray-100">
      <header className="px-10 py-6 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-300 bg-clip-text text-transparent">AI Recommendations</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Personalized suggestions to improve your focus and productivity.</p>
          {error && <p className="text-red-500 text-sm mt-2 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</p>}
        </div>
        <button onClick={fetchRecommendations} className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-600 to-purple-400 text-white font-medium hover:opacity-90 transition disabled:opacity-50" title="Refresh recommendations" disabled={loading}>
          <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </header>

      <main className="flex-1 px-10 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Lightbulb className="w-6 h-6 text-purple-500" />
          <h2 className="text-2xl font-semibold">Active Suggestions</h2>
          <span className="text-gray-500 dark:text-gray-400 text-sm">({recommendations.length} active)</span>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <motion.div className="w-10 h-10 border-4 border-purple-400 border-t-transparent rounded-full animate-spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} />
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
                  className={`relative rounded-2xl p-6 border transition-all duration-300 ${rec.completed ? 'opacity-60' : ''} ${rec.type === "focus" ? "bg-white dark:bg-[#121214] border-purple-200 dark:border-white/10 hover:shadow-[0_8px_30px_rgba(168,85,247,0.15)]" : "bg-white dark:bg-[#1a1a1d] border-red-200 dark:border-red-500/20 hover:shadow-[0_8px_30px_rgba(239,68,68,0.15)]"}`}
                >
                  {rec.completed && <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1"><Check className="w-3 h-3" /> Completed</div>}
                  
                  <div className="cursor-pointer" onClick={() => toggleExpand(rec._id)}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3 flex-1 pr-20">
                        {rec.type === "focus" ? <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />}
                        <div className="flex-1">
                          <h2 className="font-semibold text-base leading-relaxed">{getPreviewText(rec.recommendation, 80)}</h2>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3 flex-wrap">
                      <div className="flex items-center gap-1"><Tag className="w-4 h-4" /> {rec.type.charAt(0).toUpperCase() + rec.type.slice(1)}</div>
                      <div className="flex items-center gap-1"><Clock className="w-4 h-4" /> {formatTime(rec.timestamp)}</div>
                      {getPriorityBadge(rec.priority)}
                    </div>

                    <AnimatePresence>
                      {expandedId === rec._id && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }} className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed pt-3 border-t border-gray-200 dark:border-white/10">
                          {parseRecommendationText(rec.recommendation)}
                          {rec.context && (
                            <div className="mt-4 p-4 bg-gray-50 dark:bg-[#1a1a1d] rounded-lg space-y-2">
                              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Context</p>
                              {rec.context.focusScore !== undefined && <p className="text-xs text-gray-600 dark:text-gray-400"><span className="font-medium">Focus Score:</span> {rec.context.focusScore}%</p>}
                              {rec.context.sessionDuration && <p className="text-xs text-gray-600 dark:text-gray-400"><span className="font-medium">Session Duration:</span> {Math.floor(rec.context.sessionDuration / 60)} minutes</p>}
                              {rec.context.distractions && rec.context.distractions.length > 0 && <p className="text-xs text-gray-600 dark:text-gray-400"><span className="font-medium">Distractions:</span> {rec.context.distractions.join(', ')}</p>}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-white/10">
                    <button onClick={(e) => { e.stopPropagation(); handleComplete(rec._id); }} disabled={rec.completed} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium" title="Mark Complete">
                      <Check className="w-4 h-4" /> {rec.completed ? 'Completed' : 'Mark Complete'}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleRemove(rec._id); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition text-sm font-medium" title="Remove">
                      <Trash2 className="w-4 h-4" /> Remove
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

const Recommendations: React.FC = () => {

  return (
    <NotificationProvider>
      <RecommendationsContent />
    </NotificationProvider>
  );
};

export default Recommendations;
